import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  VolumeX,
  Send,
  ArrowRight,
  Square,
  Search,
} from 'lucide-react'
import { voiceService, type VoiceCommandResponse } from '../../services/voice'
import { offlineSync } from '../../services/offlineSync'
import { useToast } from '../ui/Toast'

interface VoiceCommandBarProps {
  onActionCompleted?: () => void
  triggerOpen?: boolean
  triggerListening?: boolean // backward compatibility
  onResetTrigger?: () => void
}

export function VoiceCommandBar({
  onActionCompleted,
  triggerOpen,
  triggerListening,
  onResetTrigger,
}: VoiceCommandBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, setState] = useState<'idle' | 'listening' | 'processing' | 'result' | 'error'>('idle')
  const [inputMode, setInputMode] = useState<'voice' | 'typed' | null>(null)
  const [transcript, setTranscript] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [response, setResponse] = useState<VoiceCommandResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [talkBackEnabled, setTalkBackEnabled] = useState(true)
  const [continuousVoice] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const recognitionRef = useRef<any>(null)
  const stateRef = useRef(state)
  const continuousVoiceRef = useRef(continuousVoice)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    continuousVoiceRef.current = continuousVoice
  }, [continuousVoice])

  // Open modal without auto-starting talk mode
  useEffect(() => {
    if (triggerOpen || triggerListening) {
      setIsOpen(true)
      onResetTrigger?.()
    }
  }, [triggerOpen, triggerListening])

  const speak = (textToSpeak: string, onDone?: () => void) => {
    if (!talkBackEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      onDone?.()
      return
    }
    try {
      window.speechSynthesis.cancel()
      setIsSpeaking(true)
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.lang = 'en-US'
      utterance.onend = () => {
        setIsSpeaking(false)
        onDone?.()
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
        onDone?.()
      }
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      console.warn('Speech synthesis error:', e)
      setIsSpeaking(false)
      onDone?.()
    }
  }

  // Explicitly started ONLY when the user clicks the microphone button
  const startListening = () => {
    setIsOpen(true)
    setInputMode('voice')
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)

    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setState('processing')
      toast('Speech recognition not supported in this browser. You can type commands below.', 'info')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setState('listening')
        setTranscript('')
        setResponse(null)
        setErrorMsg('')
      }

      recognition.onresult = (event: any) => {
        const current = event.results[0][0].transcript
        setTranscript(current)
      }

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event.error)
        if (event.error === 'no-speech') {
          setState('idle')
        } else {
          setState('error')
          setErrorMsg('Microphone error')
        }
      }

      recognition.onend = () => {
        if (transcript.trim()) {
          processTranscript(transcript, 'voice')
        } else {
          setState('idle')
        }
      }

      recognition.start()
    } catch (err: any) {
      setState('error')
      setErrorMsg(err.message || 'Failed to start microphone')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setState('idle')
  }

  const concludeConversation = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setIsSpeaking(false)
    setState('idle')
    setResponse(null)
    setTranscript('')
    setManualInput('')
    setInputMode(null)
  }

  const isConclusionPhrase = (text: string) =>
    /^(?:done|thank you|thanks|bye|goodbye|stop|close|exit|that's all|that is all|cancel|no thanks|all good|end conversation|finish)\b/i.test(
      text.trim()
    )

  const processTranscript = async (text: string, mode: 'voice' | 'typed' = 'voice') => {
    const clean = text.trim()
    if (!clean) return
    setTranscript(clean)
    setInputMode(mode)

    // Check if voice user explicitly concluded conversation
    if (mode === 'voice' && isConclusionPhrase(clean)) {
      const farewell = "You're all set! Let me know if you need anything else."
      setResponse({
        intent: 'CONCLUDE',
        confidence: 1,
        provider: 'ai-assistant',
        kind: 'result',
        resultText: farewell,
        speechText: farewell,
      })
      setState('result')
      speak(farewell, () => {
        setTimeout(() => {
          if (stateRef.current !== 'idle') {
            closeOverlay()
          }
        }, 1200)
      })
      return
    }

    // Handle offline scenario gracefully
    if (!navigator.onLine) {
      setState('processing')
      let feedback = ''
      if (/^(?:diary|write diary|log diary)\b/i.test(clean)) {
        const content = clean.replace(/^(?:diary:?|write diary|log diary)\s*/i, '') || 'Voice journal note'
        offlineSync.queueDiaryEntry({ title: 'Offline Reflection', content, mood: 'productive' })
        feedback = 'Diary entry saved offline. It will automatically sync when you are back online.'
        setResponse({ intent: 'LOG_DIARY', confidence: 1, provider: 'offline', executed: true, executionMessage: feedback, speechText: feedback })
      } else if (/^(?:add task|create todo|todo)\b/i.test(clean)) {
        const title = clean.replace(/^(?:add task|create todo|todo:?)\s*/i, '') || 'New task'
        offlineSync.queueTodo({ title, priority: 'medium' })
        feedback = `Added task ${title} offline. Will sync when online.`
        setResponse({ intent: 'CREATE_TODO', confidence: 1, provider: 'offline', executed: true, executionMessage: feedback, speechText: feedback })
      } else if (/^(?:log workout|workout)\b/i.test(clean)) {
        const name = clean.replace(/^(?:log workout|workout:?)\s*/i, '') || 'Workout'
        offlineSync.queueWorkout({ name, durationMin: 30, totalCaloriesBurned: 200 })
        feedback = `Logged workout ${name} offline. Will sync when online.`
        setResponse({ intent: 'LOG_WORKOUT', confidence: 1, provider: 'offline', executed: true, executionMessage: feedback, speechText: feedback })
      } else {
        feedback = 'You are currently offline. Basic commands are queued locally.'
        setResponse({ intent: 'UNKNOWN', confidence: 0.5, provider: 'offline', executionMessage: feedback, speechText: feedback })
      }
      setState('result')
      if (mode === 'voice') {
        speak(feedback)
      }
      return
    }

    try {
      setState('processing')
      const res = await voiceService.sendCommand(clean)
      setResponse(res)
      setState('result')

      const feedbackText = res.speechText || res.executionMessage || res.resultText || res.previewText || 'Command processed.'

      if (mode === 'voice') {
        // Voice mode: speak feedback aloud and keep conversation going until user concludes
        speak(feedbackText, () => {
          if (res.kind === 'navigate') {
            return
          }
          // Continuous Voice Loop: auto-listen for follow-up reply only if in voice dialogue mode
          if (continuousVoiceRef.current && stateRef.current !== 'idle') {
            setTimeout(() => {
              if (stateRef.current !== 'idle') {
                startListening()
              }
            }, 400)
          }
        })
      } else {
        // Typed mode: Purely silent in UI, NO speech synthesis
      }

      if (res.kind === 'navigate') {
        const routeMap: Record<string, string> = {
          diary: '/diary',
          fitness: '/fitness',
          'workout-planner': '/fitness/planner',
          todo: '/todo',
          'body-scan': '/body-scan',
          dashboard: '/',
          ai: '/fitness',
          expenses: '/expenses',
          settings: '/settings',
          reports: '/expenses',
        }
        const targetPath = routeMap[res.route || ''] || '/expenses'
        navigate(targetPath)
        toast(res.resultText || `Navigating to ${res.route}...`, 'info')
      } else if (res.executed && res.executionMessage) {
        toast(res.executionMessage, 'success')
        onActionCompleted?.()
      } else if (res.kind === 'result' && res.resultText) {
        toast(res.resultText, 'info')
      }
    } catch (err: any) {
      setState('error')
      setErrorMsg(err.message || 'Failed to process request')
    }
  }

  const handleConfirmAction = async (confirmed: boolean) => {
    if (!response?.serverCommandId) return
    try {
      setIsConfirming(true)
      const res = await voiceService.confirmAction(response.serverCommandId, confirmed)
      if (res.executed) {
        const msg = res.message || 'Action executed.'
        toast(msg, 'success')
        if (inputMode === 'voice') speak(msg)
        onActionCompleted?.()
      } else {
        toast('Action cancelled.', 'info')
        if (inputMode === 'voice') speak('Action cancelled.')
      }
      setResponse(null)
      setState('idle')
    } catch (err: any) {
      toast(err.message || 'Confirmation failed', 'error')
    } finally {
      setIsConfirming(false)
    }
  }

  const closeOverlay = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setIsSpeaking(false)
    setIsOpen(false)
    setState('idle')
    setResponse(null)
    setTranscript('')
    setManualInput('')
    setErrorMsg('')
    setInputMode(null)
  }

  const toggleOpen = () => {
    if (isOpen) {
      closeOverlay()
    } else {
      setIsOpen(true)
      setState('idle')
    }
  }

  return (
    <>
      {/* Floating AI Assistant Trigger — Opens in search/type mode without default talk listening */}
      <motion.div
        className="fixed bottom-20 right-6 z-40 lg:bottom-8 lg:right-8"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={toggleOpen}
          className={`group relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl transition-all duration-300 ${
            state === 'listening'
              ? 'bg-rose-500 text-white shadow-rose-500/30 ring-4 ring-rose-500/30 animate-pulse'
              : isOpen
              ? 'bg-volt-500 text-white ring-2 ring-volt-400/50 shadow-volt-500/40'
              : 'bg-gradient-to-br from-volt-500 via-indigo-600 to-purple-600 text-white shadow-volt-500/30 hover:shadow-volt-500/50 hover:ring-2 hover:ring-volt-400/40'
          }`}
          title="AI Assistant (Search, Coach & Voice)"
        >
          {state === 'listening' ? (
            <MicOff size={24} />
          ) : (
            <div className="relative flex items-center justify-center">
              <Sparkles size={24} className="transition-transform group-hover:scale-110 text-white" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-volt-300 animate-ping" />
            </div>
          )}
        </button>
      </motion.div>

      {/* Interactive AI Assistant Modal / Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="glass-strong fixed bottom-28 right-6 z-50 w-88 sm:w-96 rounded-2xl border border-white/15 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl lg:bottom-24 lg:right-8"
          >
            {/* Header with Modality Status */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-volt-500/20 text-volt-300">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">AI Assistant</span>
                    {state === 'listening' ? (
                      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-semibold text-rose-300 border border-rose-500/30 animate-pulse">
                        Listening...
                      </span>
                    ) : inputMode === 'voice' ? (
                      <span className="rounded-full bg-volt-500/20 px-2 py-0.5 text-[9px] font-semibold text-volt-300 border border-volt-500/30">
                        Voice
                      </span>
                    ) : inputMode === 'typed' ? (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-semibold text-slate-300 border border-slate-700">
                        Typed
                      </span>
                    ) : (
                      <span className="rounded-full bg-volt-500/10 px-2 py-0.5 text-[9px] font-semibold text-volt-300 border border-volt-500/20">
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {inputMode === 'voice' && state !== 'idle' && (
                  <button
                    onClick={concludeConversation}
                    className="flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 px-2 py-1 text-[10px] font-semibold text-slate-300 transition"
                    title="Conclude Voice Conversation"
                  >
                    <Square size={10} className="text-rose-400" />
                    <span>Conclude</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    const next = !talkBackEnabled
                    setTalkBackEnabled(next)
                    if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
                      window.speechSynthesis.cancel()
                    }
                  }}
                  className={`p-1.5 rounded-lg transition ${
                    talkBackEnabled ? 'text-volt-300 hover:bg-volt-500/20' : 'text-slate-500 hover:bg-white/5'
                  }`}
                  title={talkBackEnabled ? 'Voice Talk Back: ON' : 'Voice Talk Back: OFF'}
                >
                  {talkBackEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
                <button
                  onClick={closeOverlay}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                  title="Close Assistant"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Conversation Body */}
            <div className="my-3 min-h-[70px]">
              {/* Ready / Idle state: Type prompt or click mic to start talking */}
              {state === 'idle' && (
                <div className="py-2.5 px-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Search size={13} className="text-volt-400" />
                      <span>Ask AI, search, or tap mic to talk</span>
                    </p>
                  </div>

                  {/* Central Tap-to-Talk Mic Trigger */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-volt-500/15 text-volt-300">
                        <Mic size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Voice Conversation</p>
                        <p className="text-[10px] text-slate-400">Click to start hands-free voice mode</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={startListening}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-volt-500 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-volt-500/20 hover:from-volt-600 hover:to-indigo-700 transition"
                    >
                      <Mic size={13} />
                      <span>Start Talking</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Listening state — Active speech recognition */}
              {state === 'listening' && (
                <div className="space-y-2 text-center py-2">
                  <button
                    type="button"
                    onClick={stopListening}
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 animate-pulse border border-rose-500/30 hover:bg-rose-500/25 transition cursor-pointer"
                    title="Tap to Stop Listening"
                  >
                    <Mic size={24} />
                  </button>
                  <p className="text-xs font-semibold text-rose-300">
                    {transcript ? 'Listening...' : 'Listening... Speak anything'}
                  </p>
                  <p className="text-xs italic text-slate-300 min-h-5 px-2">
                    {transcript || 'e.g. "Suggest high-protein breakfast", "Log Chest Day", or "Diary entry"'}
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={stopListening}
                      className="text-[11px] font-semibold text-slate-400 hover:text-white underline"
                    >
                      Stop listening
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={concludeConversation}
                      className="text-[11px] font-semibold text-rose-400 hover:text-rose-300"
                    >
                      Conclude
                    </button>
                  </div>
                </div>
              )}

              {state === 'processing' && (
                <div className="flex flex-col items-center justify-center py-4 space-y-2">
                  <Loader2 size={24} className="animate-spin text-volt-400" />
                  <p className="text-xs text-slate-400">Processing with Life OS AI...</p>
                </div>
              )}

              {state === 'result' && response && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {inputMode === 'voice' ? 'You said:' : 'Your prompt:'}{' '}
                      <span className="italic text-white">"{transcript}"</span>
                    </span>
                    {isSpeaking && (
                      <span className="flex items-center gap-1 text-[10px] text-volt-400 animate-pulse">
                        <Volume2 size={12} /> Speaking...
                      </span>
                    )}
                  </div>

                  {/* Immediate execution outcome */}
                  {response.executed && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-300">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>{response.executionMessage || 'Action completed successfully.'}</span>
                    </div>
                  )}

                  {/* Query & AI Coach Result */}
                  {response.kind === 'result' && response.resultText && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 text-xs text-slate-200 whitespace-pre-line leading-relaxed space-y-3 max-h-56 overflow-y-auto">
                      <div>{response.resultText}</div>
                      {response.route && (
                        <div className="pt-2 border-t border-white/10 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const routeMap: Record<string, string> = {
                                diary: '/diary',
                                fitness: '/fitness',
                                'workout-planner': '/fitness/planner',
                                todo: '/todo',
                                'body-scan': '/body-scan',
                                dashboard: '/',
                                ai: '/fitness',
                                expenses: '/expenses',
                                settings: '/settings',
                                reports: '/expenses',
                              }
                              const path = routeMap[response.route || ''] || '/expenses'
                              navigate(path)
                              closeOverlay()
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-volt-500 hover:bg-volt-600 text-xs font-semibold text-white transition shadow-sm"
                          >
                            <span>Open {response.route === 'workout-planner' ? 'Workout Planner' : response.route === 'todo' ? 'To-Do' : response.route === 'diary' ? 'Diary' : response.route === 'fitness' ? 'Fitness' : 'Details'}</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clarification prompt */}
                  {response.kind === 'clarification' && response.clarification && (
                    <div className="rounded-xl bg-volt-500/10 border border-volt-500/20 p-3 space-y-2">
                      <p className="text-xs text-volt-300 font-medium">{response.clarification.question}</p>
                      {response.clarification.options?.length ? (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {response.clarification.options.map((opt: string, i: number) => (
                            <button
                              key={i}
                              onClick={() => processTranscript(opt, inputMode || 'typed')}
                              className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/20"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Confirmation required dialog */}
                  {response.requiresConfirmation && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                        <AlertCircle size={16} />
                        <span>Confirmation Required</span>
                      </div>
                      <p className="text-xs text-white font-medium">{response.previewText}</p>
                      {response.confirmationReason && (
                        <p className="text-[10px] text-amber-300/80">{response.confirmationReason}</p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleConfirmAction(false)}
                          disabled={isConfirming}
                          className="flex-1 rounded-lg bg-white/10 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/20"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmAction(true)}
                          disabled={isConfirming}
                          className="flex-1 rounded-lg bg-volt-500 py-1.5 text-xs font-medium text-white hover:bg-volt-600"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {state === 'error' && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-center text-xs text-rose-300 space-y-1">
                  <p className="font-semibold">Speech Error</p>
                  <p>{errorMsg}</p>
                  <button
                    onClick={startListening}
                    className="mt-2 inline-block text-xs font-semibold text-volt-400 underline"
                  >
                    Try Microphone Again
                  </button>
                </div>
              )}
            </div>

            {/* Manual text input bar with explicit Mic button */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (manualInput.trim()) {
                  processTranscript(manualInput, 'typed')
                  setManualInput('')
                }
              }}
              className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2.5"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Ask AI Coach, search, or type command..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-volt-500"
              />
              <button
                type="button"
                onClick={state === 'listening' ? stopListening : startListening}
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                  state === 'listening'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
                }`}
                title={state === 'listening' ? 'Stop Listening' : 'Click Mic to Talk'}
              >
                <Mic size={14} />
              </button>
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-volt-500 text-white disabled:opacity-40 hover:bg-volt-600 transition"
                title="Send Prompt Silently"
              >
                <Send size={13} />
              </button>
            </form>

            {/* Prompt pills */}
            <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
              {[
                'Suggest high-protein meal',
                'Log workout Chest Day 45m',
                'How much rest between heavy sets?',
                'Log food 2 boiled eggs 150 kcal',
                'Diary: Great day today',
              ].map((sug, i) => (
                <button
                  key={i}
                  onClick={() => processTranscript(sug, 'typed')}
                  className="rounded-lg bg-white/5 border border-white/5 px-2 py-1 text-[10px] text-slate-400 hover:bg-white/10 hover:text-slate-200 transition"
                >
                  {sug}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

