import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true })

const TEXT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct' // supports text + image input
const FAST_TEXT_MODEL = 'llama-3.1-8b-instant' // smaller/faster, chat only — writing/speaking scoring always uses TEXT_MODEL
const TRANSCRIBE_MODEL = 'whisper-large-v3-turbo'

const WHOLE_SCORE_RULE = `Every criterion score MUST be a whole integer band from 1 to 9 (e.g. 6, 7, 8) — never a half band like 6.5 or 7.5. Do not include an "overall" field; it is computed separately.`
const CHAT_LANGUAGE_NAMES = { en: 'English', uz: 'Uzbek', ru: 'Russian' }

const HUMAN_TONE_RULE = `Write like a real person talking to the student, not like an AI generating a report — this applies no matter what language you're replying in. Use natural, conversational phrasing: contractions when replying in English (you're, it's, don't, that's), or the equivalent relaxed, everyday register when replying in another language — not stiff, translated-sounding formality. Vary your sentence openers and rhythm — don't start every paragraph, message, or criterion with the same template ("Your essay is...", "You demonstrate...", "The candidate..."). Cut AI-speak and filler: no "Overall,", "It's important to note that", "In conclusion,", "I hope this helps!", "Let's dive in", "Great question!", "Certainly!". Be direct and specific instead of padding with hedges and throat-clearing. A little warmth and personality is good, but don't overdo enthusiasm or exclamation points — sound like a thoughtful teacher who actually read the work and is talking to this one student, not a hype bot or a template generator.`

const TERMINOLOGY_RULE = `Keep official IELTS terminology in English even when the rest of your reply is in another language — skill names (Writing, Speaking, Reading, Listening), task labels (Task 1, Task 2, Academic, General Training), part labels (Part 1, Part 2, Part 3), band-score terms (Overall Band, Band 7, whole-number band), and criteria names (Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy, Fluency & Coherence, Pronunciation). These are fixed exam terms students need to recognize from the real test — translating them changes or loses their meaning, so weave them into the sentence in English exactly as written, not a local-language equivalent.`

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

// Safety net: however careful the prompt is, force every criterion score to a
// whole 1-9 band in case the model still slips in a half band like 6.5.
function wholeBandScores(result) {
  if (!result?.criteria) return result
  for (const criterion of Object.values(result.criteria)) {
    if (typeof criterion?.score === 'number') {
      criterion.score = Math.min(9, Math.max(1, Math.round(criterion.score)))
    }
  }
  return result
}

// ── Writing evaluation (freeform: accumulated chat text/images) ───────────

function buildContentParts({ textPieces = [], images = [] }) {
  const parts = textPieces.filter(Boolean).map(text => ({ type: 'text', text }))
  for (const img of images) {
    parts.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } })
  }
  return parts
}

function writingFreeformSystem(languageName) {
  return `You are a warm, expert IELTS Writing teacher — not just an examiner — working inside a chat conversation. A student has sent you materials for a Writing check across one or more messages: typed text and/or images, which may be the task prompt, their essay response, or both together (e.g. a photo of a graph and a photo of handwritten or typed essay text). Carefully read everything provided to determine the task type (Task 1 or Task 2, Academic or General Training) and identify the actual essay response.

If what has been shared so far is NOT enough to fairly evaluate — e.g. only the task prompt with no essay response yet, or the essay looks clearly incomplete — respond with exactly:
{ "insufficient": true, "insufficientReason": "<a short, friendly message in ${languageName} explaining what's still needed>" }

If there IS a real essay response to evaluate, respond with exactly:
{
  "insufficient": false,
  "criteria": {
    "taskAchievement": { "score": integer, "feedback": string, "examples": [{ "quote": string, "issue": string }] },
    "coherenceCohesion": { "score": integer, "feedback": string, "examples": [{ "quote": string, "issue": string }] },
    "lexicalResource": { "score": integer, "feedback": string, "examples": [{ "quote": string, "issue": string }] },
    "grammaticalRange": { "score": integer, "feedback": string, "examples": [{ "quote": string, "issue": string }] }
  },
  "strengths": [string],
  "improvements": [string]
}

Feedback style — write like an encouraging, clear teacher explaining things to a student, not a checklist:
- "feedback" per criterion: 2-4 plain-language sentences on the overall level for that criterion, what's working, and what's holding the score back. Avoid dense examiner jargon; briefly explain any technical term you do use.
- "examples" per criterion: 2-4 short, verbatim quotes pulled directly from the student's own essay, each paired with a concrete, easy-to-understand note on what's good or wrong about it — and for mistakes, how to fix it (e.g. quote: "many trees were chopped down", issue: "Clear sentence, but 'chopped down' is a bit informal for this register — 'a significant number of trees were removed' reads more naturally in formal writing."). Never invent a quote that isn't actually in the essay.
- "strengths": specific genuine things the essay does well, referencing what the student actually wrote — not generic praise.
- "improvements": specific, actionable fixes tied to real mistakes in this essay — not vague advice like "improve your grammar".

${HUMAN_TONE_RULE}

${TERMINOLOGY_RULE}

${WHOLE_SCORE_RULE} Evaluate strictly against the official IELTS Writing band descriptors. Return ONLY valid JSON — no markdown fences, no extra text.`
}

export async function evaluateWritingFreeform({ images = [], texts = [], language = 'en' }) {
  const languageName = CHAT_LANGUAGE_NAMES[language] || 'English'
  const content = buildContentParts({ textPieces: texts, images })
  const result = await jsonChat({ systemInstruction: writingFreeformSystem(languageName), content })
  return wholeBandScores(result)
}

// ── Speaking evaluation (audio -> transcript -> scored) ───────────────────

export async function transcribeAudio(base64, mimeType) {
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

// ── Dynamic Speaking test generation (fresh topics every attempt) ─────────

const SPEAKING_FIRST_TOPICS = ['Work or Study', 'Hometown', 'Home decoration', 'Friends']

function speakingTestSystem(firstTopic) {
  return `You are an IELTS Speaking test writer. Generate a fresh, realistic IELTS Speaking test. Vary the topics naturally each time you're asked — never default to the same handful of clichéd topics.

HARD REQUIREMENT, not a suggestion: the first object in "part1" MUST have "topic" equal to EXACTLY the string "${firstTopic}" (verbatim, no rewording, no synonyms), and its 4-5 questions must genuinely be about "${firstTopic}". Do not substitute a different topic for this slot under any circumstances.

Structure:
- Part 1: exactly 3 topics. Topic #1 is fixed to "${firstTopic}" as required above. Topics #2 and #3 must be different common IELTS Part 1 topics picked at random (e.g. food, weather, technology, sport, music, free time, shopping, transport, neighbours, festivals, reading, pets, weekends) — each with 4-5 questions.
- Part 2: one cue card, on an everyday personal-experience topic (can differ from the Part 1 topics). Write it as ONE multi-line string: a "Describe a/an ..." line, then "You should say:" followed by 3-4 bullet points each starting with "•" on its own line, then a closing line starting with "And explain...".
- Part 3: exactly 4 discussion questions that dig deeper into the broader theme behind the Part 2 cue card — more abstract, opinion-based, comparing past/present or individual/society.

Return ONLY valid JSON in this exact shape, no markdown fences, no extra commentary:
{
  "part1": [
    { "topic": "${firstTopic}", "questions": [string, string, string, string] },
    { "topic": string, "questions": [string, string, string, string] },
    { "topic": string, "questions": [string, string, string, string] }
  ],
  "part2": { "topic": string, "cueCard": string },
  "part3": [string, string, string, string]
}`
}

export async function generateSpeakingTest() {
  const firstTopic = SPEAKING_FIRST_TOPICS[Math.floor(Math.random() * SPEAKING_FIRST_TOPICS.length)]
  const completion = await groq.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: speakingTestSystem(firstTopic) },
      { role: 'user', content: `Generate a new, varied test now — remember topic #1 must be exactly "${firstTopic}". Random seed: ${Date.now()}-${Math.random().toString(36).slice(2)}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.9,
  })
  const data = JSON.parse(completion.choices[0].message.content)
  if (data.part1?.[0]) data.part1[0].topic = firstTopic
  return data
}

const SILENT_SPEAKING_MESSAGE = {
  en: "I couldn't hear any real speech in your answers — every question came back silent or inaudible, so I can't give you a fair score. Please check your microphone and make sure you're actually speaking your answers, then try again.",
  uz: "Javoblaringizda hech qanday nutq eshitilmadi — barcha savollar jimlik yoki tushunarsiz ovoz bilan qaytdi, shuning uchun adolatli baho bera olmayman. Mikrofoningizni tekshiring va javoblaringizni ovoz chiqarib aytayotganingizga ishonch hosil qilib, qayta urinib ko'ring.",
  ru: "В ваших ответах не было услышано настоящей речи — все вопросы вернулись с тишиной или неразборчивым звуком, поэтому я не могу выставить честную оценку. Проверьте микрофон и убедитесь, что вы действительно проговариваете ответы вслух, затем попробуйте снова.",
}

function hasSpeechContent(transcript) {
  return !!transcript && transcript.trim().split(/\s+/).filter(Boolean).length >= 2
}

const SPEAKING_SYSTEM = `You are a certified IELTS speaking examiner. You will receive a sequence of IELTS Speaking questions, each followed by a transcript of the candidate's actual spoken answer (or a note that no response was given). Evaluate strictly against the official IELTS Speaking band descriptors, considering all parts together as one overall performance. Judge fluency and coherence from sentence structure, hesitation markers, and length of the transcript; judge pronunciation as best as can be inferred from spelling/phonetic artefacts in the transcript, noting where audio-only cues are limited. ${WHOLE_SCORE_RULE}

If a question is marked "[NO RESPONSE — the candidate was silent or inaudible for this question]", you MUST NOT invent content for it — explicitly say in your feedback that no answer was given for that question, and let its absence meaningfully lower the relevant scores. Never award a comfortable mid-range band when most or all answers are missing.

For EVERY criterion, ground your feedback in specific evidence from what the candidate actually said: include an "examples" array with 1-3 short verbatim quotes (or close paraphrases) pulled from their real transcript, each paired with a concrete note about what was good or wrong about it (a grammar slip, an imprecise word choice, a run-on sentence, a hesitation, a mispronunciation artefact visible in the transcript, etc). Never give vague feedback that isn't tied to something identifiable in the transcript — if a candidate gave no response at all for every question, leave "examples" empty for that criterion instead of inventing quotes.

${HUMAN_TONE_RULE}

Return a JSON object with this exact shape:
{
  "criteria": {
    "fluencyCoherence": { "score": integer, "feedback": string, "examples": [{ "quote": string, "issue": string }] },
    "lexicalResource": { "score": integer, "feedback": string, "examples": [{ "quote": string, "issue": string }] },
    "grammaticalRange": { "score": integer, "feedback": string, "examples": [{ "quote": string, "issue": string }] },
    "pronunciation": { "score": integer, "feedback": string, "examples": [{ "quote": string, "issue": string }] }
  },
  "strengths": [string],
  "improvements": [string]
}`

export async function evaluateSpeakingAudio({ answers, language = 'en' }) {
  const transcripts = await Promise.all(
    answers.map(async a => ({ ...a, transcript: (await transcribeAudio(a.audioBase64, a.mimeType)).trim() }))
  )

  if (!transcripts.some(a => hasSpeechContent(a.transcript))) {
    return { insufficient: true, insufficientReason: SILENT_SPEAKING_MESSAGE[language] || SILENT_SPEAKING_MESSAGE.en }
  }

  const textPieces = transcripts.map(a =>
    `--- ${a.partLabel} ---\nQuestion: ${a.question}\nCandidate's transcribed answer: ${hasSpeechContent(a.transcript) ? a.transcript : '[NO RESPONSE — the candidate was silent or inaudible for this question]'}`
  )

  const result = await jsonChat({
    systemInstruction: SPEAKING_SYSTEM,
    content: [{ type: 'text', text: textPieces.join('\n\n') }],
  })
  return wholeBandScores(result)
}

// ── Chat session ──────────────────────────────────────────────────────────

const CHAT_SYSTEM = `You are an expert IELTS preparation tutor. Help students improve their writing, speaking, reading, and listening skills. Give specific, actionable advice. Be encouraging but honest. Writing checks happen automatically: whenever a student shares an IELTS Writing task and/or essay (as text or a photo), a dedicated scoring flow detects and evaluates it before it ever reaches you here — you generally won't see a full essay as a normal turn. Use "Practice Speaking" in the sidebar for a full mock Speaking exam.

If a short snippet of essay-like writing does slip through to you directly, never invent your own IELTS band scores or feedback format for it — just encourage the student to paste their full task and essay (or a photo of it) so it gets picked up and scored properly.

Whenever you DO state any IELTS band number for a specific criterion (Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy, Fluency & Coherence, Pronunciation, etc.) in normal conversation, it MUST be a whole integer band from 1 to 9 — never a half band like 6.5 or 7.5. Only a final overall/average band across multiple criteria may legitimately land on a .5 value.

${HUMAN_TONE_RULE}`

const STYLE_INSTRUCTIONS = {
  encouraging: 'Be warm, encouraging, and supportive while still being honest about mistakes.',
  formal: 'Be precise, professional, and formal in tone — like a strict but fair examiner.',
  concise: 'Be brief and to the point. Prefer short answers and tight bullet points over long explanations.',
}

export function createChat({ language = 'en', style = 'encouraging' } = {}) {
  const languageName = CHAT_LANGUAGE_NAMES[language] || 'English'
  let systemInstruction = CHAT_SYSTEM
  if (STYLE_INSTRUCTIONS[style]) systemInstruction += ` ${STYLE_INSTRUCTIONS[style]}`
  if (language !== 'en') {
    systemInstruction += ` Respond in ${languageName} by default, unless the student writes to you in a different language — then reply in that language instead. ${TERMINOLOGY_RULE}`
  }

  return { history: [{ role: 'system', content: systemInstruction }] }
}

function buildChatUserContent(message, images) {
  if (!images || images.length === 0) return message
  const parts = [{ type: 'text', text: message || ' ' }]
  for (const img of images) {
    parts.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } })
  }
  return parts
}

export async function sendChatMessage(chat, message, speed = 'balanced', images = []) {
  const model = images.length > 0 ? TEXT_MODEL : (speed === 'fastest' ? FAST_TEXT_MODEL : TEXT_MODEL)
  chat.history.push({ role: 'user', content: buildChatUserContent(message, images) })
  const completion = await groq.chat.completions.create({ model, messages: chat.history })
  const reply = completion.choices[0].message.content
  chat.history.push({ role: 'assistant', content: reply })
  return reply
}

// ── Streaming chat ────────────────────────────────────────────────────────

export async function* streamChatMessage(chat, message, speed = 'balanced', images = []) {
  const model = images.length > 0 ? TEXT_MODEL : (speed === 'fastest' ? FAST_TEXT_MODEL : TEXT_MODEL)
  chat.history.push({ role: 'user', content: buildChatUserContent(message, images) })
  const stream = await groq.chat.completions.create({ model, messages: chat.history, stream: true })

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
