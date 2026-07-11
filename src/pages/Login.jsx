import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import './Login.css'

const MODES = { signin: 'signin', signup: 'signup', reset: 'reset' }

export default function Login() {
  const { session, loading, signInWithGoogle, signInWithGitHub, signInWithEmail, signUpWithEmail, resetPassword } = useAuth()
  const { t } = useLanguage()
  const [mode, setMode] = useState(MODES.signin)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!loading && session) return <Navigate to="/chat" replace />

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
      return setSuccess(t('login.resetSuccess'))
    }

    const fn = mode === MODES.signup ? signUpWithEmail : signInWithEmail
    const { error } = await fn(email, password)
    setBusy(false)
    if (error) return setError(error.message)
    if (mode === MODES.signup) setSuccess(t('login.signupSuccess'))
  }

  return (
    <div className="login-page">
      <LanguageSwitcher variant="page" />
      <ThemeToggle variant="page" />

      <div className="login-card">
        <Link to="/" className="login-logo">
          <Logo size={32} />
          <span>IELTS AI Checker</span>
        </Link>

        <h1 className="login-title">
          {mode === MODES.signin && t('login.welcomeBack')}
          {mode === MODES.signup && t('login.createAccountTitle')}
          {mode === MODES.reset && t('login.resetTitle')}
        </h1>
        <p className="login-sub">
          {mode === MODES.signin && t('login.signInSub')}
          {mode === MODES.signup && t('login.createAccountSub')}
          {mode === MODES.reset && t('login.resetSub')}
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
              {t('login.continueGoogle')}
            </button>

            <button
              className="oauth-btn"
              onClick={() => handleOAuth(signInWithGitHub)}
              disabled={busy}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              {t('login.continueGithub')}
            </button>

            <div className="login-divider"><span>{t('login.or')}</span></div>
          </>
        )}

        {error && <div className="login-alert login-alert--error">{error}</div>}
        {success && <div className="login-alert login-alert--success">{success}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label htmlFor="email">{t('login.email')}</label>
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
              <label htmlFor="password">{t('login.password')}</label>
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
            {busy ? t('login.pleaseWait') : (
              mode === MODES.signin ? t('login.signInBtn') :
              mode === MODES.signup ? t('login.createAccountBtn') :
              t('login.sendResetBtn')
            )}
          </button>
        </form>

        <div className="login-switch">
          {mode === MODES.signin && (
            <>
              <button className="link-btn" onClick={() => { setMode(MODES.signup); clear() }}>
                {t('login.createAccountLink')}
              </button>
              <span>·</span>
              <button className="link-btn" onClick={() => { setMode(MODES.reset); clear() }}>
                {t('login.forgotPassword')}
              </button>
            </>
          )}
          {mode === MODES.signup && (
            <button className="link-btn" onClick={() => { setMode(MODES.signin); clear() }}>
              {t('login.alreadyHaveAccount')}
            </button>
          )}
          {mode === MODES.reset && (
            <button className="link-btn" onClick={() => { setMode(MODES.signin); clear() }}>
              {t('login.backToSignIn')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
