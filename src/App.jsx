import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { PreferencesProvider } from './context/PreferencesContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import Landing from './pages/Landing'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Chat from './pages/chat/Chat'

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <PreferencesProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/chat/:id" element={<Chat />} />
                </Route>
                <Route path="/dashboard" element={<Navigate to="/chat" replace />} />
                <Route path="/writing" element={<Navigate to="/chat" replace />} />
                <Route path="/speaking" element={<Navigate to="/chat" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </PreferencesProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
