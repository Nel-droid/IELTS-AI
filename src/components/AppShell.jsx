import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'
import './AppShell.css'

export default function AppShell() {
  const { signOut, user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const handleSignOut = async (e) => {
    e.preventDefault()
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <Link to="/chat" className="shell-logo">
          <Logo size={30} className="logo-mark--inv" />
          IELTS AI
        </Link>

        <nav className="shell-nav" aria-label="Main navigation">
          <span className="nav-user">{user?.user_metadata?.name ?? user?.email?.split('@')[0]}</span>
          <button onClick={handleSignOut} className="nav-link nav-signout nav-btn">
            {t('nav.signOut')}
          </button>
          <LanguageSwitcher />
          <ThemeToggle />
        </nav>
      </header>

      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
