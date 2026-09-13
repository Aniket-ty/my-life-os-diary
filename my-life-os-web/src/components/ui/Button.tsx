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
    'bg-gradient-to-r from-violet-brand to-indigo-500 text-white shadow-lg shadow-violet-brand/25 hover:shadow-violet-brand/40 hover:brightness-110',
  secondary:
    'glass text-slate-100 hover:bg-white/10',
  ghost: 'text-slate-300 hover:text-white hover:bg-white/5',
  danger:
    'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/35 hover:brightness-110',
  outline:
    'border border-white/15 text-slate-100 hover:border-white/30 hover:bg-white/5',
}

const sizes: Record<string, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
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
      whileHover={{ y: -1 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-brand/60',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          {typeof children === 'string' ? 'Please wait…' : children}
        </span>
      ) : (
        children
      )}
    </motion.button>
  )
}