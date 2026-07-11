import { useRef, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { evaluateWritingMultimodal } from '../../lib/groq'
import { fileToBase64 } from '../../lib/ielts'
import { ScoreCard } from '../../components/ScoreCard'
import './WritingPanel.css'

const TASK_TYPE_VALUES = ['Academic Task 1', 'Academic Task 2', 'General Training Task 1', 'General Training Task 2']
const CRITERIA_KEYS = ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange']

function ImageDropzone({ label, files, onFiles, onRemove }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (fileList) => {
    const imgs = Array.from(fileList).filter(f => f.type.startsWith('image/'))
    if (imgs.length) onFiles(imgs)
  }

  return (
    <div className="wp-field">
      <label>{label}</label>
      <div
        className={`wp-dropzone${dragOver ? ' wp-dropzone--over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onPaste={e => handleFiles(e.clipboardData.files)}
        tabIndex={0}
        role="button"
      >
        {files.length === 0 ? (
          <span className="wp-dropzone-hint">📷 Drop, paste, or click to upload</span>
        ) : (
          <div className="wp-thumbs">
            {files.map((f, i) => (
              <div className="wp-thumb" key={i}>
                <img src={URL.createObjectURL(f)} alt="" />
                <button
                  type="button"
                  className="wp-thumb-remove"
                  onClick={e => { e.stopPropagation(); onRemove(i) }}
                  aria-label="Remove image"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}

export default function WritingPanel({ onResult }) {
  const { t } = useLanguage()
  const [taskType, setTaskType] = useState(TASK_TYPE_VALUES[1])
  const [promptText, setPromptText] = useState('')
  const [promptFiles, setPromptFiles] = useState([])
  const [essayText, setEssayText] = useState('')
  const [essayFiles, setEssayFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const taskTypeLabels = t('writing.taskTypes')
  const criteriaLabels = t('writing.criteria')
  const canSubmit = essayText.trim() || essayFiles.length > 0

  const handleSubmit = async () => {
    if (!canSubmit || loading) return
    setLoading(true)
    setError('')
    try {
      const [promptImages, essayImages] = await Promise.all([
        Promise.all(promptFiles.map(async f => ({ mimeType: f.type, base64: await fileToBase64(f) }))),
        Promise.all(essayFiles.map(async f => ({ mimeType: f.type, base64: await fileToBase64(f) }))),
      ])
      const data = await evaluateWritingMultimodal({
        taskType,
        promptText: promptText.trim(),
        promptImages,
        essayText: essayText.trim(),
        essayImages,
      })
      setResult(data)
      onResult?.(data)
    } catch (err) {
      setError(err.message || t('writing.errorFallback'))
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const criteria = CRITERIA_KEYS.map((key, i) => ({
      key,
      label: criteriaLabels[i],
      score: result.criteria[key]?.score,
      feedback: result.criteria[key]?.feedback,
    })).filter(c => c.score != null)

    return (
      <div className="wp-card">
        <ScoreCard
          criteria={criteria}
          strengths={result.strengths}
          improvements={result.improvements}
          overallLabel={t('writing.overallBand')}
          strengthsLabel={t('writing.strengths')}
          improvementsLabel={t('writing.improvements')}
        />
      </div>
    )
  }

  return (
    <div className="wp-card">
      <div className="wp-field">
        <label>{t('writing.taskType')}</label>
        <select value={taskType} onChange={e => setTaskType(e.target.value)}>
          {TASK_TYPE_VALUES.map((value, i) => (
            <option key={value} value={value}>{taskTypeLabels[i]}</option>
          ))}
        </select>
      </div>

      <div className="wp-grid">
        <div className="wp-col">
          <ImageDropzone
            label={t('writing.promptImageLabel')}
            files={promptFiles}
            onFiles={files => setPromptFiles(prev => [...prev, ...files])}
            onRemove={i => setPromptFiles(prev => prev.filter((_, idx) => idx !== i))}
          />
          <textarea
            className="wp-textarea"
            rows={3}
            placeholder={t('writing.placeholderPrompt')}
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
          />
        </div>

        <div className="wp-col">
          <ImageDropzone
            label={t('writing.essayImageLabel')}
            files={essayFiles}
            onFiles={files => setEssayFiles(prev => [...prev, ...files])}
            onRemove={i => setEssayFiles(prev => prev.filter((_, idx) => idx !== i))}
          />
          <textarea
            className="wp-textarea"
            rows={6}
            placeholder={t('writing.placeholderEssay')}
            value={essayText}
            onChange={e => setEssayText(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="wp-error">{error}</div>}

      <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit || loading}>
        {loading ? <><span className="spinner" /> {t('writing.analyzing')}</> : t('writing.submit')}
      </button>
    </div>
  )
}
