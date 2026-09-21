import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookHeart,
  Dumbbell,
  Sparkles,
  ListTodo,
  ScanLine,
  CalendarRange,
  Flame,
  CheckCircle2,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { diaryService, type DiaryEntry } from '@/services/diary'
import { fitnessService, type DailySummary, type Workout } from '@/services/fitness'
import { todoService, type Todo } from '@/services/todo'
import { greeting, toISODate, timeAgo, moodEmoji } from '@/lib/utils'
import { AnimatedCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const modules = [
  { to: '/diary', title: 'Diary', desc: 'Thoughts, moods & moments', icon: BookHeart },
  { to: '/fitness', title: 'Fitness', desc: 'Workouts, food & goals', icon: Dumbbell },
  { to: '/fitness/planner', title: 'Workout Plan', desc: 'Your weekly schedule', icon: CalendarRange },
  { to: '/ai', title: 'Coach', desc: 'Ask anything, act faster', icon: Sparkles },
  { to: '/todo', title: 'To-Do', desc: 'Tasks, priorities & habits', icon: ListTodo },
  { to: '/body-scan', title: 'Body Scan', desc: 'Track your progress', icon: ScanLine },
  { to: '/expenses', title: 'Expenses', desc: 'Spending, splits & receipts', icon: Wallet },
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
      to: '/diary',
    },
    {
      label: 'Calories left',
      value: caloriesLeft,
      hint: `${summary?.totals?.calories ?? 0} kcal consumed`,
      icon: Flame,
      to: '/fitness',
    },
    {
      label: 'Workouts today',
      value: workoutsToday,
      hint: workoutsToday ? 'Great job!' : 'Time to move',
      icon: Dumbbell,
      to: '/fitness',
    },
    {
      label: 'Tasks done',
      value: `${donePct}%`,
      hint: `${openTodos.length} open · ${doneTodos.length} done`,
      icon: CheckCircle2,
      to: '/todo',
    },
  ]

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 rounded-3xl border border-edge bg-gradient-to-b from-card to-surface p-6 sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-volt-400">
          {greeting()}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {user?.name?.split(' ')[0]}, welcome back
        </h1>
        <p className="mt-2 max-w-lg text-sm text-slate-400">
          Everything in one place — pick up right where you left off.
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
            className="group cursor-pointer rounded-2xl border border-edge bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-edge-strong hover:bg-card-hover"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-edge bg-surface text-volt-400">
              <s.icon size={19} />
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
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-edge bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-edge-strong hover:bg-card-hover"
            onClick={() => navigate(m.to)}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-edge bg-surface text-volt-400 transition-colors group-hover:text-volt-300">
                <m.icon size={22} />
              </div>
              <TrendingUp
                size={16}
                className="translate-x-1 text-slate-600 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
              />
            </div>
            <h3 className="mt-5 font-display text-lg font-bold text-white">{m.title}</h3>
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
            <p className="text-sm text-slate-500">All clear — enjoy your day</p>
          ) : (
            <ul className="space-y-2.5">
              {openTodos.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      t.priority === 'high' ? 'bg-rose-400' : t.priority === 'medium' ? 'bg-amber-400' : 'bg-volt-400'
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
              <p className="font-display text-base font-semibold text-volt-400">
                {latestEntry.title || 'Untitled'}
              </p>
              <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-400">
                {latestEntry.content}
              </p>
              <button
                onClick={() => navigate('/diary')}
                className="mt-3 text-xs font-semibold text-volt-400 hover:text-volt-300"
              >
                Open the journal
              </button>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-6 text-center">
              <BookHeart size={28} className="mb-2 text-volt-400/50" />
              <p className="text-sm text-slate-400">
                No diary entries yet. Pour your thoughts onto paper.
              </p>
              <button
                onClick={() => navigate('/diary')}
                className="mt-3 text-xs font-semibold text-volt-400 hover:text-volt-300"
              >
                Write your first entry
              </button>
            </div>
          )}
        </AnimatedCard>
      </div>
    </div>
  )
}