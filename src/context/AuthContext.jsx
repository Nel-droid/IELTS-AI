import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/chat` },
    })

  const signInWithGitHub = () =>
    supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/chat` },
    })

  const signInWithEmail = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUpWithEmail = (email, password) =>
    supabase.auth.signUp({ email, password })

  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

  const signOut = () => supabase.auth.signOut()

  const changePassword = (newPassword) =>
    supabase.auth.updateUser({ password: newPassword })

  const updateDisplayName = (name) =>
    supabase.auth.updateUser({ data: { name } })

  const hasPasswordAuth = (session?.user?.app_metadata?.providers ?? []).includes('email')

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading: session === undefined,
      hasPasswordAuth,
      signInWithGoogle,
      signInWithGitHub,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      changePassword,
      updateDisplayName,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
