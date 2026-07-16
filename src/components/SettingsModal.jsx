import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { usePreferences } from '../context/PreferencesContext'
import { uploadAvatar } from '../lib/avatar'
import { LANGUAGES } from '../i18n/translations'
import {
  IconX, IconUser, IconSun, IconMoon, IconGlobe, IconLock, IconStudio,
  IconShield, IconBell, IconType, IconGauge, IconCamera, IconLogOut,
} from './icons'
import './SettingsModal.css'

const SECTIONS = ['profile', 'appearance', 'behavior', 'language', 'security', 'skills', 'privacy', 'notifications']
const SECTION_ICONS = {
  profile: IconUser, appearance: IconSun, behavior: IconGauge, language: IconGlobe,
  security: IconLock, skills: IconStudio, privacy: IconShield, notifications: IconBell,
}

export default function SettingsModal({ onClose }) {
  const { t } = useLanguage()
  const [section, setSection] = useState('profile')

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <nav className="settings-nav">
          <div className="settings-nav-header">
            <span>{t('settings.title')}</span>
            <button className="settings-close settings-close--mobile" onClick={onClose}><IconX /></button>
          </div>
          {SECTIONS.map(s => {
            const Icon = SECTION_ICONS[s]
            return (
              <button
                key={s}
                className={`settings-nav-item${section === s ? ' settings-nav-item--active' : ''}`}
                onClick={() => setSection(s)}
              >
                <Icon /> {t(`settings.section.${s}`)}
              </button>
            )
          })}
        </nav>

        <div className="settings-panel">
          <button className="settings-close" onClick={onClose} aria-label="Close"><IconX /></button>
          {section === 'profile' && <ProfileSection />}
          {section === 'appearance' && <AppearanceSection />}
          {section === 'behavior' && <BehaviorSection />}
          {section === 'language' && <LanguageSection />}
          {section === 'security' && <SecuritySection />}
          {section === 'skills' && <SkillsSection />}
          {section === 'privacy' && <PrivacySection />}
          {section === 'notifications' && <NotificationsSection />}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return <h2 className="settings-section-title">{children}</h2>
}

function ProfileSection() {
  const { t } = useLanguage()
  const { user, signOut, updateDisplayName } = useAuth()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const avatarUrl = user?.user_metadata?.avatar_url
  const displayName = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? ''
  const initial = displayName.charAt(0).toUpperCase()

  const [name, setName] = useState(displayName)
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSuccess, setNameSuccess] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      await uploadAvatar(user.id, file)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSaveName = async (e) => {
    e.preventDefault()
    setNameError('')
    setNameSuccess('')
    const trimmed = name.trim()
    if (!trimmed) return setNameError(t('settings.nameRequired'))
    if (trimmed === displayName) return
    setSavingName(true)
    const { error } = await updateDisplayName(trimmed)
    setSavingName(false)
    if (error) return setNameError(error.message)
    setNameSuccess(t('settings.nameUpdated'))
  }

  return (
    <div className="settings-body">
      <SectionTitle>{t('settings.section.profile')}</SectionTitle>

      <div className="settings-avatar-row">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="settings-avatar" />
        ) : (
          <span className="settings-avatar settings-avatar--fallback">{initial}</span>
        )}
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <IconCamera /> {uploading ? t('login.pleaseWait') : t('settings.changePhoto')}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
        </div>
      </div>
      {error && <div className="settings-error">{error}</div>}

      <div className="settings-field">
        <label>{t('login.email')}</label>
        <input type="text" value={user?.email ?? ''} disabled />
      </div>

      <form className="settings-field" onSubmit={handleSaveName}>
        <label>{t('settings.displayName')}</label>
        <div className="settings-inline-form">
          <input type="text" value={name} onChange={e => { setName(e.target.value); setNameSuccess('') }} placeholder={t('settings.displayName')} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={savingName || !name.trim() || name.trim() === displayName}>
            {savingName ? t('login.pleaseWait') : t('settings.save')}
          </button>
        </div>
        {nameError && <div className="settings-error">{nameError}</div>}
        {nameSuccess && <div className="settings-success">{nameSuccess}</div>}
      </form>

      <p className="settings-hint">{t('settings.passwordHint')}</p>

      <button className="btn btn-ghost btn-sm settings-signout" onClick={signOut}>
        <IconLogOut /> {t('nav.signOut')}
      </button>
    </div>
  )
}

function AppearanceSection() {
  const { t } = useLanguage()
  const { theme, toggle } = useTheme()
  const { fontSize, setFontSize, chatBackground, setChatBackground } = usePreferences()

  return (
    <div className="settings-body">
      <SectionTitle>{t('settings.section.appearance')}</SectionTitle>

      <div className="settings-field">
        <label>{t('settings.theme')}</label>
        <div className="settings-segmented">
          <button className={theme === 'light' ? 'active' : ''} onClick={() => theme === 'dark' && toggle()}>
            <IconSun /> {t('settings.themeLight')}
          </button>
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => theme === 'light' && toggle()}>
            <IconMoon /> {t('settings.themeDark')}
          </button>
        </div>
      </div>

      <div className="settings-field">
        <label><IconType /> {t('settings.fontSize.label')}</label>
        <div className="settings-segmented">
          {['small', 'medium', 'large'].map(size => (
            <button key={size} className={fontSize === size ? 'active' : ''} onClick={() => setFontSize(size)}>
              {t(`settings.fontSize.${size}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <label>{t('settings.chatBackground.label')}</label>
        <div className="settings-bg-picker">
          {['starfield', 'aurora', 'dotGrid', 'off'].map(bg => (
            <button
              key={bg}
              className={`settings-bg-option${chatBackground === bg ? ' active' : ''}`}
              onClick={() => setChatBackground(bg)}
            >
              <span className={`settings-bg-swatch settings-bg-swatch--${bg}`} />
              {t(`settings.chatBackground.${bg}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function BehaviorSection() {
  const { t } = useLanguage()
  const { aiStyle, setAiStyle, aiSpeed, setAiSpeed } = usePreferences()

  return (
    <div className="settings-body">
      <SectionTitle>{t('settings.section.behavior')}</SectionTitle>
      <p className="settings-hint">{t('settings.behaviorHint')}</p>

      <div className="settings-field">
        <label>{t('settings.style.label')}</label>
        <div className="settings-segmented settings-segmented--col">
          {['encouraging', 'formal', 'concise'].map(s => (
            <button key={s} className={aiStyle === s ? 'active' : ''} onClick={() => setAiStyle(s)}>
              {t(`settings.style.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <label><IconGauge /> {t('settings.speed.label')}</label>
        <div className="settings-segmented settings-segmented--col">
          {['balanced', 'fastest'].map(s => (
            <button key={s} className={aiSpeed === s ? 'active' : ''} onClick={() => setAiSpeed(s)}>
              {t(`settings.speed.${s}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function LanguageSection() {
  const { t, lang, setLang } = useLanguage()
  return (
    <div className="settings-body">
      <SectionTitle>{t('settings.section.language')}</SectionTitle>
      <div className="settings-segmented settings-segmented--col">
        {LANGUAGES.map(l => (
          <button key={l.code} className={lang === l.code ? 'active' : ''} onClick={() => setLang(l.code)}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SecuritySection() {
  const { t } = useLanguage()
  const { hasPasswordAuth, changePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (password.length < 6) return setError(t('resetPw.tooShort'))
    if (password !== confirm) return setError(t('resetPw.mismatch'))
    setBusy(true)
    const { error } = await changePassword(password)
    setBusy(false)
    if (error) return setError(error.message)
    setSuccess(t('settings.passwordUpdated'))
    setPassword('')
    setConfirm('')
  }

  return (
    <div className="settings-body">
      <SectionTitle>{t('settings.section.security')}</SectionTitle>

      {!hasPasswordAuth ? (
        <p className="settings-hint">{t('settings.noPassword')}</p>
      ) : (
        <form onSubmit={handleSubmit} className="settings-form">
          {error && <div className="settings-error">{error}</div>}
          {success && <div className="settings-success">{success}</div>}
          <div className="settings-field">
            <label>{t('resetPw.newPassword')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="settings-field">
            <label>{t('resetPw.confirmPassword')}</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !password}>
            {busy ? t('login.pleaseWait') : t('resetPw.submit')}
          </button>
        </form>
      )}
    </div>
  )
}

function SkillsSection() {
  const { t } = useLanguage()
  const items = t('settings.skillsList')
  return (
    <div className="settings-body">
      <SectionTitle>{t('settings.section.skills')}</SectionTitle>
      <ul className="settings-list">
        {items.map((item, i) => (
          <li key={i}><strong>{item.title}</strong><span>{item.desc}</span></li>
        ))}
      </ul>
    </div>
  )
}

function PrivacySection() {
  const { t } = useLanguage()
  const paragraphs = t('settings.privacyText')
  return (
    <div className="settings-body">
      <SectionTitle>{t('settings.section.privacy')}</SectionTitle>
      {paragraphs.map((p, i) => <p key={i} className="settings-privacy-p">{p}</p>)}
    </div>
  )
}

function NotificationsSection() {
  const { t } = useLanguage()
  const { notifications, setNotifications, enableNotifications } = usePreferences()

  const toggle = async () => {
    if (notifications) { setNotifications(false); return }
    await enableNotifications()
  }

  return (
    <div className="settings-body">
      <SectionTitle>{t('settings.section.notifications')}</SectionTitle>
      <label className="settings-toggle-row">
        <span>{t('settings.notifyOnReply')}</span>
        <span className={`settings-toggle${notifications ? ' settings-toggle--on' : ''}`} onClick={toggle} role="switch" aria-checked={notifications}>
          <span className="settings-toggle-knob" />
        </span>
      </label>
      <p className="settings-hint">{t('settings.notifyHint')}</p>
    </div>
  )
}
