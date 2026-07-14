import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { evaluateSpeakingAudio, generateSpeakingTest } from '../../lib/groq'
import { blobToBase64, micErrorMessage } from '../../lib/ielts'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { ScoreCard } from '../../components/ScoreCard'
import './SpeakingPanel.css'

const MIN_RECORDING_SECONDS = 1

function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

const CRITERIA_KEYS = ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'pronunciation']

export default function SpeakingPanel({ onResult }) {
  const { t, lang } = useLanguage()
  const [testData, setTestData] = useState(null)
  const [loadingTest, setLoadingTest] = useState(false)
  const [genError, setGenError] = useState('')
  const [started, setStarted] = useState(false)
  const [partNum, setPartNum] = useState(1)
  const [qIdx, setQIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [prepTime, setPrepTime] = useState(0)
  const [evaluating, setEvaluating] = useState(false)
  const [evalError, setEvalError] = useState('')
  const [recordWarning, setRecordWarning] = useState('')
  const [result, setResult] = useState(null)
  const [silentReason, setSilentReason] = useState('')
  const recorder = useAudioRecorder()
  const prepRef = useRef(null)

  const part1List = testData?.part1.flatMap(topic => topic.questions.map(q => ({ topic: topic.topic, question: q }))) ?? []
  const part3List = testData?.part3 ?? []

  const current =
    partNum === 1 ? part1List[qIdx]
    : partNum === 2 ? { topic: testData?.part2.topic, question: testData?.part2.cueCard }
    : { topic: testData?.part2.topic, question: part3List[qIdx] }

  const partLabel = t('speaking.partLabels')[partNum - 1]
  const question = current?.question
  const topicLabel = current?.topic
  const isLastQuestionOfPart =
    partNum === 1 ? qIdx === part1List.length - 1
    : partNum === 2 ? true
    : qIdx === part3List.length - 1
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

  const begin = async () => {
    setLoadingTest(true)
    setGenError('')
    try {
      const data = await generateSpeakingTest()
      setTestData(data)
      setResult(null)
      setSilentReason('')
      setAnswers([])
      setStarted(true)
      setPartNum(1)
      setQIdx(0)
    } catch (err) {
      setGenError(err.message || t('speaking.genFailed'))
    } finally {
      setLoadingTest(false)
    }
  }

  const advance = async () => {
    if (!recorder.blob) return
    if (recorder.seconds < MIN_RECORDING_SECONDS) {
      setRecordWarning(t('speaking.tooShort'))
      recorder.reset()
      return
    }
    setRecordWarning('')
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
      const data = await evaluateSpeakingAudio({ answers: finalAnswers, language: lang })
      if (data.insufficient) {
        setSilentReason(data.insufficientReason)
      } else {
        setResult(data)
        onResult?.(data)
      }
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
      examples: result.criteria[key]?.examples,
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

  if (silentReason) {
    return (
      <div className="sp-card">
        <div className="sp-error">{silentReason}</div>
        <button className="btn btn-primary" onClick={begin}>{t('speaking.retakeTest')}</button>
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

  if (loadingTest) {
    return (
      <div className="sp-card sp-card--center">
        <span className="spinner spinner--dark" />
        <p>{t('speaking.preparingTest')}</p>
      </div>
    )
  }

  if (genError) {
    return (
      <div className="sp-card">
        <div className="sp-error">{genError}</div>
        <button className="btn btn-outline" onClick={begin}>{t('speaking.tryAgain')}</button>
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
            <span className="sp-question-label">{partLabel}{topicLabel ? ` · ${topicLabel}` : ''}</span>
            <p className="sp-question-text">{question}</p>
          </div>

          {recorder.error && <div className="sp-error">{micErrorMessage(t, recorder.error)}</div>}
          {recordWarning && <div className="sp-error">{recordWarning}</div>}

          <div className="sp-recorder">
            {recorder.status === 'idle' && (
              <button className="sp-record-btn" onClick={() => { setRecordWarning(''); recorder.start() }}>
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
