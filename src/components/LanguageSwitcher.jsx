import { useLanguage } from '../context/LanguageContext'
import { LANGUAGES } from '../i18n/translations'

export function LanguageSwitcher({ variant = 'nav' }) {
  const { lang, setLang } = useLanguage()

  return (
    <select
      className={`lang-switcher${variant === 'page' ? ' lang-switcher--page' : ''}`}
      value={lang}
      onChange={e => setLang(e.target.value)}
      aria-label="Choose language"
    >
      {LANGUAGES.map(l => (
        <option key={l.code} value={l.code}>{l.short}</option>
      ))}
    </select>
  )
}
