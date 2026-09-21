import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  children: ReactNode
}

const variants: Record<string, string> = {
  primary:
    'bg-volt-500 text-void font-semibold shadow-lg shadow-volt-500/20 hover:bg-volt-400 transition-colors',
  secondary: 'bg-surface text-slate-200 border border-edge hover:border-edge-strong hover:bg-card-hover',
  ghost: 'text-slate-300 hover:text-white hover:bg-white/5',
  danger: 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-400',
  outline: 'border border-edge text-slate-200 hover:border-edge-strong hover:bg-white/5',
}

const sizes: Record<string, string> = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
  icon: 'h-10 w-10',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-volt-500/50',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-void/30 border-t-void" />
          {typeof children === 'string' ? 'Please wait…' : children}
        </span>
      ) : (
        children
      )}
    </motion.button>
  )
}