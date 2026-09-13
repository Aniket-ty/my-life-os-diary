import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { formatDay } from '@/lib/utils'

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <div className="relative min-h-screen">
      <div aria-hidden className="bg-aurora" />
      <div aria-hidden className="bg-stars" />
      <div className="relative flex min-h-screen bg-grid">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden pb-24 lg:pb-0">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <header className="mb-6 flex items-center justify-between">
              <AnimatePresence mode="wait">
                <motion.p
                  key="date"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm font-medium text-slate-400"
                >
                  <CalendarDays size={16} className="text-violet-brand" />
                  {formatDay(new Date())}
                </motion.p>
              </AnimatePresence>
              <div className="glass hidden items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-medium text-slate-400 sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint-400" />
                Synced
              </div>
            </header>

            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}