import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ListTodo,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Repeat,
  CalendarDays,
  Pencil,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { todoService, type Todo } from '@/services/todo'
import { offlineSync } from '@/services/offlineSync'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, TextArea } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { PRIORITIES, categoryClass, formatDate, type Priority } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'active' | 'done'
const CATEGORIES = ['Work', 'Personal', 'Health', 'Finance', 'Study', 'Home', 'Misc']

export function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [category, setCategory] = useState<string>('')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Todo | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    const cached = offlineSync.getCachedTodos<Todo>()
    if (cached && cached.length > 0) {
      setTodos(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    try {
      const data = await todoService.list()
      setTodos(data)
      offlineSync.cacheTodos(data)
    } catch (err) {
      const cached = offlineSync.getCachedTodos<Todo>()
      if (cached && cached.length > 0) {
        setTodos(cached)
      } else {
        toast(err instanceof Error ? err.message : 'Failed to load todos', 'error')
      }
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const visible = todos.filter((t) => {
    if (filter === 'active') return !t.isCompleted
    if (filter === 'done') return t.isCompleted
    return true
  })

  async function toggle(t: Todo) {
    try {
      if (t.isCompleted) {
        await todoService.uncomplete(t.id)
        setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, isCompleted: false, completedAt: null } : x)))
      } else {
        const res = await todoService.complete(t.id)
        if ('todo' in res && res.todo) {
          // recurring reset happened
          setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...res.todo } : x)))
          toast('Recurring task reset for next occurrence')
        } else {
          setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, isCompleted: true, completedAt: new Date().toISOString() } : x)))
        }
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error')
    }
  }

  async function remove(id: string) {
    try {
      await todoService.remove(id)
      setTodos((prev) => prev.filter((t) => t.id !== id))
      toast('Task deleted')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error')
    }
  }

  const counts = {
    all: todos.length,
    active: todos.filter((t) => !t.isCompleted).length,
    done: todos.filter((t) => t.isCompleted).length,
  }

  const catFiltered = category ? visible.filter((t) => t.category === category) : visible

  return (
    <div>
      <PageHeader
        title="To-Do"
        subtitle={`${counts.active} task${counts.active === 1 ? '' : 's'} remaining`}
        icon={<ListTodo size={22} className="text-sky-300" />}
        accent="from-sky-500 to-blue-600"
        action={
          <Button onClick={() => { setEditing(null); setShowAdd(true) }}>
            <Plus size={16} />
            Add task
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', 'active', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all',
              filter === f
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25'
                : 'glass text-slate-400 hover:text-slate-200',
            )}
          >
            {f} ({counts[f]})
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
        <button
          onClick={() => setCategory('')}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
            !category ? 'border-sky-500/50 bg-sky-500/15 text-sky-300' : 'border-white/10 text-slate-500 hover:text-slate-300',
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(catFiltered.length && category === c ? '' : c)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
              category === c ? 'border-sky-500/50 bg-sky-500/15 text-sky-300' : 'border-white/10 text-slate-500 hover:text-slate-300',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : catFiltered.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-2xl py-20 text-center">
          <ListTodo size={36} className="mb-3 text-sky-300/40" />
          <p className="text-sm text-slate-400">No tasks here. Enjoy the calm 🎈</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {catFiltered.map((t, i) => {
              const pr = PRIORITIES[t.priority] ?? PRIORITIES.medium
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    'glass group relative overflow-hidden rounded-2xl pl-4 pr-4 py-3.5 transition-colors',
                    t.isCompleted && 'opacity-50',
                  )}
                >
                  {/* priority stripe */}
                  <span className={cn('absolute left-0 top-0 h-full w-1', pr.bar)} />
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggle(t)} className="mt-0.5 shrink-0">
                      {t.isCompleted ? (
                        <CheckCircle2 size={22} className="text-sky-400 transition-transform hover:scale-110" />
                      ) : (
                        <Circle size={22} className="text-slate-600 transition-colors hover:text-sky-300" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            'text-[15px] font-medium text-slate-100',
                            t.isCompleted && 'line-through text-slate-500',
                          )}
                        >
                          {t.title}
                        </p>
                        {t.isRecurring && (
                          <span className="flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                            <Repeat size={11} />
                            {t.recurPattern}
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{t.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                        {t.category && (
                          <span className={cn('rounded-full border px-2.5 py-0.5 font-semibold', categoryClass(t.category))}>
                            {t.category}
                          </span>
                        )}
                        <span className={cn('text-xs font-semibold', pr.color)}>{pr.label}</span>
                        {t.dueDate && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <CalendarDays size={11} />
                            {formatDate(t.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        onClick={() => { setEditing(t); setShowAdd(true) }}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-sky-300"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(t.id)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <TodoModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        editing={editing}
        onSaved={(todo) => {
          setTodos((prev) => {
            if (editing) return prev.map((t) => (t.id === todo.id ? todo : t))
            return [todo, ...prev]
          })
        }}
      />
    </div>
  )
}

function TodoModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  editing: Todo | null
  onSaved: (t: Todo) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurPattern, setRecurPattern] = useState('daily')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? '')
      setDescription(editing?.description ?? '')
      setCategory(editing?.category ?? '')
      setPriority(editing?.priority ?? 'medium')
      setDueDate(editing?.dueDate ? editing.dueDate.slice(0, 10) : '')
      setIsRecurring(editing?.isRecurring ?? false)
      setRecurPattern(editing?.recurPattern ?? 'daily')
    }
  }, [open, editing])

  async function save() {
    if (!title.trim()) {
      toast('Task needs a title', 'error')
      return
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      priority,
      dueDate: dueDate || undefined,
      isRecurring,
      recurPattern: isRecurring ? recurPattern : undefined,
    }
    setSaving(true)
    try {
      const saved = editing ? await todoService.update(editing.id, payload) : await todoService.create(payload)
      toast(editing ? 'Task updated' : 'Task added')
      onSaved(saved)
      onClose()
    } catch (err) {
      if (!editing) {
        const queued = offlineSync.queueTodo({
          title: payload.title,
          description: payload.description,
          category: payload.category,
          priority: payload.priority,
          dueDate: payload.dueDate,
          isCompleted: false,
        })
        toast('Saved offline! Will automatically sync once server connects.', 'info')
        onSaved({
          id: queued.localId,
          title: payload.title,
          description: payload.description || null,
          category: payload.category || null,
          priority: payload.priority,
          dueDate: payload.dueDate || null,
          reminderAt: null,
          reminderSent: false,
          isCompleted: false,
          completedAt: null,
          isRecurring: false,
          recurPattern: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        onClose()
        return
      }
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit task' : 'New task'}>
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Finish the report" autoFocus />
        <TextArea label="Details" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add context…" className="min-h-[70px]" />

        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Priority</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={cn(
                  'rounded-xl border py-2 text-xs font-semibold capitalize transition-all',
                  priority === p
                    ? {
                        low: 'border-sky-500/50 bg-sky-500/15 text-sky-300',
                        medium: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
                        high: 'border-rose-500/50 bg-rose-500/15 text-rose-300',
                      }[p]
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08]',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(category === c ? '' : c)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  category === c ? 'border-sky-500/50 bg-sky-500/15 text-sky-300' : 'border-white/10 text-slate-500 hover:text-slate-300',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 focus:border-sky-500/50 focus:outline-none"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 accent-sky-500"
          />
          Recurring task
        </label>

        {isRecurring && (
          <div className="grid grid-cols-3 gap-1.5">
            {['daily', 'weekly', 'weekdays'].map((p) => (
              <button
                key={p}
                onClick={() => setRecurPattern(p)}
                className={cn(
                  'rounded-xl border py-2 text-xs font-semibold capitalize transition-all',
                  recurPattern === p
                    ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                    : 'border-white/10 text-slate-400 hover:bg-white/[0.08]',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save} className="bg-gradient-to-r from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
            {editing ? 'Save changes' : 'Add task'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}