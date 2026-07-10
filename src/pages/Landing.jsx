import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import './Landing.css'

export default function Landing() {
  const { session, loading } = useAuth()
  if (!loading && session) return <Navigate to="/dashboard" replace />

  return (
    <div className="landing">
      <ThemeToggle variant="page" />

      <header className="land-header">
        <div className="land-logo">
          <Logo size={36} />
          <span>IELTS AI Checker</span>
        </div>
        <Link to="/login" className="btn btn-outline btn-sm">Sign in</Link>
      </header>

      <section className="land-hero">
        <div className="land-hero-content">
          <div className="land-badge">Powered by Google Gemini AI</div>
          <h1 className="land-title">
            Master IELTS with<br />
            <span className="land-accent">AI-Powered Feedback</span>
          </h1>
          <p className="land-subtitle">
            Get instant band-score feedback on your writing essays and speaking responses.
            Practice like the real exam, improve faster.
          </p>
          <div className="land-cta">
            <Link to="/login" className="btn btn-primary btn-lg">Get started free</Link>
            <Link to="/login" className="btn btn-outline btn-lg">Sign in</Link>
          </div>
        </div>
        <div className="land-hero-visual">
          <div className="hero-card">
            <div className="hero-card-header">
              <span className="hero-skill-tag writing">Writing Task 2</span>
              <span className="hero-score">Band 7.0</span>
            </div>
            <div className="hero-criteria">
              {[
                ['Task Achievement', 7],
                ['Coherence & Cohesion', 7.5],
                ['Lexical Resource', 7],
                ['Grammatical Range', 6.5],
              ].map(([label, score]) => (
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
        <h2 className="land-section-title">Everything you need to get Band 7+</h2>
        <div className="land-features-grid">
          {[
            {
              icon: '✍️',
              title: 'Writing Checker',
              desc: 'Paste your Task 1 or Task 2 essay. Get IELTS band scores across all 4 criteria with detailed improvement tips.',
              tag: 'writing',
              tagLabel: 'Writing',
            },
            {
              icon: '🎤',
              title: 'Speaking Practice',
              desc: 'Real IELTS speaking exam format: Part 1, 2 & 3. AI examiner speaks, you respond, get scored on fluency, grammar, vocabulary & pronunciation.',
              tag: 'speaking',
              tagLabel: 'Speaking',
            },
            {
              icon: '💬',
              title: 'AI Tutor Chat',
              desc: 'Ask anything about IELTS. Get vocabulary help, grammar explanations, or essay outlines from your personal AI tutor.',
              tag: 'chat',
              tagLabel: 'Chat',
            },
          ].map(f => (
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
        <h2>Start practising today</h2>
        <p>No subscription. Sign in with Google or GitHub and start immediately.</p>
        <Link to="/login" className="btn btn-primary btn-lg">Create free account</Link>
      </section>

      <footer className="land-footer">
        <p>© 2026 IELTS AI Checker · Powered by Google Gemini</p>
      </footer>
    </div>
  )
}
