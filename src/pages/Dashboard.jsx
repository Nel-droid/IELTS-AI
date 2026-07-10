import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

const tools = [
  {
    to: '/writing',
    icon: '✍️',
    title: 'Writing Checker',
    desc: 'Get AI band scores and feedback on Task 1 & Task 2 essays',
    tag: 'writing',
    tagLabel: 'Writing',
    cta: 'Check my writing',
  },
  {
    to: '/speaking',
    icon: '🎤',
    title: 'Speaking Practice',
    desc: 'Full IELTS Speaking exam with AI examiner — Parts 1, 2 & 3',
    tag: 'speaking',
    tagLabel: 'Speaking',
    cta: 'Start speaking',
  },
  {
    to: '/chat',
    icon: '💬',
    title: 'AI Tutor Chat',
    desc: 'Ask your IELTS questions, get essay help, or explore vocabulary',
    tag: 'chat',
    tagLabel: 'AI Chat',
    cta: 'Open chat',
  },
]

export default function Dashboard() {
  const { user } = useAuth()
  const name = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'there'

  return (
    <div className="dash-page">
      <div className="dash-hero">
        <h1 className="dash-greeting">Hello, {name} 👋</h1>
        <p className="dash-subtitle">
          Choose a tool below to start your IELTS AI practice session.
        </p>
      </div>

      <div className="dash-grid">
        {tools.map(t => (
          <Link key={t.to} to={t.to} className="dash-card">
            <div className="dash-card-icon">{t.icon}</div>
            <span className={`dash-tag dash-tag--${t.tag}`}>{t.tagLabel}</span>
            <h2 className="dash-card-title">{t.title}</h2>
            <p className="dash-card-desc">{t.desc}</p>
            <span className="dash-card-cta">{t.cta} →</span>
          </Link>
        ))}
      </div>

      <div className="dash-tip">
        <span className="dash-tip-icon">💡</span>
        <div>
          <strong>Tip:</strong> For best speaking results, use Chrome or Edge with microphone access enabled. Safari is also supported.
        </div>
      </div>
    </div>
  )
}
