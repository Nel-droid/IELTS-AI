import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true })

const TEXT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct' // supports text + image input
const TRANSCRIBE_MODEL = 'whisper-large-v3-turbo'

const WHOLE_SCORE_RULE = `Every criterion score MUST be a whole integer band from 1 to 9 (e.g. 6, 7, 8) — never a half band like 6.5 or 7.5. Do not include an "overall" field; it is computed separately.`

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

async function jsonChat({ systemInstruction, content }) {
  const completion = await groq.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content },
    ],
    response_format: { type: 'json_object' },
  })
  return JSON.parse(completion.choices[0].message.content)
}

// ── Writing evaluation (text and/or images) ───────────────────────────────

const WRITING_SYSTEM = `You are a certified IELTS examiner. Evaluate the given IELTS Writing response strictly following the official IELTS Writing band descriptors for Task 1 and Task 2. The task prompt and/or the essay may be provided as images (photos of a printed/handwritten topic or essay) — read them carefully first. ${WHOLE_SCORE_RULE}

Return a JSON object with this exact shape:
{
  "criteria": {
    "taskAchievement": { "score": integer, "feedback": string },
    "coherenceCohesion": { "score": integer, "feedback": string },
    "lexicalResource": { "score": integer, "feedback": string },
    "grammaticalRange": { "score": integer, "feedback": string }
  },
  "strengths": [string],
  "improvements": [string]
}`

function buildContentParts({ textPieces = [], images = [] }) {
  const parts = textPieces.filter(Boolean).map(text => ({ type: 'text', text }))
  for (const img of images) {
    parts.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } })
  }
  return parts
}

export async function evaluateWritingMultimodal({ taskType, promptText, promptImages = [], essayText, essayImages = [] }) {
  const textPieces = [
    `TASK TYPE: ${taskType}`,
    promptText ? `QUESTION/PROMPT (typed):\n${promptText}` : (promptImages.length ? 'QUESTION/PROMPT: see attached image(s).' : ''),
    essayText ? `ESSAY (typed):\n${essayText}` : (essayImages.length ? 'ESSAY: see attached image(s).' : ''),
  ]
  const content = buildContentParts({ textPieces, images: [...promptImages, ...essayImages] })
  return jsonChat({ systemInstruction: WRITING_SYSTEM, content })
}

// ── Speaking evaluation (audio -> transcript -> scored) ───────────────────

async function transcribeAudio(base64, mimeType) {
  const blob = base64ToBlob(base64, mimeType)
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
  const file = new File([blob], `answer.${ext}`, { type: mimeType })
  const result = await groq.audio.transcriptions.create({
    file,
    model: TRANSCRIBE_MODEL,
    response_format: 'text',
  })
  return typeof result === 'string' ? result : result.text
}

const SPEAKING_SYSTEM = `You are a certified IELTS speaking examiner. You will receive a sequence of IELTS Speaking questions, each followed by a transcript of the candidate's actual spoken answer. Evaluate strictly against the official IELTS Speaking band descriptors, considering all parts together as one overall performance. Judge fluency and coherence from sentence structure, hesitation markers, and length of the transcript; judge pronunciation as best as can be inferred from spelling/phonetic artefacts in the transcript, noting where audio-only cues are limited. ${WHOLE_SCORE_RULE}

Return a JSON object with this exact shape:
{
  "criteria": {
    "fluencyCoherence": { "score": integer, "feedback": string },
    "lexicalResource": { "score": integer, "feedback": string },
    "grammaticalRange": { "score": integer, "feedback": string },
    "pronunciation": { "score": integer, "feedback": string }
  },
  "strengths": [string],
  "improvements": [string]
}`

export async function evaluateSpeakingAudio({ answers }) {
  const transcripts = await Promise.all(
    answers.map(async a => ({ ...a, transcript: await transcribeAudio(a.audioBase64, a.mimeType) }))
  )

  const textPieces = transcripts.map(a =>
    `--- ${a.partLabel} ---\nQuestion: ${a.question}\nCandidate's transcribed answer: ${a.transcript || '(no speech detected)'}`
  )

  return jsonChat({
    systemInstruction: SPEAKING_SYSTEM,
    content: [{ type: 'text', text: textPieces.join('\n\n') }],
  })
}

// ── Chat session ──────────────────────────────────────────────────────────

const CHAT_SYSTEM = `You are an expert IELTS preparation tutor. Help students improve their writing, speaking, reading, and listening skills. Give specific, actionable advice. Be encouraging but honest. The student can also use dedicated "Check my Writing" and "Practice Speaking" tools elsewhere in this app for formal band-scored evaluation — if they paste an essay or ask for speaking practice in plain chat, you can still help conversationally, but mention those tools exist for an official scored evaluation.`

const CHAT_LANGUAGE_NAMES = { en: 'English', uz: 'Uzbek', ru: 'Russian' }

export function createChat(language = 'en') {
  const languageName = CHAT_LANGUAGE_NAMES[language] || 'English'
  const systemInstruction = language === 'en'
    ? CHAT_SYSTEM
    : `${CHAT_SYSTEM} Respond in ${languageName} by default, unless the student writes to you in a different language — then reply in that language instead. Keep IELTS-specific terms (band scores, task names, criteria names) in English even when the rest of your reply is in ${languageName}.`

  return { history: [{ role: 'system', content: systemInstruction }] }
}

export async function sendChatMessage(chat, message) {
  chat.history.push({ role: 'user', content: message })
  const completion = await groq.chat.completions.create({ model: TEXT_MODEL, messages: chat.history })
  const reply = completion.choices[0].message.content
  chat.history.push({ role: 'assistant', content: reply })
  return reply
}

// ── Streaming chat ────────────────────────────────────────────────────────

export async function* streamChatMessage(chat, message) {
  chat.history.push({ role: 'user', content: message })
  const stream = await groq.chat.completions.create({ model: TEXT_MODEL, messages: chat.history, stream: true })

  let full = ''
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      full += delta
      yield delta
    }
  }
  chat.history.push({ role: 'assistant', content: full })
}
