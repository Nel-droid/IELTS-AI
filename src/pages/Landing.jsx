import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import './Landing.css'

export default function Landing() {
  const { session, loading } = useAuth()
  const { t } = useLanguage()
  if (!loading && session) return <Navigate to="/dashboard" replace />

  const features = [
    { icon: '✍️', title: t('landing.featureWritingTitle'), desc: t('landing.featureWritingDesc'), tag: 'writing', tagLabel: t('landing.tagWriting') },
    { icon: '🎤', title: t('landing.featureSpeakingTitle'), desc: t('landing.featureSpeakingDesc'), tag: 'speaking', tagLabel: t('landing.tagSpeaking') },
    { icon: '💬', title: t('landing.featureChatTitle'), desc: t('landing.featureChatDesc'), tag: 'chat', tagLabel: t('landing.tagChat') },
  ]

  const criteria = [
    [t('landing.criterionTA'), 7],
    [t('landing.criterionCC'), 7.5],
    [t('landing.criterionLR'), 7],
    [t('landing.criterionGR'), 6.5],
  ]

  return (
    <div className="landing">
      <header className="land-header">
        <div className="land-logo">
          <Logo size={36} />
          <span>IELTS AI Checker</span>
        </div>
        <div className="land-header-actions">
          <LanguageSwitcher variant="page" />
          <ThemeToggle variant="page" />
          <Link to="/login" className="btn btn-outline btn-sm">{t('landing.signIn')}</Link>
        </div>
      </header>

      <section className="land-hero">
        <div className="land-hero-content">
          <div className="land-badge">{t('landing.badge')}</div>
          <h1 className="land-title">
            {t('landing.titleLine1')}<br />
            <span className="land-accent">{t('landing.titleAccent')}</span>
          </h1>
          <p className="land-subtitle">{t('landing.subtitle')}</p>
          <div className="land-cta">
            <Link to="/login" className="btn btn-primary btn-lg">{t('landing.getStarted')}</Link>
            <Link to="/login" className="btn btn-outline btn-lg">{t('landing.signIn')}</Link>
          </div>
        </div>
        <div className="land-hero-visual">
          <div className="hero-card">
            <div className="hero-card-header">
              <span className="hero-skill-tag writing">{t('landing.sampleTaskLabel')}</span>
              <span className="hero-score">{t('landing.sampleBand')}</span>
            </div>
            <div className="hero-criteria">
              {criteria.map(([label, score]) => (
                <div key={label} className="hero-criterion">
                  <span>{label}</span>
                  <div className="hero-bar-wrap">
                    <div className="hero-bar" style={{ width: `${(score / 9) * 100}%` }} />
                  </div>
                  <span className="hero-score-sm">{score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="land-features">
        <h2 className="land-section-title">{t('landing.sectionTitle')}</h2>
        <div className="land-features-grid">
          {features.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div className={`feature-tag skill-tag--${f.tag}`}>{f.tagLabel}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-cta-section">
        <h2>{t('landing.ctaTitle')}</h2>
        <p>{t('landing.ctaSubtitle')}</p>
        <Link to="/login" className="btn btn-primary btn-lg">{t('landing.createAccount')}</Link>
      </section>

      <footer className="land-footer">
        <p>{t('landing.footer')}</p>
      </footer>
    </div>
  )
}
