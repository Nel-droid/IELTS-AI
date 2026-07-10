import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import './Login.css'

const MODES = { signin: 'signin', signup: 'signup', reset: 'reset' }

export default function Login() {
  const { session, loading, signInWithGoogle, signInWithGitHub, signInWithEmail, signUpWithEmail, resetPassword } = useAuth()
  const [mode, setMode] = useState(MODES.signin)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!loading && session) return <Navigate to="/dashboard" replace />

  const clear = () => { setError(''); setSuccess('') }

  const handleOAuth = async (fn) => {
    clear()
    setBusy(true)
    const { error } = await fn()
    if (error) setError(error.message)
    setBusy(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clear()
    setBusy(true)

    if (mode === MODES.reset) {
      const { error } = await resetPassword(email)
      setBusy(false)
      if (error) return setError(error.message)
      return setSuccess('Check your email for a password reset link.')
    }

    const fn = mode === MODES.signup ? signUpWithEmail : signInWithEmail
    const { error } = await fn(email, password)
    setBusy(false)
    if (error) return setError(error.message)
    if (mode === MODES.signup) setSuccess('Account created! Check your email to confirm.')
  }

  return (
    <div className="login-page">
      <ThemeToggle variant="page" />

      <div className="login-card">
        <Link to="/" className="login-logo">
          <Logo size={32} />
          <span>IELTS AI Checker</span>
        </Link>

        <h1 className="login-title">
          {mode === MODES.signin && 'Welcome back'}
          {mode === MODES.signup && 'Create account'}
          {mode === MODES.reset && 'Reset password'}
        </h1>
        <p className="login-sub">
          {mode === MODES.signin && 'Sign in to continue practising'}
          {mode === MODES.signup && 'Start your IELTS AI practice'}
          {mode === MODES.reset && "We'll email you a reset link"}
        </p>

        {mode !== MODES.reset && (
          <>
            <button
              className="oauth-btn"
              onClick={() => handleOAuth(signInWithGoogle)}
              disabled={busy}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <button
              className="oauth-btn"
              onClick={() => handleOAuth(signInWithGitHub)}
              disabled={busy}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>

            <div className="login-divider"><span>or</span></div>
          </>
        )}

        {error && <div className="login-alert login-alert--error">{error}</div>}
        {success && <div className="login-alert login-alert--success">{success}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {mode !== MODES.reset && (
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete={mode === MODES.signup ? 'new-password' : 'current-password'}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Please wait…' : (
              mode === MODES.signin ? 'Sign in' :
              mode === MODES.signup ? 'Create account' :
              'Send reset link'
            )}
          </button>
        </form>

        <div className="login-switch">
          {mode === MODES.signin && (
            <>
              <button className="link-btn" onClick={() => { setMode(MODES.signup); clear() }}>
                Create account
              </button>
              <span>·</span>
              <button className="link-btn" onClick={() => { setMode(MODES.reset); clear() }}>
                Forgot password?
              </button>
            </>
          )}
          {mode === MODES.signup && (
            <button className="link-btn" onClick={() => { setMode(MODES.signin); clear() }}>
              Already have an account? Sign in
            </button>
          )}
          {mode === MODES.reset && (
            <button className="link-btn" onClick={() => { setMode(MODES.signin); clear() }}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
