import { useState } from 'react'
import { evaluateWriting } from '../../lib/gemini'
import './WritingCheck.css'

const TASK_TYPES = [
  { value: 'Academic Task 1', label: 'Academic Task 1 — Describe a graph/chart/map/process' },
  { value: 'Academic Task 2', label: 'Academic Task 2 — Essay / Argument / Discussion' },
  { value: 'General Training Task 1', label: 'General Training Task 1 — Letter writing' },
  { value: 'General Training Task 2', label: 'General Training Task 2 — Essay' },
]

const CRITERIA = [
  { key: 'taskAchievement', label: 'Task Achievement / Task Response' },
  { key: 'coherenceCohesion', label: 'Coherence & Cohesion' },
  { key: 'lexicalResource', label: 'Lexical Resource' },
  { key: 'grammaticalRange', label: 'Grammatical Range & Accuracy' },
]

function bandClass(score) {
  if (score >= 7) return 'band-high'
  if (score >= 5) return 'band-mid'
  return 'band-low'
}

function BandCircle({ score }) {
  const cls = bandClass(score)
  return <div className={`band-circle ${cls}`}>{score}</div>
}

export default function WritingCheck() {
  const [taskType, setTaskType] = useState(TASK_TYPES[1].value)
  const [prompt, setPrompt] = useState('')
  const [essay, setEssay] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!essay.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await evaluateWriting({ taskType, prompt, essay })
      setResult(data)
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your Gemini API key.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="writing-page">
      <div className="writing-header">
        <div>
          <h1 className="writing-title">Writing Checker</h1>
          <p className="writing-sub">Get instant AI band scores and feedback on your IELTS essay</p>
        </div>
        <span className="writing-badge">Powered by Gemini</span>
      </div>

      <form onSubmit={handleSubmit} className="writing-form">
        <div className="form-field">
          <label htmlFor="task-type">Task type</label>
          <select
            id="task-type"
            value={taskType}
            onChange={e => setTaskType(e.target.value)}
          >
            {TASK_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="prompt">
            Question / Prompt <span className="label-opt">(recommended for Task Achievement scoring)</span>
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            placeholder="Paste the IELTS question here…"
          />
        </div>

        <div className="form-field">
          <label htmlFor="essay">
            Your essay
            <span className="word-count">{wordCount} words</span>
          </label>
          <textarea
            id="essay"
            value={essay}
            onChange={e => setEssay(e.target.value)}
            rows={14}
            placeholder="Paste your essay here…"
            required
          />
        </div>

        {error && <div className="writing-error">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={loading || !essay.trim()}
        >
          {loading ? (
            <><span className="spinner" /> Analysing with AI…</>
          ) : (
            'Check my writing'
          )}
        </button>
      </form>

      {result && (
        <div id="results" className="results-section">
          <div className="results-header">
            <h2>Results</h2>
            <div className="overall-score">
              <span className="overall-label">Overall Band</span>
              <BandCircle score={result.overall} />
            </div>
          </div>

          <div className="criteria-grid">
            {CRITERIA.map(c => {
              const item = result.criteria[c.key]
              if (!item) return null
              return (
                <div key={c.key} className="criterion-card">
                  <div className="criterion-header">
                    <span className="criterion-label">{c.label}</span>
                    <span className={`criterion-score ${bandClass(item.score)}`}>
                      {item.score}
                    </span>
                  </div>
                  <div className="score-bar-wrap">
                    <div
                      className={`score-bar ${bandClass(item.score)}`}
                      style={{ width: `${(item.score / 9) * 100}%` }}
                    />
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
                {result.strengths.map((s, i) => (
                  <li key={i} className="result-item result-item--good">{s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.improvements?.length > 0 && (
            <div className="result-list-section">
              <h3>Areas for Improvement</h3>
              <ul>
                {result.improvements.map((s, i) => (
                  <li key={i} className="result-item result-item--improve">{s}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            className="btn btn-outline"
            onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          >
            Check another essay
          </button>
        </div>
      )}
    </div>
  )
}
