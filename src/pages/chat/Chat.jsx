import { useState, useRef, useEffect } from 'react'
import { createChat, streamChatMessage } from '../../lib/groq'
import { useLanguage } from '../../context/LanguageContext'
import ReactMarkdown from 'react-markdown'
import WritingPanel from './WritingPanel'
import SpeakingPanel from './SpeakingPanel'
import './Chat.css'

let msgId = 0
const nextId = () => ++msgId

export default function Chat() {
  const { t, lang } = useLanguage()
  const [messages, setMessages] = useState([{ id: nextId(), role: 'assistant', type: 'text', content: t('chat.welcomeMessage') }])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const chatRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    chatRef.current = createChat(lang)
    setMessages([{ id: nextId(), role: 'assistant', type: 'text', content: t('chat.welcomeMessage') }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || streaming) return
    setInput('')
    setError('')

    const userMsg = { id: nextId(), role: 'user', type: 'text', content: msg }
    const placeholderId = nextId()
    setMessages(prev => [...prev, userMsg, { id: placeholderId, role: 'assistant', type: 'text', content: '', streaming: true }])
    setStreaming(true)

    try {
      let full = ''
      for await (const chunk of streamChatMessage(chatRef.current, msg)) {
        full += chunk
        setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: full, streaming: true } : m))
      }
      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: full, streaming: false } : m))
    } catch (err) {
      setError(err.message || t('chat.errorFallback'))
      setMessages(prev => prev.filter(m => m.id !== placeholderId))
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const clearChat = () => {
    chatRef.current = createChat(lang)
    setMessages([{ id: nextId(), role: 'assistant', type: 'text', content: t('chat.clearedMessage') }])
    setError('')
  }

  const openWriting = () => {
    setMessages(prev => [...prev, { id: nextId(), role: 'assistant', type: 'writing-form' }])
  }

  const openSpeaking = () => {
    setMessages(prev => [...prev, { id: nextId(), role: 'assistant', type: 'speaking-form' }])
  }

  const handleToolResult = () => {
    setMessages(prev => [...prev, { id: nextId(), role: 'assistant', type: 'text', content: t('chat.toolFollowup') }])
  }

  const suggestions = t('chat.suggestions')

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div>
          <h1 className="chat-title">{t('chat.title')}</h1>
          <p className="chat-sub">{t('chat.subtitle')}</p>
        </div>
        <div className="chat-header-actions">
          <span className="chat-badge">{t('chat.badge')}</span>
          <button className="btn btn-ghost btn-sm" onClick={clearChat} disabled={streaming}>
            {t('chat.clearChat')}
          </button>
        </div>
      </div>

      <div className="chat-tools-row">
        <button className="chat-tool-btn chat-tool-btn--writing" onClick={openWriting}>
          <span className="chat-tool-btn-icon">📝</span>
          <span>
            <strong>{t('chat.checkWriting')}</strong>
            <small>{t('chat.checkWritingSub')}</small>
          </span>
        </button>
        <button className="chat-tool-btn chat-tool-btn--speaking" onClick={openSpeaking}>
          <span className="chat-tool-btn-icon">🎤</span>
          <span>
            <strong>{t('chat.practiceSpeaking')}</strong>
            <small>{t('chat.practiceSpeakingSub')}</small>
          </span>
        </button>
      </div>

      {messages.length === 1 && !streaming && (
        <div className="suggestions">
          <p className="suggestions-label">{t('chat.tryAsking')}</p>
          <div className="suggestions-grid">
            {suggestions.map(s => (
              <button key={s} className="suggestion-btn" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.map(m => {
          if (m.type === 'writing-form') {
            return (
              <div key={m.id} className="chat-tool-msg">
                <WritingPanel onResult={handleToolResult} />
              </div>
            )
          }
          if (m.type === 'speaking-form') {
            return (
              <div key={m.id} className="chat-tool-msg">
                <SpeakingPanel onResult={handleToolResult} />
              </div>
            )
          }
          return (
            <div key={m.id} className={`chat-msg chat-msg--${m.role}`}>
              <div className="msg-avatar">
                {m.role === 'assistant' ? '🤖' : '👤'}
              </div>
              <div className="msg-bubble">
                {m.role === 'assistant' ? (
                  <div className="msg-md">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{m.content}</p>
                )}
                {m.streaming && <span className="cursor-blink">▍</span>}
              </div>
            </div>
          )
        })}

        {error && (
          <div className="chat-error">{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t('chat.placeholder')}
          rows={2}
          disabled={streaming}
        />
        <button
          className="btn btn-primary chat-send-btn"
          onClick={() => send()}
          disabled={streaming || !input.trim()}
          aria-label="Send message"
        >
          {streaming ? <span className="spinner" /> : '↑'}
        </button>
      </div>
    </div>
  )
}
