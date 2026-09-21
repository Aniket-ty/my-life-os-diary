import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function PageHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  accent?: string
  action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 flex flex-wrap items-end justify-between gap-4"
    >
      <div className="flex items-center gap-4">
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-edge bg-surface text-volt-400">
            {icon}
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </motion.div>
  )
}

export function ProgressBar({
  value,
  max,
  color,
  height = 'h-2',
}: {
  value: number
  max: number
  color: string
  height?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const over = value > max
  return (
    <div className={`w-full ${height} overflow-hidden rounded-full bg-white/10`}>
      <div
        className={`${height} ${color} rounded-full transition-all duration-700 ease-out`}
        style={{
          width: `${pct}%`,
          boxShadow: over ? '0 0 12px rgba(220,95,115,0.5)' : '0 0 10px rgba(193,235,92,0.3)',
        }}
      />
    </div>
  )
}