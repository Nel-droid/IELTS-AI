import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })
const MODEL = 'gemini-2.0-flash'

// ── Writing evaluation ────────────────────────────────────────────────────

const WRITING_SYSTEM = `You are a certified IELTS examiner. Evaluate the given IELTS writing response strictly following the official IELTS band descriptors. Return a JSON object with this exact shape:
{
  "overall": number,          // overall band score (0.5 increments, 1–9)
  "criteria": {
    "taskAchievement": { "score": number, "feedback": string },
    "coherenceCohesion": { "score": number, "feedback": string },
    "lexicalResource": { "score": number, "feedback": string },
    "grammaticalRange": { "score": number, "feedback": string }
  },
  "strengths": [string],      // 2–3 key strengths
  "improvements": [string]    // 2–3 actionable improvements
}
Return ONLY valid JSON — no markdown fences, no extra text.`

export async function evaluateWriting({ taskType, prompt, essay }) {
  const userText = `TASK TYPE: ${taskType}
${prompt ? `QUESTION/PROMPT:\n${prompt}\n` : ''}
ESSAY:\n${essay}`

  const response = await ai.models.generateContent({
    model: MODEL,
    config: { systemInstruction: WRITING_SYSTEM },
    contents: userText,
  })

  return JSON.parse(response.text)
}

// ── Speaking evaluation ───────────────────────────────────────────────────

const SPEAKING_SYSTEM = `You are a certified IELTS speaking examiner. Evaluate the transcript of an IELTS speaking test response. Return a JSON object with this exact shape:
{
  "overall": number,
  "criteria": {
    "fluencyCoherence": { "score": number, "feedback": string },
    "lexicalResource": { "score": number, "feedback": string },
    "grammaticalRange": { "score": number, "feedback": string },
    "pronunciation": { "score": number, "feedback": string }
  },
  "strengths": [string],
  "improvements": [string]
}
Return ONLY valid JSON — no markdown fences.`

export async function evaluateSpeaking({ part, questions, transcript }) {
  const userText = `SPEAKING PART: ${part}
QUESTIONS ASKED:\n${questions.join('\n')}
CANDIDATE RESPONSE:\n${transcript}`

  const response = await ai.models.generateContent({
    model: MODEL,
    config: { systemInstruction: SPEAKING_SYSTEM },
    contents: userText,
  })

  return JSON.parse(response.text)
}

// ── Chat session ──────────────────────────────────────────────────────────

const CHAT_SYSTEM = `You are an expert IELTS preparation tutor. Help students improve their writing, speaking, reading, and listening skills. Give specific, actionable advice. When asked to evaluate text, provide band-score feedback. Be encouraging but honest.`

export function createChat() {
  return ai.chats.create({
    model: MODEL,
    config: { systemInstruction: CHAT_SYSTEM },
    history: [],
  })
}

export async function sendChatMessage(chat, message) {
  const response = await chat.sendMessage({ message })
  return response.text
}

// ── Streaming chat ────────────────────────────────────────────────────────

export async function* streamChatMessage(chat, message) {
  const stream = chat.sendMessageStream({ message })
  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text
  }
}
