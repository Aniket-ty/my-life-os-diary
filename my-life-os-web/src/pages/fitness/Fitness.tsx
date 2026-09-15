import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell,
  Plus,
  CheckCircle2,
  Circle,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Utensils,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Timer,
  NotebookPen,
  ScanLine,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { fitnessService, type DailySummary, type Workout, type FitnessGoals } from '@/services/fitness'
import { bodyScanService } from '@/services/bodyScan'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/PageHeader'
import { Loading } from '@/components/ui/Loading'
import { toISODate, formatDay, MEALS, MEAL_LABEL } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { AddWorkoutModal } from './AddWorkoutModal'
import { LogFoodModal } from './LogFoodModal'

const DEFAULT_GOALS: FitnessGoals = {
  dailyCalories: 2097,
  proteinG: 150,
  carbsG: 150,
  fatG: 89,
}

export function Fitness() {
  const [date, setDate] = useState(toISODate(new Date()))
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [showWorkout, setShowWorkout] = useState(false)
  const [showFood, setShowFood] = useState(false)
  const [scanChecked, setScanChecked] = useState(false)
  const [hasScan, setHasScan] = useState(true)
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, w] = await Promise.all([
        fitnessService.getSummary(date),
        fitnessService.listWorkouts(date),
      ])
      setSummary(s)
      setWorkouts(w)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load fitness', 'error')
    } finally {
      setLoading(false)
    }
  }, [date, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    bodyScanService.list()
      .then((scans) => setHasScan(scans.length > 0))
      .catch(() => setHasScan(true))
      .finally(() => setScanChecked(true))
  }, [])

  const goals = summary?.goals ?? DEFAULT_GOALS
  const totals = summary?.totals ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }

  async function toggleWorkout(w: Workout) {
    try {
      const updated = await fitnessService.updateWorkout(w.id, {
        status: w.status === 'completed' ? 'planned' : 'completed',
      })
      setWorkouts((prev) => prev.map((x) => (x.id === w.id ? updated : x)))
      toast(updated.status === 'completed' ? 'Workout complete' : 'Marked as planned')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error')
    }
  }

  async function deleteFood(id: string) {
    try {
      await fitnessService.deleteFood(id)
      await load()
      toast('Food entry removed')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    }
  }

  const macros = [
    { label: 'Protein', value: totals.proteinG, goal: goals.proteinG ?? 150, unit: 'g', icon: Beef, color: 'bg-emerald-400', text: 'text-emerald-300' },
    { label: 'Carbs', value: totals.carbsG, goal: goals.carbsG ?? 150, unit: 'g', icon: Wheat, color: 'bg-amber-400', text: 'text-amber-300' },
    { label: 'Fat', value: totals.fatG, goal: goals.fatG ?? 89, unit: 'g', icon: Droplets, color: 'bg-sky-400', text: 'text-sky-300' },
  ]

  return (
    <div>
      <PageHeader
        title="Fitness"
        subtitle="Workouts, nutrition & daily goals"
        icon={<Dumbbell size={22} className="text-emerald-300" />}
        accent="from-emerald-500 to-teal-500"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDate((d) => toISODate(new Date(new Date(d).getTime() - 86400000)))}
              className="glass rounded-xl p-2 text-slate-300 hover:bg-white/10"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[140px] text-center text-sm font-semibold text-slate-200">
              {formatDay(date).split(',')[0]},{' '}
              {formatDay(date).split(',').slice(1, 3).join(' ')}
            </span>
            <button
              onClick={() => setDate((d) => toISODate(new Date(new Date(d).getTime() + 86400000)))}
              className="glass rounded-xl p-2 text-slate-300 hover:bg-white/10"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />

      {!scanChecked ? (
        <Loading />
      ) : !hasScan ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-md pt-24 text-center"
        >
          <div className="glass-strong rounded-3xl p-10">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/25 to-orange-500/10">
              <ScanLine size={28} className="text-rose-300" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Complete your body scan first</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
              Nutrition targets (calories, protein, carbs, fat) are calculated from your body measurements.
              Log a quick body scan to unlock your personalized targets.
            </p>
            <Link to="/body-scan">
              <Button className="mt-6 bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25">
                <ScanLine size={16} />
                Go to Body Scan
              </Button>
            </Link>
          </div>
        </motion.div>
      ) : loading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          {/* Nutrition overview */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5 lg:col-span-1"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400">Calories</p>
                <Flame size={18} className="text-orange-400" />
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-white">
                {totals.calories}
                <span className="text-base font-medium text-slate-500"> / {goals.dailyCalories ?? '—'} kcal</span>
              </p>
              <div className="mt-3">
                <ProgressBar value={totals.calories} max={goals.dailyCalories ?? 2097} color="bg-gradient-to-r from-orange-400 to-rose-500" height="h-3" />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {summary?.remaining?.calories && summary.remaining.calories > 0
                  ? `${summary.remaining.calories} kcal remaining`
                  : goals.dailyCalories && totals.calories > goals.dailyCalories
                    ? `${totals.calories - goals.dailyCalories} kcal over — watch it!`
                    : 'Goal reached 🎉'}
              </p>
            </motion.div>

            {/* Macro bars */}
            <div className="glass rounded-2xl p-5 lg:col-span-2">
              <p className="mb-4 text-sm font-medium text-slate-400">Macros</p>
              <div className="space-y-4">
                {macros.map((m) => (
                    <div key={m.label}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-300">
                          <m.icon size={15} className={m.text} />
                          {m.label}
                        </span>
                        <span className="font-medium text-slate-200">
                          {m.value}
                          <span className="text-slate-500"> / {m.goal}{m.unit}</span>
                        </span>
                      </div>
                      <ProgressBar value={m.value} max={m.goal} color={m.color} />
                    </div>
                ))}
              </div>
            </div>
          </div>

          {/* Workouts */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">Workouts</h2>
              <Button size="sm" onClick={() => setShowWorkout(true)}>
                <Plus size={15} />
                Add workout
              </Button>
            </div>
            {workouts.length === 0 ? (
              <div className="glass flex flex-col items-center justify-center rounded-2xl py-12 text-center">
                <Dumbbell size={30} className="mb-2 text-emerald-300/50" />
                <p className="text-sm text-slate-400">No workouts on this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {workouts.map((w) => (
                    <motion.div
                      key={w.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'glass rounded-2xl p-4 transition-all',
                        w.status === 'completed' && 'border-emerald-500/30 bg-emerald-500/[0.05]',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleWorkout(w)}>
                          {w.status === 'completed' ? (
                            <CheckCircle2 size={22} className="text-emerald-400" />
                          ) : (
                            <Circle size={22} className="text-slate-600 hover:text-slate-400" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p
                            className={cn(
                              'font-semibold text-white',
                              w.status === 'completed' && 'text-slate-400 line-through',
                            )}
                          >
                            {w.name}
                          </p>
                          <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            {w.durationMin && (
                              <span className="flex items-center gap-1">
                                <Timer size={12} /> {w.durationMin} min
                              </span>
                            )}
                            {w.totalCaloriesBurned && (
                              <span className="flex items-center gap-1">
                                <Flame size={12} /> {w.totalCaloriesBurned} kcal
                              </span>
                            )}
                            {w.exercises.length > 0 && (
                              <span>{w.exercises.length} exercises</span>
                            )}
                          </div>
                        </div>
                        <Badge tone={w.status === 'completed' ? 'emerald' : 'default'}>
                          {w.status}
                        </Badge>
                      </div>
                      {w.exercises.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                          {w.exercises.map((ex) => (
                            <span
                              key={ex.id ?? ex.exerciseName}
                              className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300"
                            >
                              {ex.exerciseName}
                              {ex.sets ? ` · ${ex.sets}×${ex.reps ?? ''}` : ''}
                              {ex.weightKg ? ` · ${ex.weightKg} kg` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Nutrition log */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">Nutrition</h2>
              <Button size="sm" variant="secondary" onClick={() => setShowFood(true)}>
                <Plus size={15} />
                Log food
              </Button>
            </div>
            <div className="space-y-4">
              {MEALS.map((meal) => {
                const items = summary?.byMeal?.[meal] ?? []
                if (items.length === 0) return null
                return (
                  <div key={meal}>
                    <div className="mb-2 flex items-center gap-2">
                      <Utensils size={14} className="text-emerald-300" />
                      <h3 className="text-sm font-semibold text-slate-300">{MEAL_LABEL[meal]}</h3>
                      <span className="text-xs text-slate-500">
                        {items.reduce((s, i) => s + i.calories, 0)} kcal
                      </span>
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="group glass flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-100">{item.foodName}</p>
                              {item.aiSuggested && <Badge tone="violet" className="normal-case">AI</Badge>}
                            </div>
                            {item.quantity && <p className="text-xs text-slate-500">{item.quantity}</p>}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.proteinG ? `P ${item.proteinG}g ` : ''}
                            {item.carbsG ? `C ${item.carbsG}g ` : ''}
                            {item.fatG ? `F ${item.fatG}g` : ''}
                          </div>
                          <p className="w-16 text-right font-semibold text-white">{item.calories}</p>
                          <button
                            onClick={() => deleteFood(item.id)}
                            className="text-slate-600 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {summary && summary.logCount === 0 && (
                <div className="glass flex flex-col items-center justify-center rounded-2xl py-10 text-center">
                  <NotebookPen size={26} className="mb-2 text-emerald-300/50" />
                  <p className="text-sm text-slate-400">Nothing logged yet today</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <AddWorkoutModal open={showWorkout} onClose={() => setShowWorkout(false)} onSaved={(w) => { setWorkouts((prev) => [w, ...prev]); load() }} />
      <LogFoodModal open={showFood} onClose={() => setShowFood(false)} onSaved={() => load()} />
    </div>
  )
}