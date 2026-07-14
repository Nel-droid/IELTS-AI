import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const { t } = useLanguage()
  if (loading) return <div className="auth-loading">{t('login.pleaseWait')}</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}
