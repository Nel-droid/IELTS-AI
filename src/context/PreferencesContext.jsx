import { createContext, useContext, useEffect, useState } from 'react'

const PreferencesContext = createContext(null)

const KEYS = {
  fontSize: 'ielts-ai-font-size',
  aiStyle: 'ielts-ai-style',
  aiSpeed: 'ielts-ai-speed',
  notifications: 'ielts-ai-notifications',
  chatBackground: 'ielts-ai-chat-background',
}

function readInitial(key, fallback) {
  return localStorage.getItem(key) || fallback
}

export function PreferencesProvider({ children }) {
  const [fontSize, setFontSize] = useState(() => readInitial(KEYS.fontSize, 'medium'))
  const [aiStyle, setAiStyle] = useState(() => readInitial(KEYS.aiStyle, 'encouraging'))
  const [aiSpeed, setAiSpeed] = useState(() => readInitial(KEYS.aiSpeed, 'balanced'))
  const [notifications, setNotifications] = useState(() => localStorage.getItem(KEYS.notifications) === 'true')
  const [chatBackground, setChatBackground] = useState(() => readInitial(KEYS.chatBackground, 'starfield'))

  useEffect(() => { localStorage.setItem(KEYS.fontSize, fontSize) }, [fontSize])
  useEffect(() => { localStorage.setItem(KEYS.aiStyle, aiStyle) }, [aiStyle])
  useEffect(() => { localStorage.setItem(KEYS.aiSpeed, aiSpeed) }, [aiSpeed])
  useEffect(() => { localStorage.setItem(KEYS.notifications, String(notifications)) }, [notifications])
  useEffect(() => { localStorage.setItem(KEYS.chatBackground, chatBackground) }, [chatBackground])

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return false
    if (Notification.permission === 'granted') { setNotifications(true); return true }
    const perm = await Notification.requestPermission()
    const granted = perm === 'granted'
    setNotifications(granted)
    return granted
  }

  return (
    <PreferencesContext.Provider value={{
      fontSize, setFontSize,
      aiStyle, setAiStyle,
      aiSpeed, setAiSpeed,
      notifications, setNotifications, enableNotifications,
      chatBackground, setChatBackground,
    }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export const usePreferences = () => useContext(PreferencesContext)
