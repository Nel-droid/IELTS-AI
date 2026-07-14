import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Reveal } from '../components/Reveal'
import { ScoreCard } from '../components/ScoreCard'
import { IconWriting, IconSpeaking, IconStudio, IconUpload, IconBolt, IconTarget } from '../components/icons'
import './Landing.css'

export default function Landing() {
  const { session, loading } = useAuth()
  const { t } = useLanguage()
  if (!loading && session) return <Navigate to="/chat" replace />

  const features = [
    { Icon: IconWriting, title: t('landing.featureWritingTitle'), desc: t('landing.featureWritingDesc'), tag: 'writing', tagLabel: t('landing.tagWriting') },
    { Icon: IconSpeaking, title: t('landing.featureSpeakingTitle'), desc: t('landing.featureSpeakingDesc'), tag: 'speaking', tagLabel: t('landing.tagSpeaking') },
    { Icon: IconStudio, title: t('landing.featureChatTitle'), desc: t('landing.featureChatDesc'), tag: 'chat', tagLabel: t('landing.tagChat') },
  ]

  const previewCriteria = [
    { key: 'ta', label: t('landing.criterionTA'), score: 7, feedback: '' },
    { key: 'cc', label: t('landing.criterionCC'), score: 8, feedback: '' },
    { key: 'lr', label: t('landing.criterionLR'), score: 7, feedback: '' },
    { key: 'gr', label: t('landing.criterionGR'), score: 6, feedback: '' },
  ]

  const stats = [
    { Icon: IconBolt, label: t('landing.statInstant') },
    { Icon: IconTarget, label: t('landing.statWholeBand') },
  ]

  const steps = [
    { title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { title: t('landing.step3Title'), desc: t('landing.step3Desc') },
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
        <div className="land-hero-glow land-hero-glow--1" aria-hidden="true" />
        <div className="land-hero-glow land-hero-glow--2" aria-hidden="true" />
        <div className="land-hero-glow land-hero-glow--3" aria-hidden="true" />

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
          <div className="land-stats">
            {stats.map(s => (
              <span key={s.label} className="land-stat">
                <s.Icon />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="land-hero-visual">
          <div className="preview-window">
            <div className="preview-chrome">
              <span className="preview-dot preview-dot--r" />
              <span className="preview-dot preview-dot--y" />
              <span className="preview-dot preview-dot--g" />
              <span className="preview-chrome-label">{t('landing.previewLabel')}</span>
            </div>
            <div className="preview-body">
              <div className="preview-msg-user">{t('landing.previewUserMsg')}</div>
              <ScoreCard
                criteria={previewCriteria}
                strengths={[]}
                improvements={[]}
                overallLabel={t('writing.overallBand')}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="land-steps">
        <Reveal><h2 className="land-section-title">{t('landing.howItWorksTitle')}</h2></Reveal>
        <div className="land-steps-grid">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 100} className="step-card">
              <span className="step-number">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="land-features">
        <Reveal><h2 className="land-section-title">{t('landing.sectionTitle')}</h2></Reveal>
        <div className="land-features-grid">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 100} className={`feature-card feature-card--${f.tag}`}>
              <div className="feature-icon"><f.Icon /></div>
              <div className={`feature-tag skill-tag--${f.tag}`}>{f.tagLabel}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal className="land-cta-section">
        <div className="land-cta-card">
          <h2>{t('landing.ctaTitle')}</h2>
          <p>{t('landing.ctaSubtitle')}</p>
          <Link to="/login" className="btn btn-primary btn-lg">{t('landing.createAccount')}</Link>
          <div className="land-cta-icons" aria-hidden="true">
            <IconUpload /> <IconSpeaking /> <IconStudio />
          </div>
        </div>
      </Reveal>

      <footer className="land-footer">
        <div className="land-footer-brand">
          <Logo size={22} />
          <span>IELTS AI Checker</span>
        </div>
        <p>{t('landing.footer')}</p>
      </footer>
    </div>
  )
}
