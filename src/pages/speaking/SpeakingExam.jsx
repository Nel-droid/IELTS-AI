import { useState, useRef, useEffect, useCallback } from 'react'
import { evaluateSpeaking } from '../../lib/gemini'
import './SpeakingExam.css'

const PARTS = {
  1: {
    label: 'Part 1',
    title: 'Introduction & Interview',
    desc: '4–5 minutes · The examiner asks you questions about yourself and familiar topics.',
    questions: [
      "Let's talk about your hometown. Can you describe it for me?",
      "What do you like most about living there?",
      "Do you prefer to spend your free time indoors or outdoors? Why?",
      "How do you usually spend your weekends?",
      "Do you think you'll stay in your hometown in the future, or would you like to move somewhere else?",
    ],
  },
  2: {
    label: 'Part 2',
    title: 'Individual Long Turn',
    desc: '3–4 minutes · You have 1 minute to prepare, then speak for up to 2 minutes.',
    prepTime: 60,
    talkTime: 120,
    questions: [
      `Describe a time when you helped someone.
You should say:
• who you helped
• what you did to help them
• why they needed help
And explain how you felt about helping this person.`,
    ],
  },
  3: {
    label: 'Part 3',
    title: 'Two-way Discussion',
    desc: '4–5 minutes · The examiner asks more abstract discussion questions linked to Part 2.',
    questions: [
      "Why do you think some people are more willing to help others than others?",
      "In what ways can a society encourage people to help each other more?",
      "How has the way people help each other changed compared to the past?",
      "Do you think technology has made it easier or harder for people to help others? In what ways?",
    ],
  },
}

const STATUS = {
  idle: 'idle',
  intro: 'intro',
  prep: 'prep',
  speaking: 'speaking',
  done: 'done',
  results: 'results',
}

function speak(text, onEnd) {
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-GB'
  u.rate = 0.92
  u.pitch = 1
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
    || voices.find(v => v.lang.startsWith('en-GB'))
    || voices.find(v => v.lang.startsWith('en'))
  if (preferred) u.voice = preferred
  if (onEnd) u.onend = onEnd
  window.speechSynthesis.speak(u)
}

function useTimer(initial, onZero) {
  const [time, setTime] = useState(initial)
  const ref = useRef(null)

  const start = useCallback(() => {
    setTime(initial)
    ref.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) { clearInterval(ref.current); onZero?.(); return 0 }
        return t - 1
      })
    }, 1000)
  }, [initial, onZero])

  const stop = useCallback(() => { clearInterval(ref.current) }, [])

  useEffect(() => () => clearInterval(ref.current), [])

  return { time, start, stop }
}

function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

function bandClass(score) {
  if (score >= 7) return 'band-high'
  if (score >= 5) return 'band-mid'
  return 'band-low'
}

const SPEAKING_CRITERIA = [
  { key: 'fluencyCoherence', label: 'Fluency & Coherence' },
  { key: 'lexicalResource', label: 'Lexical Resource' },
  { key: 'grammaticalRange', label: 'Grammatical Range & Accuracy' },
  { key: 'pronunciation', label: 'Pronunciation' },
]

export default function SpeakingExam() {
  const [partNum, setPartNum] = useState(1)
  const [status, setStatus] = useState(STATUS.idle)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [qIdx, setQIdx] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [micError, setMicError] = useState('')

  const part = PARTS[partNum]
  const recognitionRef = useRef(null)
  const answeredQuestions = useRef([])

  const prepTimer = useTimer(part.prepTime ?? 0, () => beginSpeaking())
  const talkTimer = useTimer(part.talkTime ?? 300, () => stopRecording())

  const startRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setMicError('Speech recognition is not supported in this browser. Please use Chrome or Edge.'); return false }
    const r = new SR()
    r.lang = 'en-US'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let final = ''
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      if (final) setTranscript(t => t + final)
      setInterimText(interim)
    }
    r.onerror = (e) => {
      if (e.error !== 'no-speech') setMicError(`Microphone error: ${e.error}`)
    }
    r.start()
    recognitionRef.current = r
    return true
  }, [])

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setInterimText('')
  }, [])

  const beginSpeaking = useCallback(() => {
    setStatus(STATUS.speaking)
    startRecognition()
    if (partNum === 2) {
      talkTimer.start()
    }
  }, [partNum, startRecognition, talkTimer])

  const stopRecording = useCallback(() => {
    stopRecognition()
    talkTimer.stop()
    if (partNum === 2) {
      setStatus(STATUS.done)
    } else {
      const nextIdx = qIdx + 1
      if (nextIdx < part.questions.length) {
        setQIdx(nextIdx)
        speak(part.questions[nextIdx], beginSpeaking)
        setStatus(STATUS.speaking)
      } else {
        setStatus(STATUS.done)
      }
    }
  }, [stopRecognition, talkTimer, partNum, qIdx, part.questions, beginSpeaking])

  const startExam = () => {
    setTranscript('')
    setInterimText('')
    setQIdx(0)
    setResult(null)
    setError('')
    setMicError('')
    answeredQuestions.current = []

    setStatus(STATUS.intro)
    const intro = `Welcome to the IELTS Speaking exam. ${part.title}. ${part.desc}. Let's begin.`
    speak(intro, () => {
      if (partNum === 2) {
        setStatus(STATUS.prep)
        speak(`Here is your topic. ${part.questions[0]}. You have one minute to prepare.`, () => {
          prepTimer.start()
        })
      } else {
        setStatus(STATUS.speaking)
        speak(part.questions[0], beginSpeaking)
      }
    })
  }

  const handleNextQuestion = () => {
    stopRecognition()
    const nextIdx = qIdx + 1
    if (nextIdx < part.questions.length) {
      setQIdx(nextIdx)
      speak(part.questions[nextIdx], () => { startRecognition() })
    } else {
      setStatus(STATUS.done)
    }
  }

  const handleEvaluate = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await evaluateSpeaking({
        part: `Part ${partNum}: ${part.title}`,
        questions: part.questions,
        transcript: transcript.trim() || '(No speech detected)',
      })
      setResult(data)
      setStatus(STATUS.results)
    } catch (err) {
      setError(err.message || 'Evaluation failed. Check your API key.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    window.speechSynthesis.cancel()
    stopRecognition()
    prepTimer.stop()
    talkTimer.stop()
    setStatus(STATUS.idle)
    setTranscript('')
    setInterimText('')
    setQIdx(0)
    setResult(null)
    setError('')
  }

  const stopRecordingManual = () => {
    stopRecognition()
    talkTimer.stop()
    setStatus(STATUS.done)
  }

  return (
    <div className="speaking-page">
      <div className="speaking-header">
        <div>
          <h1 className="speaking-title">Speaking Practice</h1>
          <p className="speaking-sub">Real IELTS Speaking exam format with AI examiner and evaluation</p>
        </div>
        <span className="speaking-badge">Speech AI</span>
      </div>

      {status === STATUS.idle && (
        <div className="speaking-setup">
          <div className="part-selector">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                className={`part-btn${partNum === n ? ' part-btn--active' : ''}`}
                onClick={() => setPartNum(n)}
              >
                <span className="part-btn-label">{PARTS[n].label}</span>
                <span className="part-btn-title">{PARTS[n].title}</span>
              </button>
            ))}
          </div>

          <div className="part-info-card">
            <h2>{part.label}: {part.title}</h2>
            <p className="part-info-desc">{part.desc}</p>
            <div className="part-questions-preview">
              <p className="preview-label">Sample questions:</p>
              <ul>
                {part.questions.slice(0, 2).map((q, i) => (
                  <li key={i}>{q.split('\n')[0]}</li>
                ))}
                {part.questions.length > 2 && <li className="preview-more">+{part.questions.length - 2} more…</li>}
              </ul>
            </div>
          </div>

          {micError && <div className="speaking-error">{micError}</div>}

          <div className="speaking-tips">
            <p><strong>Before you start:</strong></p>
            <ul>
              <li>Allow microphone access when prompted by your browser</li>
              <li>Speak clearly in English — the AI examiner will speak first</li>
              <li>Use Chrome or Edge for best speech recognition</li>
            </ul>
          </div>

          <button className="btn btn-primary btn-lg" onClick={startExam}>
            🎤 Start Speaking Exam
          </button>
        </div>
      )}

      {(status === STATUS.intro) && (
        <div className="speaking-status-card">
          <div className="status-icon">🎙️</div>
          <h2>Exam starting…</h2>
          <p>The AI examiner is speaking. Please wait.</p>
          <div className="sound-wave">
            {[...Array(5)].map((_, i) => <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />)}
          </div>
        </div>
      )}

      {status === STATUS.prep && (
        <div className="speaking-status-card">
          <div className="status-icon">⏱️</div>
          <h2>Preparation Time</h2>
          <div className="big-timer">{fmt(prepTimer.time)}</div>
          <p>Read the topic and make notes. You'll speak when the timer ends.</p>
          <div className="prep-topic">
            <pre className="prep-topic-text">{part.questions[0]}</pre>
          </div>
          <button className="btn btn-primary" onClick={beginSpeaking}>
            I'm ready — Start speaking now
          </button>
        </div>
      )}

      {status === STATUS.speaking && (
        <div className="speaking-live">
          <div className="live-header">
            <span className="live-badge">🔴 Recording</span>
            {partNum === 2 && <span className="live-timer">{fmt(talkTimer.time)}</span>}
          </div>

          <div className="examiner-question">
            <span className="eq-label">Examiner</span>
            <p className="eq-text">{part.questions[qIdx]}</p>
          </div>

          <div className="transcript-box">
            <p className="tb-label">Your response</p>
            <div className="tb-text">
              {transcript}
              {interimText && <span className="interim">{interimText}</span>}
              {!transcript && !interimText && <span className="tb-placeholder">Start speaking…</span>}
            </div>
          </div>

          <div className="speaking-controls">
            {partNum !== 2 && qIdx < part.questions.length - 1 && (
              <button className="btn btn-ghost" onClick={handleNextQuestion}>
                Next question →
              </button>
            )}
            <button className="btn btn-danger" onClick={stopRecordingManual}>
              ■ Stop recording
            </button>
          </div>
        </div>
      )}

      {status === STATUS.done && (
        <div className="speaking-done">
          <div className="done-icon">✅</div>
          <h2>Recording complete</h2>

          <div className="final-transcript">
            <p className="ft-label">Your full transcript</p>
            <p className="ft-text">{transcript || '(No speech detected)'}</p>
          </div>

          {error && <div className="speaking-error">{error}</div>}

          <div className="done-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleEvaluate}
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> Evaluating…</> : '✨ Get AI Evaluation'}
            </button>
            <button className="btn btn-ghost" onClick={reset}>
              Try again
            </button>
          </div>
        </div>
      )}

      {status === STATUS.results && result && (
        <div className="speaking-results">
          <div className="results-top">
            <h2>Speaking Results</h2>
            <div className="overall-score">
              <span className="overall-label">Overall Band</span>
              <div className={`band-circle ${bandClass(result.overall)}`}>{result.overall}</div>
            </div>
          </div>

          <div className="criteria-grid">
            {SPEAKING_CRITERIA.map(c => {
              const item = result.criteria[c.key]
              if (!item) return null
              return (
                <div key={c.key} className="criterion-card">
                  <div className="criterion-header">
                    <span className="criterion-label">{c.label}</span>
                    <span className={`criterion-score ${bandClass(item.score)}`}>{item.score}</span>
                  </div>
                  <div className="score-bar-wrap">
                    <div className={`score-bar ${bandClass(item.score)}`} style={{ width: `${(item.score / 9) * 100}%` }} />
                  </div>
                  <p className="criterion-feedback">{item.feedback}</p>
                </div>
              )
            })}
          </div>

          {result.strengths?.length > 0 && (
            <div className="result-list-section">
              <h3>Strengths</h3>
              <ul>
                {result.strengths.map((s, i) => <li key={i} className="result-item result-item--good">{s}</li>)}
              </ul>
            </div>
          )}

          {result.improvements?.length > 0 && (
            <div className="result-list-section">
              <h3>Areas for Improvement</h3>
              <ul>
                {result.improvements.map((s, i) => <li key={i} className="result-item result-item--improve">{s}</li>)}
              </ul>
            </div>
          )}

          <button className="btn btn-outline" onClick={reset}>Practice again</button>
        </div>
      )}
    </div>
  )
}
