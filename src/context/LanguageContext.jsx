import { createContext, useContext, useEffect, useState } from 'react'
import { translations } from '../i18n/translations'

const LanguageContext = createContext(null)

function resolve(dict, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], dict)
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('ielts-ai-lang') || 'en')

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
    localStorage.setItem('ielts-ai-lang', lang)
  }, [lang])

  const t = (key, vars) => {
    let value = resolve(translations[lang], key)
    if (value === undefined) value = resolve(translations.en, key)
    if (typeof value === 'string' && vars) {
      return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), value)
    }
    return value
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
