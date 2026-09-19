import { useState, useEffect } from 'react'
import { Plus, Trash2, Play } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { fitnessService, type Workout } from '@/services/fitness'
import { offlineSync } from '@/services/offlineSync'
import { equipmentService, type ExerciseDetail } from '@/services/equipment'
import { ExerciseDemo } from '@/components/fitness/ExerciseDemo'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toISODate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ExerciseForm {
  exerciseName: string
  sets?: string
  reps?: string
  weightKg?: string
}

export function AddWorkoutModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: (workout: Workout) => void
}) {
  const [name, setName] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [status, setStatus] = useState<'planned' | 'completed'>('planned')
  const [durationMin, setDurationMin] = useState('')
  const [calories, setCalories] = useState('')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<ExerciseForm[]>([
    { exerciseName: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [demoExerciseName, setDemoExerciseName] = useState<string | null>(null)
  const [catalogExercises, setCatalogExercises] = useState<ExerciseDetail[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      equipmentService.listExercises().then(setCatalogExercises).catch(() => {})
    }
  }, [open])

  function reset() {
    setName('')
    setDate(toISODate(new Date()))
    setStatus('planned')
    setDurationMin('')
    setCalories('')
    setNotes('')
    setExercises([{ exerciseName: '' }])
  }

  async function save() {
    if (!name.trim()) {
      toast('Give the workout a name', 'error')
      return
    }
    const cleanExercises = exercises
      .filter((e) => e.exerciseName.trim())
      .map((e) => ({
        exerciseName: e.exerciseName.trim(),
        sets: e.sets ? Number(e.sets) : undefined,
        reps: e.reps ? Number(e.reps) : undefined,
        weightKg: e.weightKg ? Number(e.weightKg) : undefined,
      }))

    setSaving(true)
    try {
      const workout = await fitnessService.createWorkout({
        name: name.trim(),
        workoutDate: date,
        status,
        durationMin: durationMin ? Number(durationMin) : undefined,
        totalCaloriesBurned: calories ? Number(calories) : undefined,
        notes: notes || undefined,
        exercises: cleanExercises,
      })
      toast('Workout added')
      reset()
      onSaved(workout)
      onClose()
    } catch (err) {
      const queued = offlineSync.queueWorkout({
        name: name.trim(),
        workoutDate: date,
        durationMin: durationMin ? Number(durationMin) : undefined,
        totalCaloriesBurned: calories ? Number(calories) : undefined,
        notes: notes || undefined,
        exercises: cleanExercises.map((e) => ({
          name: e.exerciseName,
          sets: e.sets || 3,
          reps: String(e.reps || '10'),
          weightKg: e.weightKg,
        })),
      })
      toast('Saved offline! Will automatically sync once server connects.', 'info')
      reset()
      onSaved({
        id: queued.localId,
        name: name.trim(),
        workoutDate: date,
        status,
        durationMin: durationMin ? Number(durationMin) : undefined,
        totalCaloriesBurned: calories ? Number(calories) : undefined,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        exercises: cleanExercises.map((e, idx) => ({
          id: `offline_ex_${idx}`,
          exerciseName: e.exerciseName,
          sets: e.sets || 3,
          reps: e.reps || 10,
          weightKg: e.weightKg,
        })),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function updateExercise(index: number, field: keyof ExerciseForm, value: string) {
    setExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    )
  }

  return (
    <>
      <Modal open={open} onClose={() => { onClose(); reset() }} title="Add workout" wide>
      <div className="space-y-4">
        <Input
          label="Workout name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Push day, Morning run…"
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Status</label>
            <div className="grid grid-cols-2 rounded-xl bg-white/[0.04] p-1">
              {(['planned', 'completed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    'rounded-lg py-2 text-sm font-medium capitalize transition-all',
                    status === s ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Duration (min)"
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            placeholder="60"
          />
          <Input
            label="Calories burned"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="450"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Exercises
            </label>
            <button
              onClick={() => setExercises((prev) => [...prev, { exerciseName: '' }])}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
            >
              <Plus size={14} />
              Add exercise
            </button>
          </div>
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <div key={i} className="glass grid grid-cols-[1fr_64px_64px_72px_36px_36px] items-center gap-2 rounded-xl p-2">
                <div className="relative">
                  <input
                    value={ex.exerciseName}
                    onChange={(e) => updateExercise(i, 'exerciseName', e.target.value)}
                    list="catalog-exercise-suggestions"
                    placeholder="Bench press, Lat pulldown…"
                    className="w-full rounded-lg border border-white/5 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none"
                  />
                </div>
                <input
                  value={ex.sets ?? ''}
                  onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                  placeholder="Sets"
                  className="rounded-lg border border-white/5 bg-white/[0.04] px-2 py-2 text-center text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
                />
                <input
                  value={ex.reps ?? ''}
                  onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                  placeholder="Reps"
                  className="rounded-lg border border-white/5 bg-white/[0.04] px-2 py-2 text-center text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
                />
                <input
                  value={ex.weightKg ?? ''}
                  onChange={(e) => updateExercise(i, 'weightKg', e.target.value)}
                  placeholder="kg"
                  className="rounded-lg border border-white/5 bg-white/[0.04] px-2 py-2 text-center text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!ex.exerciseName.trim()}
                  onClick={() => setDemoExerciseName(ex.exerciseName.trim())}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-violet-500/20 hover:text-violet-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Watch HD Exercise Demonstration"
                >
                  <Play size={14} className="fill-current" />
                </button>
                <button
                  onClick={() => setExercises((prev) => prev.filter((_, idx) => idx !== i))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Felt strong today…"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => { onClose(); reset() }}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save} className="bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
            Add workout
          </Button>
        </div>
        <datalist id="catalog-exercise-suggestions">
          {catalogExercises.map((c) => (
            <option key={c.id} value={c.name}>{c.primaryMuscle}</option>
          ))}
        </datalist>
      </div>
    </Modal>

      <ExerciseDemo
        open={Boolean(demoExerciseName)}
        onClose={() => setDemoExerciseName(null)}
        exerciseName={demoExerciseName}
      />
    </>
  )
}