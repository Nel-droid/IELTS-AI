// Official IELTS overall-band rounding: average the whole-number criteria,
// then round UP to the nearest half band (.25 -> .5, .75 -> next whole).
export function computeOverallBand(scores) {
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  return Math.ceil(avg * 2) / 2
}

export function bandTier(score) {
  if (score >= 7) return 'high'
  if (score >= 5) return 'mid'
  return 'low'
}

export function bandClass(score) {
  return `band-${bandTier(score)}`
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function blobToBase64(blob) {
  return fileToBase64(blob)
}

// Maps a useAudioRecorder() error code to the right translated message,
// since "permission denied" and "no microphone" need different instructions
// than a genuinely unsupported browser.
export function micErrorMessage(t, code) {
  if (code === 'permission-denied') return t('speaking.micPermissionDenied')
  if (code === 'no-device') return t('speaking.micNoDevice')
  return t('speaking.micNotSupported')
}
