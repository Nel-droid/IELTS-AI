import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { createChat, streamChatMessage, transcribeAudio, evaluateWritingFreeform } from '../../lib/groq'
import { useLanguage } from '../../context/LanguageContext'
import { usePreferences } from '../../context/PreferencesContext'
import { useAuth } from '../../context/AuthContext'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { createConversation, getMessages, addMessage } from '../../lib/conversations'
import { fileToBase64, blobToBase64, micErrorMessage } from '../../lib/ielts'
import ReactMarkdown from 'react-markdown'
import SpeakingPanel from './SpeakingPanel'
import { ScoreCard } from '../../components/ScoreCard'
import { IconStudio, IconSend, IconRefresh, IconUser, IconPlus, IconSpeaking, IconX } from '../../components/icons'
import './Chat.css'

let msgId = 0
const nextId = () => ++msgId

const WRITING_CRITERIA_KEYS = ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange']
const SPEAKING_CRITERIA_KEYS = ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'pronunciation']
const WRITING_TRIGGER = /^\/writing\b/i
const WRITING_CANCEL = /^\/cancel\b/i

// A short, varied greeting instead of the same static line every time —
// mixes a time-of-day opener with a handful of generic ones, picked at random.
function pickGreeting(t, displayName) {
  const nameSuffix = displayName ? `, ${displayName}` : ''
  const hour = new Date().getHours()
  const timeKey = hour < 12 ? 'chat.greetingMorning' : hour < 18 ? 'chat.greetingAfternoon' : 'chat.greetingEvening'
  const pool = [t(timeKey), ...t('chat.greetings')]
  const template = pool[Math.floor(Math.random() * pool.length)]
  return template.replaceAll('{name}', nameSuffix)
}

function welcomeMsg(t, displayName) {
  return { id: nextId(), role: 'assistant', type: 'text', content: pickGreeting(t, displayName) }
}

// Auto-detect a writing submission so /writing is never required: an attached
// image, a long block of text (a real essay), or a message that opens with a
// "Task 1/2" label (how a pasted task prompt is normally formatted). This must
// stay narrow — a question that merely *mentions* "task 1" mid-sentence (e.g.
// "how can I improve my task 1?") should still get answered as normal chat.
// Reading/Listening submissions are long too, but carry markers a real essay
// never does (answer-format labels, explicit "Passage"/"Transcript"/"Questions"
// headers) — checked first so they route to normal chat (which now answers
// them directly) instead of being swallowed by the Writing scorer.
function looksLikeReadingOrListeningSubmission(msg) {
  return /true\s*\/\s*false\s*\/\s*not given|yes\s*\/\s*no\s*\/\s*not given|^\s*(passage|transcript|questions?)\s*:/im.test(msg)
}

function looksLikeWritingSubmission(msg, attachments) {
  if (attachments.length > 0) return true
  const trimmed = msg.trim()
  if (looksLikeReadingOrListeningSubmission(trimmed)) return false
  if (trimmed.split(/\s+/).filter(Boolean).length >= 40) return true
  return /^task\s*[12]\b/i.test(trimmed)
}

export default function Chat() {
  const { t, lang } = useLanguage()
  const { aiStyle, aiSpeed, notifications, fontSize, chatBackground } = usePreferences()
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const { refreshConversations, pendingTool, clearPendingTool, newChatNonce } = useOutletContext()
  const displayName = (user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? '').split(' ')[0]

  const [messages, setMessages] = useState([welcomeMsg(t, displayName)])
  const [conversationId, setConversationId] = useState(id ?? null)
  const [loadingHistory, setLoadingHistory] = useState(!!id)
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState([])
  const [transcribing, setTranscribing] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [writingPending, setWritingPending] = useState(false)
  const [error, setError] = useState('')
  const chatRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const writingBufferRef = useRef(null) // null | { images: [], texts: [] } — accumulates an in-progress writing submission
  const justCreatedRef = useRef(null)
  const recorder = useAudioRecorder()

  // Load (or reset) the conversation whenever the route id or language changes
  useEffect(() => {
    let cancelled = false

    async function load() {
      // A conversation we just created ourselves (via ensureConversation) triggers
      // this same effect through its own navigate() call — the in-memory state is
      // already correct, so skip the reload instead of clobbering it mid-send.
      if (id && justCreatedRef.current === id) {
        justCreatedRef.current = null
        setLoadingHistory(false)
        return
      }

      chatRef.current = createChat({ language: lang, style: aiStyle })
      setConversationId(id ?? null)
      writingBufferRef.current = null
      setWritingPending(false)

      if (!id) {
        setMessages([welcomeMsg(t, displayName)])
        setLoadingHistory(false)
        return
      }

      setLoadingHistory(true)
      try {
        const rows = await getMessages(id)
        if (cancelled) return
        if (rows.length === 0) {
          setMessages([welcomeMsg(t, displayName)])
        } else {
          setMessages(rows.map(r => ({ id: nextId(), role: r.role, type: r.type, content: r.content, data: r.data })))
          for (const r of rows) {
            if (r.type === 'text') chatRef.current.history.push({ role: r.role, content: r.content })
          }
        }
      } catch {
        setMessages([welcomeMsg(t, displayName)])
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lang, newChatNonce])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const persistText = (convoId, role, content) => {
    if (convoId) addMessage(convoId, { role, type: 'text', content }).catch(() => {})
  }

  const showWritingHint = async () => {
    const hint = t('writing.hintMessage')
    setMessages(prev => [...prev, { id: nextId(), role: 'assistant', type: 'text', content: hint }])
    const convoId = await ensureConversation(t('chat.checkWriting'))
    persistText(convoId, 'assistant', hint)
  }

  // Sidebar-triggered "Check my Writing" / "Practice Speaking"
  useEffect(() => {
    if (!pendingTool) return
    if (pendingTool === 'writing') showWritingHint()
    else setMessages(prev => [...prev, { id: nextId(), role: 'assistant', type: 'speaking-form' }])
    clearPendingTool()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTool])

  // Voice message: once recording stops, transcribe and drop the text into the composer for review
  useEffect(() => {
    if (recorder.status !== 'recorded' || !recorder.blob) return
    let cancelled = false
    setTranscribing(true)
    blobToBase64(recorder.blob)
      .then(base64 => transcribeAudio(base64, recorder.mimeType))
      .then(text => {
        if (cancelled) return
        setInput(prev => (prev ? `${prev} ${text}` : text).trim())
      })
      .catch(() => { if (!cancelled) setError(t('chat.errorFallback')) })
      .finally(() => {
        if (cancelled) return
        setTranscribing(false)
        recorder.reset()
        inputRef.current?.focus()
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.status])

  useEffect(() => {
    if (recorder.error) setError(micErrorMessage(t, recorder.error))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.error])

  // Ctrl+U to open the file picker from anywhere in the composer
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        fileInputRef.current?.click()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Persistence is a nice-to-have — if Supabase is unreachable or the
  // migration hasn't been run yet, chat must keep working without it.
  const ensureConversation = async (title) => {
    if (conversationId) return conversationId
    try {
      const convo = await createConversation(user.id, title)
      setConversationId(convo.id)
      justCreatedRef.current = convo.id
      navigate(`/chat/${convo.id}`, { replace: true })
      refreshConversations()
      return convo.id
    } catch {
      return null
    }
  }

  const notifyIfHidden = (text) => {
    if (!notifications || document.visibilityState !== 'hidden' || typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      new Notification(t('chat.title'), { body: text.slice(0, 120) })
    }
  }

  const handleFilesSelected = async (fileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    const withPreviews = await Promise.all(files.map(async f => ({
      id: nextId(),
      previewUrl: URL.createObjectURL(f),
      mimeType: f.type,
      base64: await fileToBase64(f),
    })))
    setAttachments(prev => [...prev, ...withPreviews])
  }

  const removeAttachment = (attId) => setAttachments(prev => prev.filter(a => a.id !== attId))

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    const imageFiles = Array.from(items)
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter(Boolean)
    if (imageFiles.length === 0) return
    e.preventDefault()
    handleFilesSelected(imageFiles)
  }

  const runWritingEvaluation = async (msg, currentAttachments) => {
    setStreaming(true)
    const userMsg = { id: nextId(), role: 'user', type: 'text', content: msg, images: currentAttachments }
    const placeholderId = nextId()
    setMessages(prev => [...prev, userMsg, { id: placeholderId, role: 'assistant', type: 'text', content: '', evaluating: true }])

    if (msg) writingBufferRef.current.texts.push(msg)
    for (const a of currentAttachments) writingBufferRef.current.images.push({ mimeType: a.mimeType, base64: a.base64 })

    const persistedContent = currentAttachments.length > 0
      ? `${msg} [+${currentAttachments.length} image${currentAttachments.length > 1 ? 's' : ''}]`.trim()
      : msg
    const convoId = await ensureConversation((persistedContent || t('chat.checkWriting')).slice(0, 60))
    persistText(convoId, 'user', persistedContent)

    try {
      const result = await evaluateWritingFreeform({
        images: writingBufferRef.current.images,
        texts: writingBufferRef.current.texts,
        language: lang,
      })

      if (result.insufficient || !result.criteria) {
        const content = result.insufficientReason || t('writing.errorFallback')
        setMessages(prev => prev.map(m => m.id === placeholderId
          ? { id: placeholderId, role: 'assistant', type: 'text', content }
          : m))
        persistText(convoId, 'assistant', content)
      } else {
        setMessages(prev => prev.filter(m => m.id !== placeholderId))
        const followup = t('chat.toolFollowup')
        setMessages(prev => [
          ...prev,
          { id: nextId(), role: 'assistant', type: 'writing-result', data: result },
          { id: nextId(), role: 'assistant', type: 'text', content: followup },
        ])
        if (convoId) {
          addMessage(convoId, { role: 'assistant', type: 'writing-result', data: result }).catch(() => {})
          addMessage(convoId, { role: 'assistant', type: 'text', content: followup }).catch(() => {})
          refreshConversations()
        }
        writingBufferRef.current = null
        setWritingPending(false)
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== placeholderId))
      setError(err.message || t('writing.errorFallback'))
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }

  const send = async (text) => {
    const msg = (text ?? input).trim()
    if ((!msg && attachments.length === 0) || streaming) return
    setInput('')
    setError('')
    const currentAttachments = attachments
    setAttachments([])

    if (writingBufferRef.current && WRITING_CANCEL.test(msg)) {
      writingBufferRef.current = null
      setWritingPending(false)
      const cancelMsg = t('writing.modeCancelled')
      setMessages(prev => [...prev, { id: nextId(), role: 'user', type: 'text', content: msg }, { id: nextId(), role: 'assistant', type: 'text', content: cancelMsg }])
      persistText(conversationId, 'user', msg)
      persistText(conversationId, 'assistant', cancelMsg)
      return
    }

    // No command required: an attached image, a long block of text, or an
    // explicit /writing all route into the writing check. A pending buffer
    // only keeps absorbing messages that themselves still look like essay
    // material — an unrelated question in between falls through to normal
    // chat instead of being trapped by a stale "send me your essay" wait.
    if (WRITING_TRIGGER.test(msg) || looksLikeWritingSubmission(msg, currentAttachments)) {
      if (!writingBufferRef.current) {
        writingBufferRef.current = { images: [], texts: [] }
        setWritingPending(true)
      }
      return runWritingEvaluation(msg, currentAttachments)
    }

    const userMsg = { id: nextId(), role: 'user', type: 'text', content: msg, images: currentAttachments }
    const placeholderId = nextId()
    setMessages(prev => [...prev, userMsg, { id: placeholderId, role: 'assistant', type: 'text', content: '', streaming: true }])
    setStreaming(true)

    try {
      const convoId = await ensureConversation(msg.slice(0, 60))
      if (convoId) addMessage(convoId, { role: 'user', type: 'text', content: msg }).catch(() => {})

      const images = currentAttachments.map(a => ({ mimeType: a.mimeType, base64: a.base64 }))
      let full = ''
      for await (const chunk of streamChatMessage(chatRef.current, msg, aiSpeed, images)) {
        full += chunk
        setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: full, streaming: true } : m))
      }
      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: full, streaming: false } : m))
      if (convoId) addMessage(convoId, { role: 'assistant', type: 'text', content: full }).catch(() => {})
      notifyIfHidden(full)
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

  const clearChat = () => navigate('/chat')

  const toggleRecording = () => {
    if (recorder.status === 'recording') recorder.stop()
    else if (recorder.status === 'idle') recorder.start()
  }

  const handleToolResult = async (type, data) => {
    const convoId = await ensureConversation(t('chat.practiceSpeaking'))
    setMessages(prev => [...prev, { id: nextId(), role: 'assistant', type, data }])

    const followup = t('chat.toolFollowup')
    setMessages(prev => [...prev, { id: nextId(), role: 'assistant', type: 'text', content: followup }])

    if (convoId) {
      addMessage(convoId, { role: 'assistant', type, data }).catch(() => {})
      addMessage(convoId, { role: 'assistant', type: 'text', content: followup }).catch(() => {})
      refreshConversations()
    }
  }

  const renderResultCard = (m) => {
    const keys = m.type === 'writing-result' ? WRITING_CRITERIA_KEYS : SPEAKING_CRITERIA_KEYS
    const labels = m.type === 'writing-result' ? t('writing.criteria') : t('speaking.criteria')
    const overallLabel = m.type === 'writing-result' ? t('writing.overallBand') : t('speaking.overallBand')
    const strengthsLabel = m.type === 'writing-result' ? t('writing.strengths') : t('speaking.strengths')
    const improvementsLabel = m.type === 'writing-result' ? t('writing.improvements') : t('speaking.improvements')
    const criteria = keys.map((key, i) => ({
      key,
      label: labels[i],
      score: m.data.criteria[key]?.score,
      feedback: m.data.criteria[key]?.feedback,
      examples: m.data.criteria[key]?.examples,
    })).filter(c => c.score != null)

    return (
      <div key={m.id} className="chat-tool-msg">
        <div className="wp-card">
          <ScoreCard
            criteria={criteria}
            strengths={m.data.strengths}
            improvements={m.data.improvements}
            overallLabel={overallLabel}
            strengthsLabel={strengthsLabel}
            improvementsLabel={improvementsLabel}
          />
        </div>
      </div>
    )
  }

  const composerBusy = streaming || transcribing
  const micLabel = recorder.status === 'recording' ? `${Math.floor(recorder.seconds / 60)}:${String(recorder.seconds % 60).padStart(2, '0')}` : null
  const composerPlaceholder = writingPending
    ? t('writing.composerPlaceholder')
    : (transcribing ? t('chat.transcribing') : t('chat.placeholder'))
  const isEmptyConversation = messages.length === 1 && messages[0].role === 'assistant' && messages[0].type === 'text'

  return (
    <div className={`chat-page chat-bg--${chatBackground} chat-font--${fontSize}${isEmptyConversation ? ' chat-page--empty' : ''}`}>
      {chatBackground === 'starfield' && (
        <div className="chat-starfield" aria-hidden="true">
          <span className="star-layer star-layer--1" />
          <span className="star-layer star-layer--2" />
          <span className="star-layer star-layer--3" />
        </div>
      )}
      {chatBackground === 'aurora' && (
        <div className="chat-aurora" aria-hidden="true">
          <span className="aurora-blob aurora-blob--1" />
          <span className="aurora-blob aurora-blob--2" />
          <span className="aurora-blob aurora-blob--3" />
        </div>
      )}
      {chatBackground === 'dotGrid' && <div className="chat-dotgrid" aria-hidden="true" />}
      {chatBackground === 'lightning' && (
        <div className="chat-lightning" aria-hidden="true">
          <span className="lightning-flash" />
          <span className="lightning-bolt lightning-bolt--1" />
          <span className="lightning-bolt lightning-bolt--2" />
        </div>
      )}
      {chatBackground === 'waves' && (
        <div className="chat-waves" aria-hidden="true">
          <span className="wave-layer wave-layer--1" />
          <span className="wave-layer wave-layer--2" />
          <span className="wave-layer wave-layer--3" />
        </div>
      )}
      {chatBackground === 'bokeh' && (
        <div className="chat-bokeh" aria-hidden="true">
          <span className="bokeh-layer bokeh-layer--1" />
          <span className="bokeh-layer bokeh-layer--2" />
        </div>
      )}
      {chatBackground === 'snowfall' && (
        <div className="chat-snowfall" aria-hidden="true">
          <span className="snow-layer snow-layer--1" />
          <span className="snow-layer snow-layer--2" />
          <span className="snow-layer snow-layer--3" />
        </div>
      )}
      {chatBackground === 'gridLines' && <div className="chat-gridlines" aria-hidden="true" />}
      {chatBackground === 'gradientWave' && <div className="chat-gradientwave" aria-hidden="true" />}

      <div className="chat-header">
        <div className="chat-header-title">
          <span className="chat-header-icon"><IconStudio /></span>
          <div>
            <h1 className="chat-title">{t('chat.title')}</h1>
            <p className="chat-sub">{t('chat.subtitle')}</p>
          </div>
        </div>
        <div className="chat-header-actions">
          <span className="chat-badge">{t('chat.badge')}</span>
          <button className="btn btn-ghost btn-sm chat-clear-btn" onClick={clearChat} disabled={streaming}>
            <IconRefresh /> <span>{t('chat.clearChat')}</span>
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {loadingHistory && <div className="chat-loading"><span className="spinner spinner--dark" /></div>}

        {!loadingHistory && isEmptyConversation && (
          <div className="chat-empty-state">
            <span className="chat-empty-icon"><IconStudio /></span>
            <h2>{t('chat.title')}</h2>
            <p>{messages[0].content}</p>
          </div>
        )}

        {!loadingHistory && !isEmptyConversation && messages.map(m => {
          if (m.type === 'speaking-form') {
            return (
              <div key={m.id} className="chat-tool-msg">
                <SpeakingPanel onResult={(data) => handleToolResult('speaking-result', data)} />
              </div>
            )
          }
          if (m.type === 'writing-result' || m.type === 'speaking-result') {
            return renderResultCard(m)
          }
          return (
            <div key={m.id} className={`chat-msg chat-msg--${m.role}`}>
              <div className="msg-avatar">
                {m.role === 'assistant' ? <IconStudio /> : <IconUser />}
              </div>
              <div className="msg-bubble">
                {m.images?.length > 0 && (
                  <div className="msg-images">
                    {m.images.map(img => <img key={img.id} src={img.previewUrl} alt="" />)}
                  </div>
                )}
                {m.evaluating ? (
                  <span className="spinner spinner--dark" />
                ) : m.role === 'assistant' ? (
                  <div className="msg-md">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content && <p>{m.content}</p>
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

      <div className="chat-composer">
        {attachments.length > 0 && (
          <div className="composer-attachments">
            {attachments.map(a => (
              <div key={a.id} className="composer-attachment">
                <img src={a.previewUrl} alt="" />
                <button onClick={() => removeAttachment(a.id)} aria-label="Remove attachment"><IconX /></button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          placeholder={composerPlaceholder}
          rows={1}
          disabled={streaming}
        />

        <div className="composer-toolbar">
          <button
            className="composer-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={composerBusy}
            aria-label={t('chat.attachFile')}
            title={t('chat.attachFile')}
          >
            <IconPlus />
          </button>

          <div className="composer-toolbar-right">
            <button
              className={`composer-icon-btn${recorder.status === 'recording' ? ' composer-icon-btn--recording' : ''}`}
              onClick={toggleRecording}
              disabled={transcribing}
              aria-label={t('chat.recordVoice')}
              title={t('chat.recordVoice')}
            >
              {recorder.status === 'recording' ? <span className="composer-rec-dot" /> : <IconSpeaking />}
              {micLabel && <span className="composer-rec-time">{micLabel}</span>}
            </button>
            <button
              className="chat-send-btn"
              onClick={() => send()}
              disabled={composerBusy || (!input.trim() && attachments.length === 0)}
              aria-label="Send message"
            >
              {streaming ? <span className="spinner" /> : <IconSend />}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={e => { handleFilesSelected(e.target.files); e.target.value = '' }}
        />
      </div>
    </div>
  )
}
