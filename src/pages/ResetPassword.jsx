import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import './Login.css'

export default function ResetPassword() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError(t('resetPw.tooShort'))
      return
    }
    if (password !== confirm) {
      setError(t('resetPw.mismatch'))
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/chat', { replace: true })
  }

  return (
    <div className="login-page">
      <LanguageSwitcher variant="page" />
      <ThemeToggle variant="page" />

      <div className="login-card">
        <div className="login-logo">
          <Logo size={32} />
          <span>IELTS AI Checker</span>
        </div>

        <h1 className="login-title">{t('resetPw.title')}</h1>
        <p className="login-sub">{t('resetPw.subtitle')}</p>

        {error && <div className="login-alert login-alert--error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label htmlFor="new-password">{t('resetPw.newPassword')}</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirm-password">{t('resetPw.confirmPassword')}</label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? t('login.pleaseWait') : t('resetPw.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
