import { useState, useRef, useCallback } from 'react'
import './VoiceButton.css'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function VoiceButton({ onResult }) {
  const [state, setState] = useState('idle') // idle | listening | processing | error
  const [transcript, setTranscript] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const recogRef = useRef(null)

  const stop = useCallback(() => {
    recogRef.current?.stop()
    recogRef.current = null
  }, [])

  async function handleClick() {
    if (state === 'listening') {
      stop()
      return
    }
    if (state === 'processing') return

    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition not supported in this browser')
      setState('error')
      return
    }

    setTranscript('')
    setErrorMsg('')
    setState('listening')

    const recog = new SpeechRecognition()
    recogRef.current = recog
    recog.continuous = false
    recog.interimResults = false
    recog.lang = ''  // auto-detect language

    recog.onresult = async (e) => {
      const text = e.results[0][0].transcript
      setTranscript(text)
      setState('processing')

      try {
        const resp = await fetch('/api/parse-reservation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          throw new Error(err.error || `Server error ${resp.status}`)
        }
        const data = await resp.json()
        setState('idle')
        onResult({ ...data, _transcript: text })
      } catch (err) {
        setErrorMsg(err.message)
        setState('error')
      }
    }

    recog.onerror = (e) => {
      if (e.error === 'aborted') { setState('idle'); return }
      setErrorMsg(e.error === 'not-allowed' ? 'Microphone permission denied' : `Speech error: ${e.error}`)
      setState('error')
    }

    recog.onend = () => {
      if (recogRef.current === recog) recogRef.current = null
      setState(s => s === 'listening' ? 'idle' : s)
    }

    recog.start()
  }

  function dismiss() {
    setState('idle')
    setErrorMsg('')
    setTranscript('')
  }

  if (!SpeechRecognition) return null

  return (
    <div className="voice-fab-wrap">
      {state === 'processing' && transcript && (
        <div className="voice-processing-bubble">
          <span className="voice-spinner" />
          <span className="voice-bubble-text">"{transcript}"</span>
        </div>
      )}
      {state === 'error' && (
        <div className="voice-error-bubble">
          <span>{errorMsg}</span>
          <button className="voice-dismiss" onClick={dismiss}>×</button>
        </div>
      )}
      <button
        className={`voice-fab state-${state}`}
        onClick={handleClick}
        title={state === 'listening' ? 'Tap to stop' : 'Voice reservation'}
        aria-label={state === 'listening' ? 'Stop listening' : 'Start voice reservation'}
      >
        {state === 'processing' ? (
          <span className="voice-fab-spinner" />
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21h-2v2h6v-2h-2v-2.07A8 8 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z"/>
          </svg>
        )}
      </button>
      {state === 'listening' && (
        <span className="voice-fab-label">Listening… tap to stop</span>
      )}
    </div>
  )
}
