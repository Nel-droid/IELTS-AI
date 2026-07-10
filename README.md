# IELTS AI Checker

AI-powered IELTS Writing & Speaking practice app. Built with React + Vite, styled to match the CDI Practice design system, installable as a PWA on desktop and mobile.

- **Writing Checker** — paste an essay, get band scores across all 4 IELTS criteria via Gemini
- **Speaking Practice** — real Part 1/2/3 exam flow using the browser's speech synthesis (AI examiner voice) and speech recognition (your spoken answers), scored by Gemini
- **AI Tutor Chat** — free-form IELTS help, streamed from Gemini
- **Auth** — Google, GitHub, and email/password (with password reset) via Supabase

## 1. Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API |
| `VITE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |

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

- Speaking practice uses the Web Speech API (`SpeechRecognition` + `speechSynthesis`), which is best supported in Chrome and Edge.
- The app is a PWA — installable from the browser on both desktop and mobile (Add to Home Screen).
