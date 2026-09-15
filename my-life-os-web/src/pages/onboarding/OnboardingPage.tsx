import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Ruler, Scale, Target, Flame, HeartPulse, Droplets,
  ArrowLeft, ArrowRight, Sparkles, Check, Salad, Dumbbell,
} from 'lucide-react'
import { useAuth, type OnboardingResult } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

const STEPS = ['Your profile', 'Body scan', 'Lifestyle', 'Your numbers']

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise', emoji: '🪑' },
  { value: 'light', label: 'Light', desc: '1–3 workouts / week', emoji: '🚶' },
  { value: 'moderate', label: 'Moderate', desc: '3–5 workouts / week', emoji: '🏃' },
  { value: 'active', label: 'Active', desc: '6–7 workouts / week', emoji: '🏋️' },
  { value: 'veryActive', label: 'Very active', desc: 'Hard training + physical job', emoji: '🔥' },
]

const GOALS = [
  { value: 'lose', label: 'Lose weight', desc: 'Slight calorie deficit', emoji: '📉' },
  { value: 'maintain', label: 'Maintain', desc: 'Keep current weight', emoji: '⚖️' },
  { value: 'gain', label: 'Build muscle', desc: 'Calorie surplus', emoji: '📈' },
]

function StepCard({ step, title, subtitle, children, active }: {
  step: number; title: string; subtitle: string; children: React.ReactNode; active: boolean
}) {
  return (
    <AnimatePresence mode="wait">
      {active && (
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <h2 className="font-display text-xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user, completeOnboarding } = useAuth()
  const { toast } = useToast()

  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<OnboardingResult | null>(null)

  // Step 1 — profile
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [heightCm, setHeightCm] = useState('')
  // Step 2 — body
  const [weightKg, setWeightKg] = useState('')
  const [bodyFatPct, setBodyFatPct] = useState('')
  const [muscleMassKg, setMuscleMassKg] = useState('')
  // Step 3 — lifestyle
  const [activityLevel, setActivityLevel] = useState('moderate')
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain')

  const canContinue = () => {
    if (step === 0) return age.trim() && heightCm.trim()
    if (step === 1) return weightKg.trim()
    if (step === 2) return true
    return false
  }

  const next = () => {
    if (step < 2) {
      setStep(step + 1)
      return
    }
    if (step === 2) submit()
  }

  const submit = async () => {
    setBusy(true)
    try {
      const res = await completeOnboarding({
        age: Number(age),
        gender,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        bodyFatPct: bodyFatPct ? Number(bodyFatPct) : undefined,
        muscleMassKg: muscleMassKg ? Number(muscleMassKg) : undefined,
        activityLevel,
        goal,
      })
      setResult(res)
      setStep(3)
    } catch (err) {
      toast(err instanceof Error ? err.message.split(':').pop() ?? 'Something went wrong' : 'Failed to complete onboarding', 'error')
    } finally {
      setBusy(false)
    }
  }

  const finish = () => {
    toast('Your Life OS is personalized! 🎉')
    navigate('/', { replace: true })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void p-4">
      <div className="bg-aurora" />
      <div className="bg-stars" />
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-violet-brand/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-gold-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-brand to-indigo-500 shadow-xl shadow-violet-brand/40">
            <Sparkles size={26} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white glow-gold">
            Let's set up your <span className="text-gold-300">Life OS</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Hi {user?.name?.split(' ')[0]} — a quick <span className="text-slate-200">body scan</span> unlocks your
            calories, macros and workout plan.
          </p>
        </div>

        {/* Progress steps */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={cn(
                'flex h-8 items-center justify-center rounded-full px-3 text-xs font-semibold transition-all',
                i <= step
                  ? 'bg-gradient-to-r from-violet-brand to-indigo-500 text-white shadow-lg shadow-violet-brand/25'
                  : 'bg-white/5 text-slate-500',
              )}>
                {i + 1}
              </div>
              <span className={cn('hidden text-[11px] font-medium md:block', i <= step ? 'text-slate-200' : 'text-slate-500')}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className={cn('h-px flex-1', i < step ? 'bg-violet-brand/60' : 'bg-white/10')} />}
            </div>
          ))}
        </div>

        <div className="glass-strong rounded-3xl p-6 shadow-2xl sm:p-8">
          <StepCard step={0} active={step === 0} title="Your profile" subtitle="Basic details for accurate calculations">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Age" type="number" min={10} max={100} value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" icon={<User size={16} />} />
                <Input label="Height (cm)" type="number" min={100} max={250} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="175" icon={<Ruler size={16} />} />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">Gender</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['male', 'female'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={cn(
                        'rounded-xl border px-4 py-3 text-sm font-semibold transition-all',
                        gender === g
                          ? 'border-violet-brand/60 bg-violet-brand/15 text-white shadow-lg shadow-violet-brand/10'
                          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25',
                      )}
                    >
                      {g === 'male' ? '♂ Male' : '♀ Female'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </StepCard>

          <StepCard step={1} active={step === 1} title="Body scan" subtitle="Your starting measurements (the app remembers these to track progress)">
            <div className="space-y-4">
              <Input label="Current weight (kg)" type="number" min={30} max={300} step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="80" icon={<Scale size={16} />} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Body fat %" type="number" min={2} max={70} step="0.1" value={bodyFatPct} onChange={(e) => setBodyFatPct(e.target.value)} placeholder="20 (optional)" icon={<Droplets size={16} />} />
                <Input label="Muscle mass (kg)" type="number" min={10} max={150} step="0.1" value={muscleMassKg} onChange={(e) => setMuscleMassKg(e.target.value)} placeholder="35 (optional)" icon={<Dumbbell size={16} />} />
              </div>
              <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-xs text-slate-500">
                Don't know body fat? Leave it blank — we'll estimate lean mass for you.
              </p>
            </div>
          </StepCard>

          <StepCard step={2} active={step === 2} title="Lifestyle" subtitle="How active are you, and what's your goal?">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">Activity level</label>
                <div className="grid grid-cols-1 gap-2">
                  {ACTIVITY_LEVELS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setActivityLevel(a.value)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                        activityLevel === a.value
                          ? 'border-emerald-400/60 bg-emerald-400/10'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/25',
                      )}
                    >
                      <span className="text-xl">{a.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{a.label}</p>
                        <p className="text-xs text-slate-400">{a.desc}</p>
                      </div>
                      {activityLevel === a.value && <Check size={16} className="text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">Fitness goal</label>
                <div className="grid grid-cols-1 gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setGoal(g.value as typeof goal)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                        goal === g.value
                          ? 'border-gold-500/60 bg-gold-500/10'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/25',
                      )}
                    >
                      <span className="text-xl">{g.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{g.label}</p>
                        <p className="text-xs text-slate-400">{g.desc}</p>
                      </div>
                      {goal === g.value && <Check size={16} className="text-gold-300" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </StepCard>

          <StepCard step={3} active={step === 3} title="Your personalized numbers" subtitle="Based on your body scan — easily adjustable later">
            {result && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <Flame size={14} className="text-orange-400" /> BMR
                    </div>
                    <p className="mt-1 text-2xl font-bold text-white">{result.calculations.bmr}</p>
                    <p className="text-[11px] text-slate-500">kcal / day resting</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <HeartPulse size={14} className="text-rose-400" /> Daily burn
                    </div>
                    <p className="mt-1 text-2xl font-bold text-white">{result.calculations.tdee}</p>
                    <p className="text-[11px] text-slate-500">kcal / day TDEE</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-gold-500/15 to-amber-600/10 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-gold-300">
                    <Target size={14} /> Daily calorie target
                  </div>
                  <p className="mt-1 text-4xl font-bold text-white">{result.calculations.calorieGoal}</p>
                  <p className="text-[11px] text-slate-400">kcal / day for your goal</p>
                </div>

                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Macronutrient split</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3 text-center">
                    <Salad size={16} className="mx-auto mb-1 text-emerald-400" />
                    <p className="text-lg font-bold text-white">{result.calculations.proteinG}g</p>
                    <p className="text-[10px] uppercase text-slate-400">Protein</p>
                  </div>
                  <div className="rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-3 text-center">
                    <Sparkles size={16} className="mx-auto mb-1 text-gold-300" />
                    <p className="text-lg font-bold text-white">{result.calculations.carbsG}g</p>
                    <p className="text-[10px] uppercase text-slate-400">Carbs</p>
                  </div>
                  <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-3 text-center">
                    <Droplets size={16} className="mx-auto mb-1 text-sky-400" />
                    <p className="text-lg font-bold text-white">{result.calculations.fatG}g</p>
                    <p className="text-[10px] uppercase text-slate-400">Fat</p>
                  </div>
                </div>

                {result.calculations.leanBodyMass && (
                  <p className="rounded-xl bg-white/[0.04] px-4 py-2.5 text-center text-xs text-slate-400">
                    Estimated lean body mass: <span className="font-semibold text-white">{result.calculations.leanBodyMass} kg</span>
                  </p>
                )}
              </div>
            )}
          </StepCard>
        </div>

        <div className="mt-6 flex items-center justify-between">
          {step > 0 && step < 3 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} />
              Back
            </Button>
          )}
          <div className={cn('flex-1', step === 0 ? '' : 'text-right')}>
            {step < 3 ? (
              <Button
                onClick={next}
                disabled={!canContinue()}
                loading={busy}
                variant={step === 2 ? 'secondary' : 'primary'}
                className={cn(step === 0 && 'w-full', step === 2 && 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25')}
              >
                {step === 2 ? 'Generate my plan' : 'Continue'}
                {step !== 2 && <ArrowRight size={16} />}
              </Button>
            ) : (
              <Button onClick={finish} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
                <Check size={16} />
                Start my Life OS
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}