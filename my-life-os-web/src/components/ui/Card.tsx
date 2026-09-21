import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function GlassCard({
  children,
  className,
  hover = false,
  onClick,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-edge bg-card',
        hover &&
          'transition-all duration-300 hover:border-edge-strong hover:bg-card-hover hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn('rounded-2xl border border-edge bg-card', className)}
    >
      {children}
    </motion.div>
  )
}