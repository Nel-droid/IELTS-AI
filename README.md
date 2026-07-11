# IELTS AI Checker

AI-powered IELTS Writing & Speaking practice app. Built with React + Vite, styled to match the CDI Practice design system, installable as a PWA on desktop and mobile.

- **AI Studio** — one unified chat: check your Writing (upload essay photos or paste text), practice Speaking (guided Part 1→2→3 with voice recording), or just ask IELTS questions
- **Whole-number band scoring** — each criterion is a whole IELTS band (6, 7, 8…), overall band computed with the official rounding rule (average, rounded up to the nearest half band)
- **Auth** — Google, GitHub, and email/password (with working password reset) via Supabase
- Powered by **Groq** (Llama 4 Scout for vision/text, Whisper for speech-to-text) — free tier, no billing required

## 1. Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API |
| `VITE_GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys (free, no card) |

## 2. Supabase configuration

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Providers**: enable **Google** and **GitHub**, each with their own OAuth client ID/secret (from Google Cloud Console and GitHub OAuth Apps respectively). Set the authorized redirect URI to the one Supabase shows on that page (`https://<project>.supabase.co/auth/v1/callback`).
3. **Authentication → URL Configuration**: set Site URL to your Netlify URL (e.g. `https://your-app.netlify.app`), and add both the Netlify URL and `http://localhost:5173` under Redirect URLs.
4. Email/password sign-up and password reset work out of the box — no extra config needed.

## 3. Run locally

```bash
npm run dev
```

## 4. Deploy to Netlify

```bash
npm run build
```

- Connect the repo in Netlify, or drag-drop the `dist/` folder.
- Build command: `npm run build`, publish directory: `dist` (already set in `netlify.toml`, which also handles SPA routing).
- Add the three `VITE_*` env vars in Netlify → Site configuration → Environment variables.
- After the first deploy, go back to Supabase and update the Site URL / Redirect URLs with the real Netlify domain.

## Notes

- Speaking practice records real microphone audio and transcribes it via Groq's Whisper before scoring — best supported in Chrome and Edge.
- The Groq API key is called directly from the browser (same tradeoff most fast-shipped AI frontends make). Set a rate limit in the Groq console if you're worried about abuse before wider launch; moving calls behind a serverless function is the more robust fix later.
- The app is a PWA — installable from the browser on both desktop and mobile (Add to Home Screen).
