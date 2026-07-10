import { useState, useRef, useEffect } from 'react'
import { createChat, streamChatMessage } from '../../lib/gemini'
import ReactMarkdown from 'react-markdown'
import './Chat.css'

const SUGGESTIONS = [
  'Can you give me IELTS Writing Task 2 tips?',
  'What vocabulary should I use for IELTS Speaking Part 2?',
  'Correct my grammar: "She have been working there since 2020."',
  'Give me 5 advanced synonyms for the word "increase".',
  'What topics are common in IELTS Writing Task 2?',
]

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your IELTS AI tutor. Ask me anything about IELTS — writing tips, vocabulary, grammar corrections, speaking strategies, or anything else. How can I help you today?',
    },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const chatRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    chatRef.current = createChat()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if (!msg || streaming) return
    setInput('')
    setError('')

    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '', streaming: true }])
    setStreaming(true)

    try {
      let full = ''
      for await (const chunk of streamChatMessage(chatRef.current, msg)) {
        full += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: full, streaming: true }
          return updated
        })
      }
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: full, streaming: false }
        return updated
      })
    } catch (err) {
      setError(err.message || 'Failed to get a response. Check your API key.')
      setMessages(prev => prev.slice(0, -1))
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
    chatRef.current = createChat()
    setMessages([{
      role: 'assistant',
      content: 'Chat cleared. Start a new conversation — how can I help?',
    }])
    setError('')
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div>
          <h1 className="chat-title">AI Tutor Chat</h1>
          <p className="chat-sub">Ask your IELTS questions — get expert advice instantly</p>
        </div>
        <div className="chat-header-actions">
          <span className="chat-badge">Gemini AI</span>
          <button className="btn btn-ghost btn-sm" onClick={clearChat} disabled={streaming}>
            Clear chat
          </button>
        </div>
      </div>

      {messages.length === 1 && !streaming && (
        <div className="suggestions">
          <p className="suggestions-label">Try asking:</p>
          <div className="suggestions-grid">
            {SUGGESTIONS.map(s => (
              <button key={s} className="suggestion-btn" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg--${m.role}`}>
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
        ))}

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
          placeholder="Ask anything about IELTS… (Enter to send, Shift+Enter for new line)"
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
