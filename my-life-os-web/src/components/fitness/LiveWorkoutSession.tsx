import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Volume2,
  VolumeX,
  Trophy,
  Timer,
  Dumbbell,
  Flame,
  X,
  Sparkles,
  Plus,
  Minus,
  ArrowRight,
  Zap,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { fitnessService, type Workout } from '@/services/fitness'
import { cn } from '@/lib/utils'

export interface LiveWorkoutSessionProps {
  open: boolean
  onClose: () => void
  workout: Workout | null
  onWorkoutCompleted?: (updated: Workout) => void
}

interface WorkoutSet {
  exerciseIndex: number
  exerciseName: string
  setNumber: number
  totalSetsForEx: number
  targetReps: string
  targetWeightKg: number | null
  actualReps: string
  actualWeightKg: string
  completed: boolean
}

type WorkoutPhase = 'exercise' | 'rest' | 'completed'

function playChime(freq = 880, duration = 0.18, type: OscillatorType = 'sine') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio optional / blocked
  }
}

function announce(text: string, enabled = true) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 1.05
    utter.pitch = 1.05
    window.speechSynthesis.speak(utter)
  } catch {
    // optional speech
  }
}

export function LiveWorkoutSession({
  open,
  onClose,
  workout,
  onWorkoutCompleted,
}: LiveWorkoutSessionProps) {
  const { toast } = useToast()

  // Session State
  const [phase, setPhase] = useState<WorkoutPhase>('exercise')
  const [currentSetIdx, setCurrentSetIdx] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Timing State
  const [overallElapsedSec, setOverallElapsedSec] = useState(0)
  const [isWorkoutPaused, setIsWorkoutPaused] = useState(false)
  const [setElapsedSec, setSetElapsedSec] = useState(0)

  // Rest Timer State
  const [restDurationTotal, setRestDurationTotal] = useState(60)
  const [restSecondsLeft, setRestSecondsLeft] = useState(60)

  // All Sets in Workout
  const [sets, setSets] = useState<WorkoutSet[]>([])
  const [savingCompletion, setSavingCompletion] = useState(false)

  // Initialize Sets from Workout
  useEffect(() => {
    if (!workout || !open) return

    const initialSets: WorkoutSet[] = []
    if (workout.exercises && workout.exercises.length > 0) {
      workout.exercises.forEach((ex, exIdx) => {
        const numSets = Math.max(1, Number(ex.sets) || 3)
        const reps = ex.reps != null ? String(ex.reps) : '10'
        const weight = ex.weightKg != null ? Number(ex.weightKg) : null

        for (let s = 1; s <= numSets; s++) {
          initialSets.push({
            exerciseIndex: exIdx,
            exerciseName: ex.exerciseName,
            setNumber: s,
            totalSetsForEx: numSets,
            targetReps: reps,
            targetWeightKg: weight,
            actualReps: reps,
            actualWeightKg: weight != null ? String(weight) : '',
            completed: false,
          })
        }
      })
    } else {
      // Fallback if workout has no exercises yet
      for (let s = 1; s <= 3; s++) {
        initialSets.push({
          exerciseIndex: 0,
          exerciseName: workout.name,
          setNumber: s,
          totalSetsForEx: 3,
          targetReps: '10',
          targetWeightKg: null,
          actualReps: '10',
          actualWeightKg: '',
          completed: false,
        })
      }
    }

    setSets(initialSets)
    setCurrentSetIdx(0)
    setPhase('exercise')
    setOverallElapsedSec(0)
    setSetElapsedSec(0)
    setIsWorkoutPaused(false)
    setRestDurationTotal(60)
    setRestSecondsLeft(60)
  }, [workout, open])

  // Active Set Reference
  const currentSet = sets[currentSetIdx] || null
  const nextSet = sets[currentSetIdx + 1] || null

  // Overall Workout Timer
  useEffect(() => {
    if (!open || isWorkoutPaused || phase === 'completed') return

    const timer = setInterval(() => {
      setOverallElapsedSec((prev) => prev + 1)
      if (phase === 'exercise') {
        setSetElapsedSec((prev) => prev + 1)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [open, isWorkoutPaused, phase])

  // Rest Countdown Timer
  useEffect(() => {
    if (!open || phase !== 'rest' || isWorkoutPaused) return

    if (restSecondsLeft <= 0) {
      // Rest Finished!
      playChime(1046, 0.3, 'triangle') // high C chime
      if (nextSet) {
        announce(`Rest complete! Next: ${nextSet.exerciseName}, Set ${nextSet.setNumber}. Let's go!`, soundEnabled)
      }
      handleRestFinished()
      return
    }

    // Warning beeps at 3, 2, 1
    if (restSecondsLeft <= 3 && restSecondsLeft > 0) {
      playChime(660, 0.1, 'sine')
    }

    const restTimer = setInterval(() => {
      setRestSecondsLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(restTimer)
  }, [open, phase, restSecondsLeft, isWorkoutPaused, nextSet, soundEnabled])

  // ── Actions ─────────────────────────────────────────────────────

  function handleCompleteSet() {
    if (!currentSet) return

    playChime(880, 0.2, 'sine')

    // Mark current set completed
    const updatedSets = [...sets]
    updatedSets[currentSetIdx] = {
      ...currentSet,
      completed: true,
    }
    setSets(updatedSets)

    // Check if this was the last set
    if (currentSetIdx >= sets.length - 1) {
      finishWorkout(updatedSets)
      return
    }

    // Transition to REST phase
    setPhase('rest')
    setRestSecondsLeft(restDurationTotal)
    announce(`Set ${currentSet.setNumber} complete. Rest for ${restDurationTotal} seconds.`, soundEnabled)
  }

  function handleRestFinished() {
    setPhase('exercise')
    setCurrentSetIdx((prev) => prev + 1)
    setSetElapsedSec(0)
  }

  function skipRest() {
    playChime(750, 0.15, 'sine')
    handleRestFinished()
  }

  function adjustRestTime(delta: number) {
    setRestSecondsLeft((prev) => Math.max(5, prev + delta))
    setRestDurationTotal((prev) => Math.max(5, prev + delta))
  }

  async function finishWorkout(finalSets = sets) {
    setPhase('completed')
    playChime(1318, 0.4, 'sine')
    announce('Workout crushed! Outstanding work!', soundEnabled)

    if (!workout) return

    setSavingCompletion(true)
    try {
      const durationMin = Math.max(1, Math.round(overallElapsedSec / 60))
      const caloriesEst = Math.round(durationMin * 7.5) // ~7.5 kcal/min standard workout burn

      const updated = await fitnessService.updateWorkout(workout.id, {
        status: 'completed',
        durationMin,
        totalCaloriesBurned: workout.totalCaloriesBurned || caloriesEst,
      })

      if (onWorkoutCompleted) {
        onWorkoutCompleted(updated)
      }
      toast('Workout completed and saved to fitness log! 🔥')
    } catch (err) {
      toast('Could not update workout status online', 'error')
    } finally {
      setSavingCompletion(false)
    }
  }

  function formatTime(totalSec: number) {
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Progress metrics
  const completedSetsCount = useMemo(() => sets.filter((s) => s.completed).length, [sets])
  const progressPercent = useMemo(
    () => (sets.length > 0 ? Math.round((completedSetsCount / sets.length) * 100) : 0),
    [completedSetsCount, sets.length],
  )

  const restProgress = useMemo(() => {
    if (restDurationTotal === 0) return 0
    return Math.max(0, Math.min(100, ((restDurationTotal - restSecondsLeft) / restDurationTotal) * 100))
  }, [restDurationTotal, restSecondsLeft])

  if (!open || !workout) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={phase === 'completed' ? onClose : undefined}
          className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
        />

        {/* Main Live Workout Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-black/95 p-5 sm:p-8 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header Bar */}
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <Dumbbell size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white sm:text-xl">{workout.name}</h2>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
                    Live Session
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Timer size={13} className="text-emerald-400" />
                  <span>Total: {formatTime(overallElapsedSec)}</span>
                  <span>•</span>
                  <span>Set {completedSetsCount + 1} of {sets.length}</span>
                </div>
              </div>
            </div>

            {/* Top Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 transition-colors"
                title={soundEnabled ? 'Mute voice/timer audio' : 'Unmute voice/timer audio'}
              >
                {soundEnabled ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} className="text-slate-500" />}
              </button>

              <button
                type="button"
                onClick={() => setIsWorkoutPaused((prev) => !prev)}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5',
                  isWorkoutPaused
                    ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
                )}
              >
                {isWorkoutPaused ? <Play size={13} /> : <Pause size={13} />}
                <span>{isWorkoutPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="mb-6 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400 font-medium">
              <span>Workout Progress ({progressPercent}%)</span>
              <span>{completedSetsCount} / {sets.length} sets</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                animate={{ width: `${progressPercent}%` }}
                transition={{ ease: 'easeOut', duration: 0.3 }}
              />
            </div>
          </div>

          {/* ── PHASE: EXERCISE WORK PHASE ────────────────────────────── */}
          {phase === 'exercise' && currentSet && (
            <motion.div
              key={`exercise-${currentSetIdx}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {/* Exercise Card */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Dumbbell size={100} className="text-white" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                      Exercise {currentSet.exerciseIndex + 1}
                    </span>
                    <h3 className="text-2xl font-black text-white sm:text-3xl">
                      {currentSet.exerciseName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
                    <Zap size={14} className="text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-300">
                      Set {currentSet.setNumber} of {currentSet.totalSetsForEx}
                    </span>
                  </div>
                </div>

                {/* Target & Active Set Inputs */}
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/5 bg-black/40 p-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Reps Target
                    </label>
                    <div className="flex items-baseline gap-2">
                      <input
                        type="text"
                        value={currentSet.actualReps}
                        onChange={(e) => {
                          const val = e.target.value
                          setSets((prev) =>
                            prev.map((s, idx) => (idx === currentSetIdx ? { ...s, actualReps: val } : s)),
                          )
                        }}
                        className="w-20 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xl font-bold text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 font-medium">reps</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Weight Target
                    </label>
                    <div className="flex items-baseline gap-2">
                      <input
                        type="text"
                        value={currentSet.actualWeightKg}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value
                          setSets((prev) =>
                            prev.map((s, idx) => (idx === currentSetIdx ? { ...s, actualWeightKg: val } : s)),
                          )
                        }}
                        className="w-20 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xl font-bold text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 font-medium">kg</span>
                    </div>
                  </div>
                </div>

                {/* Active Set Live Work Timer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Timer size={13} className="text-emerald-400" />
                    Time in Set: {formatTime(setElapsedSec)}
                  </span>
                  <span className="text-slate-500">
                    {nextSet ? `Next: ${nextSet.exerciseName}` : 'Final Exercise!'}
                  </span>
                </div>
              </div>

              {/* Primary Action Button: Complete Set & Rest */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleCompleteSet}
                  className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 py-4 text-base font-black uppercase tracking-wider text-white shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] hover:shadow-emerald-500/40 active:scale-[0.99]"
                >
                  <CheckCircle2 size={20} className="transition-transform group-hover:scale-110" />
                  <span>
                    {currentSetIdx >= sets.length - 1 ? 'Complete Final Set' : `Complete Set & Rest (${restDurationTotal}s)`}
                  </span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </button>

                <div className="flex justify-between items-center px-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentSetIdx > 0) {
                        setCurrentSetIdx((prev) => prev - 1)
                        setSetElapsedSec(0)
                      }
                    }}
                    disabled={currentSetIdx === 0}
                    className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
                  >
                    ← Previous Set
                  </button>

                  <button
                    type="button"
                    onClick={() => finishWorkout()}
                    className="text-xs font-semibold text-rose-400/80 hover:text-rose-300 transition-colors"
                  >
                    End Workout Early
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PHASE: REST COUNTDOWN PHASE ───────────────────────────── */}
          {phase === 'rest' && (
            <motion.div
              key="rest-phase"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {/* Big Rest Timer Card */}
              <div className="relative flex flex-col items-center justify-center rounded-3xl border border-teal-500/30 bg-gradient-to-b from-teal-500/[0.08] via-slate-900/60 to-black/60 p-8 shadow-2xl overflow-hidden text-center">
                {/* Ambient Glow */}
                <div className="absolute -top-12 h-36 w-36 rounded-full bg-teal-500/20 blur-3xl" />

                <span className="rounded-full bg-teal-500/20 border border-teal-500/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-300 mb-3">
                  Rest & Recover
                </span>

                {/* Giant Digital Countdown */}
                <div className="relative my-2 flex items-baseline justify-center">
                  <motion.span
                    key={restSecondsLeft}
                    initial={{ scale: 1.08, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      'font-mono text-7xl font-black tracking-tight sm:text-8xl',
                      restSecondsLeft <= 5 ? 'text-amber-400 animate-pulse' : 'text-white',
                    )}
                  >
                    {restSecondsLeft}
                  </motion.span>
                  <span className="ml-2 text-xl font-bold text-slate-500">sec</span>
                </div>

                {/* Rest Circular Progress Bar */}
                <div className="w-full max-w-xs my-3 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${restProgress}%` }}
                  />
                </div>

                {/* Quick Rest Adjusters */}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => adjustRestTime(-15)}
                    className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
                  >
                    <Minus size={12} />
                    <span>15s</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustRestTime(30)}
                    className="flex items-center gap-1 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition-colors"
                  >
                    <Plus size={12} />
                    <span>30s</span>
                  </button>
                </div>
              </div>

              {/* "Up Next" Preview Card */}
              {nextSet && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Up Next:
                    </span>
                    <p className="text-base font-bold text-white">
                      {nextSet.exerciseName}
                    </p>
                    <p className="text-xs text-slate-400">
                      Set {nextSet.setNumber} of {nextSet.totalSetsForEx} • {nextSet.targetReps} reps {nextSet.targetWeightKg ? `@ ${nextSet.targetWeightKg} kg` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={skipRest}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:scale-105 transition-all"
                  >
                    <span>Skip Rest</span>
                    <SkipForward size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── PHASE: WORKOUT COMPLETED ──────────────────────────────── */}
          {phase === 'completed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center space-y-6"
            >
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-2xl shadow-emerald-500/40">
                <Trophy size={48} className="text-white" />
                <Sparkles size={24} className="absolute -top-2 -right-2 text-amber-300 animate-bounce" />
              </div>

              <div>
                <h3 className="text-3xl font-black text-white">Workout Crushed! 🎉</h3>
                <p className="mt-1 text-sm text-slate-400">
                  You completed all planned sets for <span className="text-white font-semibold">{workout.name}</span>.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Duration</span>
                  <p className="text-xl font-black text-white mt-1">{formatTime(overallElapsedSec)}</p>
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Sets Finished</span>
                  <p className="text-xl font-black text-emerald-400 mt-1">{completedSetsCount}</p>
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Burned Est.</span>
                  <p className="text-xl font-black text-amber-400 mt-1">
                    ~{Math.round(Math.max(1, overallElapsedSec / 60) * 7.5)} kcal
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={savingCompletion}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:opacity-95"
              >
                {savingCompletion ? 'Saving to Fitness Log...' : 'Done & Return to Fitness'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
