import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const tones = {
  default: 'bg-white/10 text-slate-100 border-white/10',
  gold: 'bg-gold-500/15 text-gold-300 border-gold-500/30',
  mint: 'bg-mint-400/15 text-mint-300 border-mint-400/30',
  violet: 'bg-violet-brand/20 text-violet-brand border-violet-brand/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
} as const

export type BadgeTone = keyof typeof tones

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}