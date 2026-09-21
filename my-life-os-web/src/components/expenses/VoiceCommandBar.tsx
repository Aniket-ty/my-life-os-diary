import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, Sparkles, CheckCircle2, AlertCircle, X, Volume2, VolumeX, Send, ArrowRight } from 'lucide-react'
import { voiceService, type VoiceCommandResponse } from '../../services/voice'
import { offlineSync } from '../../services/offlineSync'
import { useToast } from '../ui/Toast'

interface VoiceCommandBarProps {
  onActionCompleted?: () => void
  triggerListening?: boolean
  onResetTrigger?: () => void
}

export function VoiceCommandBar({ onActionCompleted, triggerListening, onResetTrigger }: VoiceCommandBarProps) {
  const [state, setState] = useState<'idle' | 'listening' | 'processing' | 'result' | 'error'>('idle')
  const [transcript, setTranscript] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [response, setResponse] = useState<VoiceCommandResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [talkBackEnabled, setTalkBackEnabled] = useState(true)
  const recognitionRef = useRef<any>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (triggerListening && state === 'idle') {
      startListening()
      onResetTrigger?.()
    }
  }, [triggerListening])

  const speak = (textToSpeak: string) => {
    if (!talkBackEnabled || typeof window === 'undefined' || !window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.lang = 'en-US'
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      console.warn('Speech synthesis error:', e)
    }
  }

  const startListening = () => {
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
        setState('error')
        setErrorMsg(event.error === 'no-speech' ? 'No speech heard. Try again.' : 'Microphone error')
      }

      recognition.onend = () => {
        if (transcript.trim()) {
          processTranscript(transcript)
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
      recognitionRef.current.stop()
    }
  }

  const processTranscript = async (text: string) => {
    const clean = text.trim()
    if (!clean) return
    setTranscript(clean)

    // Handle offline scenario gracefully
    if (!navigator.onLine) {
      setState('processing')
      if (/^(?:diary|write diary|log diary)\b/i.test(clean)) {
        const content = clean.replace(/^(?:diary:?|write diary|log diary)\s*/i, '') || 'Voice journal note'
        offlineSync.queueDiaryEntry({ title: 'Offline Reflection', content, mood: 'productive' })
        const feedback = 'Diary entry saved offline. It will automatically sync when you are back online.'
        speak(feedback)
        setResponse({ intent: 'LOG_DIARY', confidence: 1, provider: 'offline', executed: true, executionMessage: feedback, speechText: feedback })
      } else if (/^(?:add task|create todo|todo)\b/i.test(clean)) {
        const title = clean.replace(/^(?:add task|create todo|todo:?)\s*/i, '') || 'New task'
        offlineSync.queueTodo({ title, priority: 'medium' })
        const feedback = `Added task ${title} offline. Will sync when online.`
        speak(feedback)
        setResponse({ intent: 'CREATE_TODO', confidence: 1, provider: 'offline', executed: true, executionMessage: feedback, speechText: feedback })
      } else if (/^(?:log workout|workout)\b/i.test(clean)) {
        const name = clean.replace(/^(?:log workout|workout:?)\s*/i, '') || 'Workout'
        offlineSync.queueWorkout({ name, durationMin: 30, totalCaloriesBurned: 200 })
        const feedback = `Logged workout ${name} offline. Will sync when online.`
        speak(feedback)
        setResponse({ intent: 'LOG_WORKOUT', confidence: 1, provider: 'offline', executed: true, executionMessage: feedback, speechText: feedback })
      } else {
        const feedback = 'You are currently offline. Basic commands are queued locally.'
        speak(feedback)
        setResponse({ intent: 'UNKNOWN', confidence: 0.5, provider: 'offline', executionMessage: feedback, speechText: feedback })
      }
      setState('result')
      return
    }

    try {
      setState('processing')
      const res = await voiceService.sendCommand(clean)
      setResponse(res)
      setState('result')

      // Talk Back Voice Feedback
      const feedbackText = res.speechText || res.executionMessage || res.resultText || res.previewText || 'Command processed.'
      speak(feedbackText)

      if (res.kind === 'navigate') {
        const routeMap: Record<string, string> = {
          diary: '/diary',
          fitness: '/fitness',
          'workout-planner': '/fitness/planner',
          todo: '/todo',
          'body-scan': '/body-scan',
          dashboard: '/',
          ai: '/ai',
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
      setErrorMsg(err.message || 'Failed to process command')
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
        speak(msg)
        onActionCompleted?.()
      } else {
        toast('Action cancelled.', 'info')
        speak('Action cancelled.')
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
    setState('idle')
    setResponse(null)
    setTranscript('')
    setManualInput('')
    setErrorMsg('')
  }

  return (
    <>
      {/* Floating Microphone Trigger */}
      <motion.div
        className="fixed bottom-20 right-6 z-40 lg:bottom-8 lg:right-8"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={state === 'listening' ? stopListening : startListening}
          className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl shadow-violet-500/25 transition-all ${
            state === 'listening'
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-gradient-to-br from-violet-brand to-indigo-600 text-white'
          }`}
          title="Voice Assistant"
        >
          {state === 'listening' ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
      </motion.div>

      {/* Interactive Voice Assistant Modal / Overlay */}
      <AnimatePresence>
        {state !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-strong fixed bottom-28 right-6 z-50 w-84 sm:w-96 rounded-2xl border border-white/15 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-2xl lg:bottom-24 lg:right-8"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-violet-brand">
                <Sparkles size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Voice Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = !talkBackEnabled
                    setTalkBackEnabled(next)
                    if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
                      window.speechSynthesis.cancel()
                    }
                  }}
                  className={`p-1 rounded-md transition ${talkBackEnabled ? 'text-violet-400 hover:bg-violet-500/20' : 'text-slate-500 hover:bg-white/5'}`}
                  title={talkBackEnabled ? 'Talk Back (Voice Feedback) ON' : 'Talk Back (Voice Feedback) OFF'}
                >
                  {talkBackEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button onClick={closeOverlay} className="text-slate-400 hover:text-white p-1">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="my-4 min-h-[70px]">
              {state === 'listening' && (
                <div className="space-y-2 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 animate-ping">
                    <Mic size={20} />
                  </div>
                  <p className="text-xs font-semibold text-rose-400">Listening... Speak anything</p>
                  <p className="text-sm italic text-slate-300 min-h-6">
                    {transcript || '"Log workout Leg Day" or "Diary: Great day"'}
                  </p>
                </div>
              )}

              {state === 'processing' && (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <Loader2 size={24} className="animate-spin text-violet-brand" />
                  <p className="text-xs text-slate-400">Processing your request...</p>
                </div>
              )}

              {state === 'result' && response && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    You said: <span className="italic text-white">"{transcript}"</span>
                  </p>

                  {/* Immediate execution outcome */}
                  {response.executed && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>{response.executionMessage || 'Action completed successfully.'}</span>
                    </div>
                  )}

                  {/* Query results */}
                  {response.kind === 'result' && response.resultText && (
                    <div className="rounded-xl bg-white/5 p-3.5 text-sm text-slate-200 whitespace-pre-line leading-relaxed space-y-3">
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
                                ai: '/ai',
                                expenses: '/expenses',
                                settings: '/settings',
                                reports: '/expenses',
                              }
                              const path = routeMap[response.route || ''] || '/expenses'
                              navigate(path)
                              closeOverlay()
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition shadow-sm"
                          >
                            <span>Open {response.route === 'workout-planner' ? 'Workout Planner' : response.route === 'todo' ? 'To-Do' : response.route === 'diary' ? 'Diary' : response.route === 'fitness' ? 'Fitness' : 'Details'}</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confirmation required dialog */}
                  {response.requiresConfirmation && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                        <AlertCircle size={16} />
                        <span>Confirmation Required</span>
                      </div>
                      <p className="text-sm text-white font-medium">{response.previewText}</p>
                      {response.confirmationReason && (
                        <p className="text-[11px] text-amber-300/80">{response.confirmationReason}</p>
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
                          className="flex-1 rounded-lg bg-violet-brand py-1.5 text-xs font-medium text-white hover:bg-violet-600"
                        >
                          Yes, Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {state === 'error' && (
                <div className="rounded-xl bg-rose-500/10 p-3 text-center text-xs text-rose-300 space-y-1">
                  <p className="font-semibold">Speech Error</p>
                  <p>{errorMsg}</p>
                  <button
                    onClick={startListening}
                    className="mt-2 inline-block text-xs font-semibold text-violet-brand underline"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Manual text input fallback */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (manualInput.trim()) {
                  processTranscript(manualInput)
                  setManualInput('')
                }
              }}
              className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Type any command or tap mic..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-brand text-white disabled:opacity-40 hover:bg-violet-600"
              >
                <Send size={13} />
              </button>
            </form>

            {/* Try saying pills */}
            <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
              {[
                'Log workout Chest Day 45m',
                'Log exercise Bench Press 3 sets 10 reps',
                'Diary: Productive day',
                'Add task Buy groceries',
                'Spent 500 on lunch',
              ].map((sug, i) => (
                <button
                  key={i}
                  onClick={() => processTranscript(sug)}
                  className="rounded-lg bg-white/5 px-2 py-1 text-[10px] text-slate-400 hover:bg-white/10 hover:text-slate-200"
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
