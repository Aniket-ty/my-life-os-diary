import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, Sparkles, Plus, Trash2, PenLine, X, Check, Dumbbell,
  ChevronLeft, ChevronRight, Loader2, Save, ScanLine, Play,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { ExerciseDemo } from '@/components/fitness/ExerciseDemo'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  workoutPlanService,
  type WorkoutPlan, type PlanDay, type PlanExercise,
} from '@/services/workoutPlan'
import { bodyScanService } from '@/services/bodyScan'
import { toISODate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const GOALS = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Build muscle' },
]

const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const EQUIPMENT_OPTIONS = ['None', 'Dumbbells', 'Barbell', 'Resistance bands', 'Pull-up bar', 'Treadmill', 'Kettlebells', 'Bodyweight', 'Gym machines']

const SPLIT_OPTIONS = [
  'Push Pull Legs (PPL)',
  'Upper / Lower',
  'Full Body',
  'Arnold Split',
  'Bro Split (1 Muscle/Day)',
  'Cardio & Conditioning',
  'Dumbbell / Home Only',
  'Strength & Power',
]

const DURATION_OPTIONS = ['30-45 mins', '45-60 mins', '60-75 mins', '75+ mins']

export function WorkoutPlanner() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [scanChecked, setScanChecked] = useState(false)
  const [hasScan, setHasScan] = useState(true)

  // Generate form
  const [goal, setGoal] = useState('maintain')
  const [level, setLevel] = useState('beginner')
  const [daysPerWeek, setDaysPerWeek] = useState(5)
  const [equipment, setEquipment] = useState<string[]>([])
  const [focus, setFocus] = useState('')
  const [splitType, setSplitType] = useState('Push Pull Legs (PPL)')
  const [workoutDuration, setWorkoutDuration] = useState('45-60 mins')
  const [preferences, setPreferences] = useState('')

  // Editor
  const [editingDay, setEditingDay] = useState<PlanDay | null>(null)
  const [editName, setEditName] = useState('')
  const [editMuscle, setEditMuscle] = useState('')
  const [editExercises, setEditExercises] = useState<PlanExercise[]>([])
  const [savingDay, setSavingDay] = useState(false)

  // Exercise & Workout Demo states
  const [demoExerciseName, setDemoExerciseName] = useState<string | null>(null)
  const [demoDay, setDemoDay] = useState<PlanDay | null>(null)
  const [demoCustomSets, setDemoCustomSets] = useState<number | string | null>(null)
  const [demoCustomReps, setDemoCustomReps] = useState<string | null>(null)
  const [demoCustomRestSec, setDemoCustomRestSec] = useState<number | string | null>(null)

  const openExerciseInPlanDay = (day: PlanDay, ex: PlanExercise) => {
    setDemoDay(day)
    setDemoExerciseName(ex.name)
    setDemoCustomSets(ex.sets || null)
    setDemoCustomReps(ex.reps || null)
    setDemoCustomRestSec(ex.restSec || 90)
  }

  const openFullPlanDay = (day: PlanDay) => {
    setDemoDay(day)
    if (day.exercises && day.exercises.length > 0) {
      const first = day.exercises[0]
      setDemoExerciseName(first.name)
      setDemoCustomSets(first.sets || null)
      setDemoCustomReps(first.reps || null)
      setDemoCustomRestSec(first.restSec || 90)
    } else {
      setDemoExerciseName(day.workoutName || 'Workout')
      setDemoCustomSets(null)
      setDemoCustomReps(null)
      setDemoCustomRestSec(null)
    }
  }

  const loadPlans = async () => {
    setLoading(true)
    try {
      const data = await workoutPlanService.list()
      setPlans(data)
      const active = data.find((p) => p.isActive) ?? data[0] ?? null
      setActivePlan(active)
    } catch {
      toast('Could not load workout plans', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
    bodyScanService.list()
      .then((scans) => setHasScan(scans.length > 0))
      .catch(() => setHasScan(true))
      .finally(() => setScanChecked(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const week = useMemo(() => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [])

  const generate = async () => {
    setGenerating(true)
    try {
      const result = await workoutPlanService.generate({
        goal: goal as 'lose' | 'maintain' | 'gain',
        fitnessLevel: level as 'beginner' | 'intermediate' | 'advanced',
        daysPerWeek,
        equipment,
        focus: focus || undefined,
        splitType: splitType || undefined,
        workoutDuration: workoutDuration || undefined,
        preferences: preferences || undefined,
      })
      // Save generated plan
      const saved = await workoutPlanService.create({
        ...result,
        generatedByAI: true,
        isActive: true,
        goal,
        fitnessLevel: level,
        equipment,
        daysPerWeek,
      })
      toast('Plan generated! Review the week below')
      await loadPlans()
      // Activate the new plan if multiple
      if (saved.id && plans.length > 0) {
        await workoutPlanService.update(saved.id, { isActive: true })
        await loadPlans()
      }

      // Auto-apply today's workout from the new plan
      const todayDow = new Date().getDay() // 0=Sun, 1=Mon ...
      const todayStr = toISODate(new Date())
      const todayPlanDay = saved.days?.find(
        (d: PlanDay) => d.dayNumber === todayDow && !d.restDay
      )
      if (todayPlanDay) {
        try {
          await workoutPlanService.applyDay(saved.id, todayPlanDay.id!, todayStr)
        } catch { /* ignore if auto-apply fails */ }
      }
    } catch (err) {
      toast(err instanceof Error ? err.message.split(':').pop() ?? 'Generation failed' : 'Generation failed', 'error')
    } finally {
      setGenerating(false)
      setShowGenerate(false)
    }
  }

  const toggleEquipment = (opt: string) => {
    setEquipment((prev) => {
      const item = opt === 'None' ? 'None' : opt
      if (prev.includes(item)) return prev.filter((e) => e !== item)
      return [...prev, item]
    })
  }

  const startEdit = (day: PlanDay) => {
    setEditingDay(day)
    setEditName(day.workoutName || '')
    setEditMuscle(day.muscleGroup || '')
    setEditExercises(day.exercises?.length
      ? day.exercises.map((ex) => ({ name: ex.name, sets: ex.sets, reps: ex.reps }))
      : [{ name: '', sets: 3, reps: '10' }])
  }

  const saveDay = async () => {
    if (!activePlan || !editingDay) return
    setSavingDay(true)
    try {
      await workoutPlanService.updateDay(activePlan.id, editingDay.id!, {
        workoutName: editName || undefined,
        muscleGroup: editMuscle || undefined,
        restDay: false,
        exercises: editExercises.filter((e) => e.name.trim()),
      })
      toast('Day updated')
      setEditingDay(null)
      await loadPlans()
    } catch {
      toast('Could not save day', 'error')
    } finally {
      setSavingDay(false)
    }
  }

  const applyDay = async (day: PlanDay) => {
    if (!activePlan || !day.id) return
    try {
      await workoutPlanService.applyDay(activePlan.id, day.id, toISODate(new Date()))
      toast(`"${day.workoutName || 'Workout'}" added to today's workouts`)
    } catch {
      toast('Could not apply this day', 'error')
    }
  }

  const selectPlan = async (plan: WorkoutPlan) => {
    setActivePlan(plan)
    if (!plan.isActive) {
      await workoutPlanService.update(plan.id, { isActive: true })
      await loadPlans()
    }
  }

  const deletePlan = async (plan: WorkoutPlan) => {
    await workoutPlanService.remove(plan.id)
    toast('Plan deleted')
    await loadPlans()
  }

  const addExerciseRow = () => {
    setEditExercises((prev) => [...prev, { name: '', sets: 3, reps: '10' }])
  }

  const updateExercise = (idx: number, field: keyof PlanExercise, value: string | number | undefined) => {
    setEditExercises((prev) => prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex)))
  }

  if (loading || !scanChecked) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-violet-brand" />
      </div>
    )
  }

  if (!hasScan) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Workout Planner"
          subtitle="A weekly schedule designed for your goals"
          icon={<CalendarDays size={22} className="text-emerald-400" />}
          accent="from-emerald-500 to-teal-500"
        />
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-10 text-center"
        >
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/25 to-orange-500/10">
            <ScanLine size={28} className="text-rose-300" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Complete your body scan first</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Your workout plan is built around your starting measurements. Log a quick body scan
            (just your weight is enough) to unlock your personalized plan.
          </p>
          <Link to="/body-scan">
            <Button className="mt-6 bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25">
              <ScanLine size={16} />
              Go to Body Scan
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Workout Planner"
        subtitle="A weekly schedule designed for your goals"
        icon={<CalendarDays size={22} className="text-emerald-400" />}
        accent="from-emerald-500 to-teal-500"
        action={
          <div className="flex gap-2">
            {activePlan && (
              <select
                value={activePlan.id}
                onChange={(e) => {
                  const p = plans.find((pl) => pl.id === e.target.value)
                  if (p) void selectPlan(p)
                }}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-medium text-slate-200 focus:border-emerald-400/50 focus:outline-none"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                ))}
              </select>
            )}
            <Button onClick={() => setShowGenerate(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
              <Sparkles size={16} />
              Generate plan
            </Button>
          </div>
        }
      />

      {!activePlan && !showGenerate && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-10 text-center"
        >
          <Dumbbell size={40} className="mx-auto mb-4 text-emerald-400" />
          <h2 className="font-display text-xl font-bold text-white">No workout plan yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
            Generate a personalized weekly schedule based on your goal, fitness level and available equipment.
          </p>
          <Button onClick={() => setShowGenerate(true)} className="mt-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
            <Sparkles size={16} />
            Generate my plan
          </Button>
        </motion.div>
      )}

      <AnimatePresence>
        {showGenerate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="glass-strong mb-6 rounded-3xl p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Plan preferences</h2>
              <button onClick={() => setShowGenerate(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/5">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">Goal</label>
                <div className="grid grid-cols-3 gap-2">
                  {GOALS.map((g) => (
                    <button key={g.value} onClick={() => setGoal(g.value)}
                      className={cn('rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                        goal === g.value ? 'border-emerald-400/60 bg-emerald-400/10 text-white' : 'border-white/10 text-slate-400 hover:border-white/25')}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">Fitness level</label>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((l) => (
                    <button key={l.value} onClick={() => setLevel(l.value)}
                      className={cn('rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                        level === l.value ? 'border-emerald-400/60 bg-emerald-400/10 text-white' : 'border-white/10 text-slate-400 hover:border-white/25')}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Days per week: <span className="text-emerald-400">{daysPerWeek}</span>
                </label>
                <input type="range" min={2} max={7} value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                  className="w-full accent-emerald-500" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">Equipment</label>
                <div className="flex flex-wrap gap-1.5">
                  {EQUIPMENT_OPTIONS.map((opt) => (
                    <button key={opt} onClick={() => toggleEquipment(opt)}
                      className={cn('rounded-full border px-3 py-1 text-[11px] font-medium transition-all',
                        equipment.includes(opt) ? 'border-emerald-400/60 bg-emerald-400/10 text-white' : 'border-white/10 text-slate-400 hover:border-white/25')}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Input label="Focus areas (optional)" value={focus} onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g. chest & biceps, glutes & quads, back thickness…" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Preferred Workout Split / Style
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SPLIT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSplitType(opt)}
                      className={cn(
                        'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                        splitType === opt
                          ? 'border-emerald-400/60 bg-emerald-400/15 text-white shadow-sm'
                          : 'border-white/10 text-slate-400 hover:border-white/25'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Target Session Duration
                </label>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {DURATION_OPTIONS.map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setWorkoutDuration(dur)}
                      className={cn(
                        'rounded-xl border px-2 py-1.5 text-xs font-semibold text-center transition-all',
                        workoutDuration === dur
                          ? 'border-emerald-400/60 bg-emerald-400/15 text-white'
                          : 'border-white/10 text-slate-400 hover:border-white/25'
                      )}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Preferences & Special Instructions
                  </label>
                  <span className="text-[11px] text-emerald-400/80">Customize how & what you want to train</span>
                </div>
                <textarea
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="Describe your ideal workout (e.g. Focus on hypertrophy with drop sets, avoid barbell squats due to knee pain, emphasize upper chest, include 5-min mobility warmup...)"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowGenerate(false)}>Cancel</Button>
              <Button loading={generating} onClick={generate}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
                <Sparkles size={16} />
                Generate
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activePlan && (
        <>
          <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <ChevronLeft size={16} />
              {week[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {" "}–{" "}
              {week[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              <ChevronRight size={16} />
            </div>
            <span className="text-xs">
              {activePlan.fitnessLevel && <span className="capitalize">{activePlan.fitnessLevel}</span>}
              {activePlan.goal && <span> · <span className="capitalize">{activePlan.goal}</span></span>}
              {activePlan.equipment?.length > 0 && <span> · {activePlan.equipment.join(', ')}</span>}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {week.map((date, i) => {
              const day = activePlan.days.find((d) => d.dayNumber === i)
              const today = toISODate(date) === toISODate(new Date())
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    'flex flex-col rounded-2xl border p-3 transition-all',
                    today ? 'border-emerald-400/50 bg-emerald-400/[0.04]' : 'border-white/10 bg-white/[0.02]',
                  )}
                >
                  <div className="mb-2 flex flex-col">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {DAY_LABELS[i]}
                    </span>
                    <span className="text-sm font-bold text-white">{date.getDate()}</span>
                  </div>

                  {!day || day.restDay ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-white/[0.03] py-4">
                      <span className="text-2xl">🧘</span>
                      <span className="mt-1 text-[11px] font-medium text-slate-500">Rest day</span>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col rounded-xl bg-white/[0.04] p-2.5">
                      <div
                        className="cursor-pointer group/title"
                        onClick={() => openFullPlanDay(day)}
                        title="Click to view workout demonstration, sets, reps & rest timer"
                      >
                        <p className="text-xs font-bold text-white group-hover/title:text-emerald-300 transition-colors leading-tight flex items-center justify-between">
                          <span>{day.workoutName || 'Workout'}</span>
                          <Play size={9} className="text-emerald-400 opacity-60 group-hover/title:opacity-100 fill-emerald-400" />
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{day.muscleGroup}</p>
                      </div>
                      <div className="mt-1.5 space-y-1">
                        {day.exercises?.slice(0, 3).map((ex, exi) => (
                          <button
                            key={exi}
                            onClick={(e) => {
                              e.stopPropagation();
                              openExerciseInPlanDay(day, ex);
                            }}
                            className="flex w-full items-center gap-1 line-clamp-1 text-[10px] text-slate-300 hover:text-violet-300 transition-colors text-left"
                            title="Watch exercise demonstration video & rest timer"
                          >
                            <Play size={8} className="text-violet-400 shrink-0 fill-current" />
                            <span className="truncate">{ex.name}</span>
                            {ex.sets ? <span className="text-slate-500">· {ex.sets}×{ex.reps ?? ''}</span> : ''}
                            {ex.restSec ? <span className="text-amber-400/80">· {ex.restSec}s</span> : ''}
                          </button>
                        ))}
                        {(day.exercises?.length ?? 0) > 3 && (
                          <button
                            onClick={() => openFullPlanDay(day)}
                            className="text-[10px] text-emerald-400 hover:underline block text-left"
                          >
                            +{(day.exercises?.length ?? 0) - 3} more · view all
                          </button>
                        )}
                      </div>
                      <div className="mt-auto flex gap-1 pt-2">
                        <button
                          onClick={async () => { await applyDay(day); }}
                          className="flex-1 rounded-lg bg-emerald-500/15 px-1.5 py-1.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          <Check size={12} className="mx-auto" />
                        </button>
                        <button
                          onClick={() => startEdit(day)}
                          className="rounded-lg bg-white/10 px-1.5 py-1.5 text-[10px] font-semibold text-slate-300 hover:bg-white/20"
                        >
                          <PenLine size={12} className="mx-auto" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {plans.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Your plans</h3>
              <div className="space-y-2">
                {plans.map((p) => (
                  <div key={p.id} className={cn(
                    'flex items-center justify-between rounded-2xl border px-4 py-3',
                    p.id === activePlan.id ? 'border-emerald-400/50 bg-emerald-400/[0.05]' : 'border-white/10 bg-white/[0.02]',
                  )}>
                    <div className="flex items-center gap-3">
                      <Dumbbell size={18} className={p.id === activePlan.id ? 'text-emerald-400' : 'text-slate-500'} />
                      <div>
                        <p className="text-sm font-semibold text-white">{p.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {p.goal && <span className="capitalize">{p.goal}</span>} · {p.daysPerWeek} days/week
                          {p.generatedByAI && ' · ✨ Suggested'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void selectPlan(p)}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/20"
                      >
                        {p.id === activePlan.id ? 'Active' : 'Activate'}
                      </button>
                      <button
                        onClick={() => void deletePlan(p)}
                        className="rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-rose-300 hover:bg-rose-500/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit day modal */}
      <AnimatePresence>
        {editingDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setEditingDay(null)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong w-full max-w-lg rounded-3xl p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-white">Edit {DAY_LABELS[editingDay.dayNumber]}</h2>
                <button onClick={() => setEditingDay(null)} className="rounded-lg p-1 text-slate-400 hover:bg-white/5">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <Input label="Workout name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Push Day" />
                <Input label="Muscle group" value={editMuscle} onChange={(e) => setEditMuscle(e.target.value)} placeholder="Chest, Shoulders, Triceps" />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Exercises</label>
                    <button onClick={addExerciseRow} className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/20">
                      <Plus size={13} /> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editExercises.map((ex, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          value={ex.name}
                          onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                          placeholder="Exercise name"
                          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
                        />
                        <input
                          value={ex.sets ?? 3}
                          onChange={(e) => updateExercise(idx, 'sets', Number(e.target.value) || undefined)}
                          type="number"
                          min={1}
                          placeholder="sets"
                          title="Sets"
                          className="w-16 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-sm text-slate-100 focus:border-emerald-400/50 focus:outline-none"
                        />
                        <input
                          value={ex.reps ?? ''}
                          onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
                          placeholder="reps"
                          title="Reps"
                          className="w-16 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-400/50 focus:outline-none"
                        />
                        <button onClick={() => setEditExercises((prev) => prev.filter((_, i) => i !== idx))}
                          className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setEditingDay(null)}>Cancel</Button>
                <Button loading={savingDay} onClick={saveDay} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
                  <Save size={15} />
                  Save day
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExerciseDemo
        open={Boolean(demoExerciseName || demoDay)}
        onClose={() => {
          setDemoExerciseName(null);
          setDemoDay(null);
          setDemoCustomSets(null);
          setDemoCustomReps(null);
          setDemoCustomRestSec(null);
        }}
        exerciseName={demoExerciseName}
        workoutName={demoDay?.workoutName}
        customSets={demoCustomSets}
        customReps={demoCustomReps}
        customRestSec={demoCustomRestSec}
        workoutExercises={demoDay?.exercises?.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          restSec: e.restSec,
        }))}
        onSelectExercise={(exName) => {
          setDemoExerciseName(exName);
          const matched = demoDay?.exercises?.find(
            (e) => e.name.toLowerCase() === exName.toLowerCase()
          );
          if (matched) {
            setDemoCustomSets(matched.sets || null);
            setDemoCustomReps(matched.reps || null);
            setDemoCustomRestSec(matched.restSec || 90);
          }
        }}
      />
    </div>
  )
}