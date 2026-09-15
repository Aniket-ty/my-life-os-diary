import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  Trash2,
  ChefHat,
  Dumbbell,
  Check,
  X,
  Bot,
  User,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { aiService, type ChatMessage, type AIAction } from '@/services/ai'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Suggest a high-protein lunch under 600 kcal',
  'Design a 30-minute full-body workout',
  'How many calories in a chicken breast?',
  'Plan my macros for today',
]

export function AIChat() {
  const [messages, setMessages] = useState<Array<ChatMessage | { type: 'temp'; role: 'assistant'; content: string }>>(
    [],
  )
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [input, setInput] = useState('')
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null)
  const [typing, setTyping] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    void aiService
      .history('')
      .then((msgs) => {
        setMessages(msgs.map((m) => ({ ...m }) as ChatMessage))
        if (msgs.length > 0) setSessionId(msgs[0].sessionId)
      })
      .catch(() => {
        // ignore, start fresh
      })
      .finally(() => setLoadingHistory(false))
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  async function send(text?: string) {
    const message = (text ?? input).trim()
    if (!message || typing) return
    setInput('')
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), sessionId: '', role: 'user', content: message, createdAt: new Date().toISOString() }])
    setTyping(true)
    setPendingAction(null)
    try {
      const res = await aiService.chat(message, sessionId)
      setSessionId(res.sessionId)
      setPendingAction(res.action ?? null)
      setMessages((prev) => [
        ...prev,
        { type: 'temp', role: 'assistant', content: res.message },
      ])
    } catch (err) {
      toast(err instanceof Error ? err.message : 'AI is unreachable', 'error')
      setMessages((prev) => [
        ...prev,
        { type: 'temp', role: 'assistant', content: 'Sorry, I could not reach the AI service. Try again in a moment — or check if your plan has API quota left.' },
      ])
    } finally {
      setTyping(false)
    }
  }

  async function confirmAction() {
    if (!pendingAction) return
    try {
      if (pendingAction.type === 'log_food') {
        const d = pendingAction.data
        await aiService.addFood({
          foodName: String(d.foodName ?? 'Food'),
          calories: Number(d.calories ?? 0),
          proteinG: Number(d.proteinG ?? 0) || undefined,
          carbsG: Number(d.carbsG ?? 0) || undefined,
          fatG: Number(d.fatG ?? 0) || undefined,
          mealType: String(d.mealType ?? 'snack'),
          quantity: d.quantity ? String(d.quantity) : undefined,
        })
        toast('Food logged to your nutrition!')
      } else if (pendingAction.type === 'add_workout') {
        const d = pendingAction.data
        const exercises = Array.isArray(d.exercises)
          ? (d.exercises as Array<Record<string, unknown>>).map((e) => ({
              exerciseName: String(e.exerciseName ?? 'Exercise'),
              sets: Number(e.sets ?? 0) || undefined,
              reps: Number(e.reps ?? 0) || undefined,
              weightKg: Number(e.weightKg ?? 0) || undefined,
            }))
          : []
        await aiService.addWorkout({
          workoutName: d.workoutName ? String(d.workoutName) : undefined,
          exercises,
        })
        toast('Workout added to your journal!')
      }
      setPendingAction(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed', 'error')
    }
  }

  async function clearChat() {
    try {
      await aiService.clear(sessionId)
      setMessages([])
      setSessionId(undefined)
      toast('Chat cleared')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Clear failed', 'error')
    }
  }

  return (
    <div className="flex h-[calc(100dvh-210px)] min-h-[420px] flex-col sm:h-[calc(100vh-140px)] sm:min-h-[520px]">
      <PageHeader
        title="AI Coach"
        subtitle="Your personal nutrition & fitness assistant"
        icon={<Sparkles size={22} className="text-violet-brand" />}
        accent="from-violet-brand to-purple-500"
        action={
          <Button variant="ghost" size="sm" onClick={clearChat}>
            <Trash2 size={14} />
            Clear chat
          </Button>
        }
      />

      <div className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl">
        {/* messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {loadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-violet-brand" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-brand to-purple-500 shadow-2xl shadow-violet-brand/40">
                <Sparkles size={28} className="text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Meet your AI Coach</h3>
              <p className="mt-1 max-w-xs text-sm text-slate-400">
                Ask me anything about food, workouts and staying on track with your goals.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-violet-brand/30 bg-violet-brand/10 px-3.5 py-2 text-xs font-medium text-violet-brand transition-all hover:bg-violet-brand/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))
          )}

          {typing && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-brand to-purple-500">
                <Bot size={15} className="text-white" />
              </div>
              <div className="glass flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: d * 0.2 }}
                    className="h-1.5 w-1.5 rounded-full bg-violet-brand"
                  />
                ))}
              </div>
            </div>
          )}

          {/* action card */}
          <AnimatePresence>
            {pendingAction && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass-strong ml-10 max-w-md rounded-2xl border-violet-brand/30 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  {pendingAction.type === 'log_food' ? (
                    <ChefHat size={16} className="text-emerald-300" />
                  ) : (
                    <Dumbbell size={16} className="text-orange-300" />
                  )}
                  <p className="text-sm font-semibold text-white">
                    {pendingAction.type === 'log_food' ? 'AI wants to log some food' : 'AI suggests a workout'}
                  </p>
                </div>
                {pendingAction.type === 'log_food' ? (
                  <ActionFood data={pendingAction.data} />
                ) : (
                  <ActionWorkout data={pendingAction.data} />
                )}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={confirmAction} variant="secondary" className="text-emerald-300">
                    <Check size={14} />
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingAction(null)}
                    className="text-slate-400"
                  >
                    <X size={14} />
                    Dismiss
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* input */}
        <div className="border-t border-white/10 p-3 sm:p-4">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              send()
            }}
            className="flex items-end gap-3"
          >
            <div className="relative flex-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about food, workouts, health…"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3.5 pl-4 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-brand/60 focus:outline-none focus:ring-2 focus:ring-violet-brand/20"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-r from-violet-brand to-purple-500 p-2 text-white opacity-80 transition-opacity hover:opacity-100 disabled:opacity-30"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isUser
            ? 'bg-white/10'
            : 'bg-gradient-to-br from-violet-brand to-purple-500 shadow-lg shadow-violet-brand/30',
        )}
      >
        {isUser ? <User size={15} className="text-slate-300" /> : <Bot size={15} className="text-white" />}
      </div>
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap text-sm leading-relaxed sm:max-w-[70%]',
          isUser
            ? 'rounded-2xl rounded-tr-md border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-slate-100'
            : 'glass rounded-2xl rounded-tl-md px-4 py-3 text-slate-200',
        )}
      >
        {content}
      </div>
    </motion.div>
  )
}

function ActionFood({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">{String(data.foodName ?? 'Food')}</span>
        <span className="font-bold text-emerald-300">{String(data.calories ?? '—')} kcal</span>
      </div>
      <div className="mt-1 text-xs text-slate-400">
        P {String(data.proteinG ?? 0)}g · C {String(data.carbsG ?? 0)}g · F {String(data.fatG ?? 0)}g
        {data.mealType ? ` · ${String(data.mealType)}` : ''}
      </div>
    </div>
  )
}

function ActionWorkout({ data }: { data: Record<string, unknown> }) {
  const exercises = Array.isArray(data.exercises)
    ? (data.exercises as Array<Record<string, unknown>>)
    : []
  return (
    <div className="rounded-xl bg-white/[0.04] p-3 text-sm">
      <p className="font-semibold text-white">{String(data.workoutName ?? 'AI Workout')}</p>
      <div className="mt-1.5 space-y-1">
        {exercises.map((e, i) => (
          <p key={i} className="text-xs text-slate-400">
            • {String(e.exerciseName)}
            {e.sets ? ` · ${String(e.sets)} sets` : ''}
            {e.reps ? ` × ${String(e.reps)} reps` : ''}
          </p>
        ))}
      </div>
    </div>
  )
}