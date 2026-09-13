import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDay(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function toISODate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toBackendDate(date: string | Date): string {
  return toISODate(date)
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Working late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

export type Mood =
  | 'happy'
  | 'grateful'
  | 'calm'
  | 'excited'
  | 'anxious'
  | 'sad'
  | 'angry'
  | 'tired'

export const MOODS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'happy', label: 'Happy', emoji: '😄' },
  { value: 'grateful', label: 'Grateful', emoji: '🙏' },
  { value: 'calm', label: 'Calm', emoji: '😌' },
  { value: 'excited', label: 'Excited', emoji: '🤩' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
  { value: 'sad', label: 'Sad', emoji: '😢' },
  { value: 'angry', label: 'Angry', emoji: '😤' },
  { value: 'tired', label: 'Tired', emoji: '😴' },
]

export function moodEmoji(mood?: string | null): string {
  return MOODS.find((m) => m.value === mood)?.emoji ?? '📝'
}

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type MealType = (typeof MEALS)[number]

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}

export const PRIORITIES = {
  low: { label: 'Low', color: 'text-sky-400', bar: 'bg-sky-400' },
  medium: { label: 'Medium', color: 'text-amber-400', bar: 'bg-amber-400' },
  high: { label: 'High', color: 'text-rose-400', bar: 'bg-rose-400' },
} as const

export type Priority = 'low' | 'medium' | 'high'

export const CATEGORY_COLORS: Record<string, string> = {
  Work: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Personal: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  Health: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Finance: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  Study: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  Home: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Misc: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
}

export function categoryClass(category?: string | null): string {
  return CATEGORY_COLORS[category ?? ''] ?? CATEGORY_COLORS.Misc
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(d)
}

export function parseActionBlock(text: string): {
  clean: string
  action: { type: string; data: Record<string, unknown> } | null
} {
  const match = text.match(/ACTION:\s*\{([\s\S]*)\}/)
  if (!match) return { clean: text, action: null }
  try {
    const json = JSON.parse(`{${match[1]}}`)
    return {
      clean: text.replace(/ACTION:\s*\{[\s\S]*\}/, '').trim(),
      action: {
        type: json.type as string,
        data: json.data as Record<string, unknown>,
      },
    }
  } catch {
    return { clean: text, action: null }
  }
}