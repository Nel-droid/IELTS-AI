import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from './Logo'
import './AppShell.css'

export default function AppShell() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async (e) => {
    e.preventDefault()
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <NavLink to="/dashboard" className="shell-logo">
          <Logo size={30} className="logo-mark--inv" />
          IELTS AI
        </NavLink>

        <nav className="shell-nav" aria-label="Main navigation">
          <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/writing" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Writing
          </NavLink>
          <NavLink to="/speaking" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Speaking
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            AI Chat
          </NavLink>
          <span className="nav-divider" aria-hidden="true" />
          <span className="nav-user">{user?.user_metadata?.name ?? user?.email?.split('@')[0]}</span>
          <button onClick={handleSignOut} className="nav-link nav-signout nav-btn">
            Sign out
          </button>
          <ThemeToggle />
        </nav>
      </header>

      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
