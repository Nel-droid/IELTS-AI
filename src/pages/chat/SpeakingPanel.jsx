import { useEffect, useRef, useState, useCallback } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { evaluateSpeakingAudio } from '../../lib/groq'
import { blobToBase64 } from '../../lib/ielts'
import { ScoreCard } from '../../components/ScoreCard'
import './SpeakingPanel.css'

const PART_QUESTIONS = {
  1: [
    "Let's talk about your hometown. Can you describe it for me?",
    "What do you like most about living there?",
    "Do you prefer to spend your free time indoors or outdoors? Why?",
    "How do you usually spend your weekends?",
  ],
  2: [
    `Describe a time when you helped someone.
You should say:
• who you helped
• what you did to help them
• why they needed help
And explain how you felt about helping this person.`,
  ],
  3: [
    "Why do you think some people are more willing to help others than others?",
    "In what ways can a society encourage people to help each other more?",
    "How has the way people help each other changed compared to the past?",
  ],
}

const CANDIDATE_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  return CANDIDATE_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

function useAudioRecorder() {
  const [status, setStatus] = useState('idle') // idle | recording | recorded
  const [seconds, setSeconds] = useState(0)
  const [blob, setBlob] = useState(null)
  const [mimeType, setMimeType] = useState('')
  const [error, setError] = useState('')
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  const start = useCallback(async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const type = pickMimeType()
      const recorder = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const finalType = recorder.mimeType || type || 'audio/webm'
        setBlob(new Blob(chunksRef.current, { type: finalType }))
        setMimeType(finalType)
        setStatus('recorded')
        streamRef.current?.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setStatus('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      setError('mic-denied')
    }
  }, [])

  const stop = useCallback(() => {
    clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    clearInterval(timerRef.current)
    setStatus('idle')
    setBlob(null)
    setSeconds(0)
  }, [])

  useEffect(() => () => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  return { status, seconds, blob, mimeType, error, start, stop, reset }
}

function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

const CRITERIA_KEYS = ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'pronunciation']

export default function SpeakingPanel({ onResult }) {
  const { t } = useLanguage()
  const [started, setStarted] = useState(false)
  const [partNum, setPartNum] = useState(1)
  const [qIdx, setQIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [prepTime, setPrepTime] = useState(0)
  const [evaluating, setEvaluating] = useState(false)
  const [evalError, setEvalError] = useState('')
  const [result, setResult] = useState(null)
  const recorder = useAudioRecorder()
  const prepRef = useRef(null)

  const partLabel = t('speaking.partLabels')[partNum - 1]
  const question = PART_QUESTIONS[partNum][qIdx]
  const isLastQuestionOfPart = qIdx === PART_QUESTIONS[partNum].length - 1
  const isFinalQuestion = partNum === 3 && isLastQuestionOfPart

  const startPart2Prep = () => {
    setPrepTime(60)
    prepRef.current = setInterval(() => {
      setPrepTime(p => {
        if (p <= 1) { clearInterval(prepRef.current); return 0 }
        return p - 1
      })
    }, 1000)
  }

  const begin = () => {
    setStarted(true)
    setPartNum(1)
    setQIdx(0)
  }

  const advance = async () => {
    if (!recorder.blob) return
    const audioBase64 = await blobToBase64(recorder.blob)
    const newAnswer = { partLabel, question, audioBase64, mimeType: recorder.mimeType }
    const nextAnswers = [...answers, newAnswer]
    setAnswers(nextAnswers)
    recorder.reset()

    if (isFinalQuestion) {
      runEvaluation(nextAnswers)
      return
    }

    if (isLastQuestionOfPart) {
      const nextPart = partNum + 1
      setPartNum(nextPart)
      setQIdx(0)
      if (nextPart === 2) startPart2Prep()
    } else {
      setQIdx(qIdx + 1)
    }
  }

  const runEvaluation = async (finalAnswers) => {
    setEvaluating(true)
    setEvalError('')
    try {
      const data = await evaluateSpeakingAudio({ answers: finalAnswers })
      setResult(data)
      onResult?.(data)
    } catch (err) {
      setEvalError(err.message || t('speaking.evalFailed'))
    } finally {
      setEvaluating(false)
    }
  }

  useEffect(() => () => clearInterval(prepRef.current), [])

  if (result) {
    const criteriaLabels = t('speaking.criteria')
    const criteria = CRITERIA_KEYS.map((key, i) => ({
      key,
      label: criteriaLabels[i],
      score: result.criteria[key]?.score,
      feedback: result.criteria[key]?.feedback,
    })).filter(c => c.score != null)

    return (
      <div className="sp-card">
        <ScoreCard
          criteria={criteria}
          strengths={result.strengths}
          improvements={result.improvements}
          overallLabel={t('speaking.overallBand')}
          strengthsLabel={t('speaking.strengths')}
          improvementsLabel={t('speaking.improvements')}
        />
      </div>
    )
  }

  if (evaluating) {
    return (
      <div className="sp-card sp-card--center">
        <span className="spinner spinner--dark" />
        <p>{t('speaking.evaluating')}</p>
      </div>
    )
  }

  if (evalError) {
    return (
      <div className="sp-card">
        <div className="sp-error">{evalError}</div>
        <button className="btn btn-outline" onClick={() => runEvaluation(answers)}>{t('speaking.tryAgain')}</button>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="sp-card">
        <p className="sp-intro">{t('speaking.chatIntro')}</p>
        <ul className="sp-intro-list">
          <li>{t('speaking.tip1')}</li>
          <li>{t('speaking.tip2')}</li>
          <li>{t('speaking.tip3')}</li>
        </ul>
        <button className="btn btn-primary" onClick={begin}>🎤 {t('speaking.startExam')}</button>
      </div>
    )
  }

  const inPrep = partNum === 2 && qIdx === 0 && prepTime > 0

  return (
    <div className="sp-card">
      <div className="sp-progress">
        {[1, 2, 3].map(n => (
          <span key={n} className={`sp-step${n === partNum ? ' sp-step--active' : ''}${n < partNum ? ' sp-step--done' : ''}`}>
            {t('speaking.partShort', { n })}
          </span>
        ))}
      </div>

      {inPrep ? (
        <div className="sp-prep">
          <div className="sp-prep-timer">{fmt(prepTime)}</div>
          <p className="sp-prep-label">{t('speaking.prepInstructions')}</p>
          <pre className="sp-prep-topic">{question}</pre>
          <button className="btn btn-ghost btn-sm" onClick={() => { clearInterval(prepRef.current); setPrepTime(0) }}>
            {t('speaking.readyBtn')}
          </button>
        </div>
      ) : (
        <>
          <div className="sp-question">
            <span className="sp-question-label">{partLabel}</span>
            <p className="sp-question-text">{question}</p>
          </div>

          {recorder.error && <div className="sp-error">{t('speaking.micNotSupported')}</div>}

          <div className="sp-recorder">
            {recorder.status === 'idle' && (
              <button className="sp-record-btn" onClick={recorder.start}>
                <span className="sp-record-dot" /> {t('speaking.recordAnswer')}
              </button>
            )}
            {recorder.status === 'recording' && (
              <button className="sp-record-btn sp-record-btn--active" onClick={recorder.stop}>
                <span className="sp-record-dot sp-record-dot--pulse" /> {fmt(recorder.seconds)} · {t('speaking.stopRecording')}
              </button>
            )}
            {recorder.status === 'recorded' && recorder.blob && (
              <div className="sp-playback">
                <audio controls src={URL.createObjectURL(recorder.blob)} />
                <div className="sp-playback-actions">
                  <button className="btn btn-ghost btn-sm" onClick={recorder.reset}>{t('speaking.reRecord')}</button>
                  <button className="btn btn-primary btn-sm" onClick={advance}>
                    {isFinalQuestion ? t('speaking.finishAndScore') : t('speaking.sendAnswer')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
