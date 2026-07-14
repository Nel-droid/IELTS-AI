import { bandTier, computeOverallBand } from '../lib/ielts'
import './ScoreCard.css'

export function ScoreCard({ criteria, strengths, improvements, overallLabel, strengthsLabel, improvementsLabel }) {
  const overall = computeOverallBand(criteria.map(c => c.score))
  const overallTier = bandTier(overall)
  const ringPct = Math.min(100, Math.max(0, (overall / 9) * 100))

  return (
    <div className="score-card">
      <div className="score-hero">
        <div
          className={`score-hero-ring band-ring-${overallTier}`}
          style={{ '--ring-pct': `${ringPct}%` }}
        >
          <div className={`score-hero-circle band-fill-${overallTier}`}>{overall}</div>
        </div>
        <span className="score-hero-label">{overallLabel}</span>
      </div>

      <div className="score-criteria">
        {criteria.map(c => {
          const tier = bandTier(c.score)
          return (
            <div className="score-criterion" key={c.key}>
              <div className="score-criterion-top">
                <span className={`score-dot band-dot-${tier}`} aria-hidden="true" />
                <span className="score-criterion-label">{c.label}</span>
                <span className="score-criterion-value">{c.score}</span>
              </div>
              <div className={`score-meter-track band-track-${tier}`}>
                <div className={`score-meter-fill band-fill-${tier}`} style={{ width: `${(c.score / 9) * 100}%` }} />
              </div>
              {c.feedback && <p className="score-criterion-feedback">{c.feedback}</p>}
              {c.examples?.length > 0 && (
                <ul className="score-criterion-examples">
                  {c.examples.map((ex, i) => (
                    <li key={i}><span className="sc-quote">"{ex.quote}"</span> — {ex.issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {strengths?.length > 0 && (
        <div className="score-list-section">
          <h4>{strengthsLabel}</h4>
          <ul>
            {strengths.map((s, i) => <li key={i} className="score-list-item score-list-item--good">{s}</li>)}
          </ul>
        </div>
      )}

      {improvements?.length > 0 && (
        <div className="score-list-section">
          <h4>{improvementsLabel}</h4>
          <ul>
            {improvements.map((s, i) => <li key={i} className="score-list-item score-list-item--improve">{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
