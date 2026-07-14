import { useEffect, useRef, useState, useCallback } from 'react'

const CANDIDATE_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  return CANDIDATE_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

export function useAudioRecorder() {
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
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('unsupported')
      return
    }
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
    } catch (err) {
      setError(err?.name === 'NotAllowedError' ? 'permission-denied' : err?.name === 'NotFoundError' ? 'no-device' : 'unsupported')
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
