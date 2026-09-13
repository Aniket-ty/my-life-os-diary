import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookHeart,
  Dumbbell,
  Sparkles,
  ListTodo,
  ScanLine,
  ArrowRight,
  Flame,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { diaryService, type DiaryEntry } from '@/services/diary'
import { fitnessService, type DailySummary, type Workout } from '@/services/fitness'
import { todoService, type Todo } from '@/services/todo'
import { greeting, toISODate, timeAgo, moodEmoji } from '@/lib/utils'
import { AnimatedCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const modules = [
  {
    to: '/diary',
    title: 'Diary',
    desc: 'Capture thoughts, moods & moments',
    icon: BookHeart,
    gradient: 'from-amber-500/25 to-orange-500/10',
    iconColor: 'text-gold-300',
    border: 'hover:border-gold-500/40',
    glow: 'group-hover:shadow-gold-500/20',
  },
  {
    to: '/fitness',
    title: 'Fitness',
    desc: 'Workouts, nutrition & goals',
    icon: Dumbbell,
    gradient: 'from-emerald-500/25 to-teal-500/10',
    iconColor: 'text-emerald-300',
    border: 'hover:border-emerald-500/40',
    glow: 'group-hover:shadow-emerald-500/20',
  },
  {
    to: '/ai',
    title: 'AI Coach',
    desc: 'Ask me anything, track smart',
    icon: Sparkles,
    gradient: 'from-violet-brand/30 to-purple-500/10',
    iconColor: 'text-violet-brand',
    border: 'hover:border-violet-brand/50',
    glow: 'group-hover:shadow-violet-brand/25',
  },
  {
    to: '/todo',
    title: 'To-Do',
    desc: 'Tasks, priorities & reminders',
    icon: ListTodo,
    gradient: 'from-sky-500/25 to-blue-500/10',
    iconColor: 'text-sky-300',
    border: 'hover:border-sky-500/40',
    glow: 'group-hover:shadow-sky-500/20',
  },
  {
    to: '/body-scan',
    title: 'Body Scan',
    desc: 'Track your body transformation',
    icon: ScanLine,
    gradient: 'from-rose-500/25 to-red-500/10',
    iconColor: 'text-rose-300',
    border: 'hover:border-rose-500/40',
    glow: 'group-hover:shadow-rose-500/20',
    wide: true,
  },
]

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const today = toISODate(new Date())

  useEffect(() => {
    diaryService.list(undefined, 1, 5).then((r) => setEntries(r.entries)).catch(() => {})
    fitnessService.getSummary(today).then(setSummary).catch(() => {})
    todoService.list().then(setTodos).catch(() => {})
    fitnessService.listWorkouts(today).then((r) => setWorkouts(r)).catch(() => {})
  }, [today])

  const openTodos = todos.filter((t) => !t.isCompleted)
  const doneTodos = todos.filter((t) => t.isCompleted)
  const donePct =
    todos.length > 0 ? Math.round((doneTodos.length / todos.length) * 100) : 0
  const caloriesLeft = Math.max(0, (summary?.goals?.dailyCalories ?? 0) - (summary?.totals?.calories ?? 0))
  const workoutsToday = workouts.filter((w) => toISODate(w.workoutDate) === today).length
  const latestEntry = entries[0]

const stats = [
    {
      label: 'Diary entries',
      value: entries.length,
      hint: latestEntry ? `Last ${timeAgo(latestEntry.createdAt)}` : 'Start writing today',
      icon: BookHeart,
      color: 'text-gold-300',
      bg: 'from-amber-500/20 to-orange-500/5',
      bar: 'from-gold-500 to-amber-600',
      to: '/diary',
    },
    {
      label: 'Calories left',
      value: caloriesLeft,
      hint: `${summary?.totals?.calories ?? 0} kcal consumed`,
      icon: Flame,
      color: 'text-orange-300',
      bg: 'from-orange-500/20 to-red-500/5',
      bar: 'from-orange-400 to-rose-500',
      to: '/fitness',
    },
    {
      label: 'Workouts today',
      value: workoutsToday,
      hint: workoutsToday ? 'Great job!' : 'Time to move',
      icon: Dumbbell,
      color: 'text-emerald-300',
      bg: 'from-emerald-500/20 to-teal-500/5',
      bar: 'from-emerald-400 to-teal-500',
      to: '/fitness',
    },
    {
      label: 'Tasks done',
      value: `${donePct}%`,
      hint: `${openTodos.length} open · ${doneTodos.length} done`,
      icon: CheckCircle2,
      color: 'text-sky-300',
      bg: 'from-sky-500/20 to-blue-500/5',
      bar: 'from-sky-400 to-indigo-500',
      to: '/todo',
    },
  ]

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 rounded-3xl bg-gradient-to-br from-violet-brand/15 via-transparent to-gold-500/10 p-6 glass sm:p-8"
      >
        <p className="text-sm font-medium uppercase tracking-widest text-violet-brand">
          {greeting()}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">
          {user?.name?.split(' ')[0]}, welcome back 👋
        </h1>
        <p className="mt-2 max-w-lg text-sm text-slate-300">
          Here's your Life OS at a glance — every module is synced to your cloud.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i }}
            onClick={() => navigate(s.to)}
            className="glass group cursor-pointer rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.07]"
          >
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.bg}`}>
              <s.icon size={19} className={s.color} />
            </div>
            <p className="font-display text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs font-medium text-slate-400">{s.label}</p>
            <p className="mt-1 truncate text-[11px] text-slate-500">{s.hint}</p>
          </motion.div>
        ))}
      </div>

      {/* Module cards */}
      <h2 className="mb-4 font-display text-lg font-semibold text-white">Your modules</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {modules.map((m, i) => (
          <motion.div
            key={m.to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i + 0.2 }}
            className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${m.gradient} p-5 transition-all duration-300 hover:-translate-y-1 ${m.border} ${m.wide ? '' : ''}`}
            onClick={() => navigate(m.to)}
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ${m.iconColor}`}>
                <m.icon size={22} />
              </div>
              <ArrowRight
                size={18}
                className="text-slate-500 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
              />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-white">{m.title}</h3>
            <p className="mt-0.5 text-sm text-slate-400">{m.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AnimatedCard delay={0.3} className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-semibold text-white">Today's focus</h3>
            <Badge tone="sky">{openTodos.length} open</Badge>
          </div>
          {openTodos.length === 0 ? (
            <p className="text-sm text-slate-500">All clear — enjoy your day ✨</p>
          ) : (
            <ul className="space-y-2.5">
              {openTodos.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      t.priority === 'high' ? 'bg-rose-400' : t.priority === 'medium' ? 'bg-amber-400' : 'bg-sky-400'
                    }`}
                  />
                  <span className="flex-1 truncate text-sm text-slate-200">{t.title}</span>
                  <TrendingUp size={14} className="text-slate-600" />
                </li>
              ))}
            </ul>
          )}
        </AnimatedCard>

        <AnimatedCard delay={0.38} className="p-5">
          {latestEntry ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display font-semibold text-white">Latest diary entry</h3>
                <span className="text-lg">{moodEmoji(latestEntry.mood)}</span>
              </div>
              <p className="font-display text-base font-semibold text-gold-300">
                {latestEntry.title || 'Untitled'}
              </p>
              <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-400">
                {latestEntry.content}
              </p>
              <button
                onClick={() => navigate('/diary')}
                className="mt-3 text-xs font-semibold text-gold-300 hover:text-gold-400"
              >
                Open the journal →
              </button>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-6 text-center">
              <BookHeart size={28} className="mb-2 text-gold-300/60" />
              <p className="text-sm text-slate-400">
                No diary entries yet. Pour your thoughts onto paper.
              </p>
              <button
                onClick={() => navigate('/diary')}
                className="mt-3 text-xs font-semibold text-gold-300 hover:text-gold-400"
              >
                Write your first entry →
              </button>
            </div>
          )}
        </AnimatedCard>
      </div>
    </div>
  )
}