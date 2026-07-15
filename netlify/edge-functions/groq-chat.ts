// Server-side proxy for Groq chat completions (streaming + non-streaming).
// The real Groq API key never reaches the browser — it's read here from a
// server-only environment variable (GROQ_API_KEY, no VITE_ prefix). Callers
// must be an authenticated Supabase user; requests are rate-limited per user.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_MODELS = new Set([
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.1-8b-instant',
])

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 40
const MAX_BODY_BYTES = 750_000 // guards against oversized prompts burning quota

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
    console.error('groq-chat: missing required environment variables')
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
    console.error('groq-chat: rate limit check failed', usageError)
  } else if (typeof usageCount === 'number' && usageCount > RATE_LIMIT_MAX_REQUESTS) {
    return json({ error: 'Rate limit exceeded. Please wait a few minutes before trying again.' }, 429)
  }

  const bodyText = await request.text()
  if (bodyText.length > MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413)

  let body: { model?: string; messages?: unknown; response_format?: unknown; temperature?: number; stream?: boolean }
  try {
    body = JSON.parse(bodyText)
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { model, messages, response_format, temperature, stream } = body
  if (!model || !ALLOWED_MODELS.has(model)) return json({ error: 'Invalid model' }, 400)
  if (!Array.isArray(messages) || messages.length === 0) return json({ error: 'Invalid messages' }, 400)

  const groqPayload: Record<string, unknown> = { model, messages }
  if (response_format) groqPayload.response_format = response_format
  if (typeof temperature === 'number') groqPayload.temperature = temperature
  if (stream) groqPayload.stream = true

  let groqRes: Response
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groqPayload),
    })
  } catch (err) {
    console.error('groq-chat: upstream fetch failed', err)
    return json({ error: 'Upstream request failed' }, 502)
  }

  if (stream) {
    return new Response(groqRes.body, {
      status: groqRes.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  }

  const data = await groqRes.text()
  return new Response(data, {
    status: groqRes.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
