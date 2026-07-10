import { useTheme } from '../context/ThemeContext'

export function ThemeToggle({ variant = 'nav' }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      className={`theme-toggle${variant === 'page' ? ' theme-toggle--page' : ''}`}
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
