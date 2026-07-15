// Server-side proxy for Groq Whisper speech-to-text. Same auth + rate-limit
// contract as groq-chat.ts — see that file for the shared reasoning.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TRANSCRIBE_MODEL = 'whisper-large-v3-turbo'
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 40
const MAX_BASE64_CHARS = 28_000_000 // ~20MB of raw audio, base64-inflated

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}

export default async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const groqApiKey = Deno.env.get('GROQ_API_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !groqApiKey) {
    console.error('groq-transcribe: missing required environment variables')
    return json({ error: 'Server misconfiguration' }, 500)
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Missing Authorization header' }, 401)

  const authClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data: userData, error: userError } = await authClient.auth.getUser(token)
  if (userError || !userData?.user) return json({ error: 'Invalid or expired session' }, 401)
  const userId = userData.user.id

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString()
  const { data: usageCount, error: usageError } = await admin.rpc('increment_api_usage', {
    p_user_id: userId,
    p_window_start: windowStart,
  })
  if (usageError) {
    console.error('groq-transcribe: rate limit check failed', usageError)
  } else if (typeof usageCount === 'number' && usageCount > RATE_LIMIT_MAX_REQUESTS) {
    return json({ error: 'Rate limit exceeded. Please wait a few minutes before trying again.' }, 429)
  }

  let body: { base64?: string; mimeType?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { base64, mimeType } = body
  if (!base64 || typeof base64 !== 'string') return json({ error: 'Missing audio' }, 400)
  if (base64.length > MAX_BASE64_CHARS) return json({ error: 'Audio too large' }, 413)

  let bytes: Uint8Array
  try {
    const binary = atob(base64)
    bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  } catch {
    return json({ error: 'Invalid audio encoding' }, 400)
  }

  const safeMime = typeof mimeType === 'string' && mimeType ? mimeType : 'audio/webm'
  const ext = safeMime.includes('mp4') ? 'mp4' : safeMime.includes('ogg') ? 'ogg' : 'webm'

  const form = new FormData()
  form.append('file', new Blob([bytes.slice()], { type: safeMime }), `answer.${ext}`)
  form.append('model', TRANSCRIBE_MODEL)
  form.append('response_format', 'text')

  let groqRes: Response
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqApiKey}` },
      body: form,
    })
  } catch (err) {
    console.error('groq-transcribe: upstream fetch failed', err)
    return json({ error: 'Upstream request failed' }, 502)
  }

  if (!groqRes.ok) {
    const errText = await groqRes.text()
    return json({ error: errText || 'Transcription failed' }, groqRes.status)
  }

  const text = await groqRes.text()
  return json({ text })
}
