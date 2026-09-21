import { useState, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Mic, WifiOff, RefreshCw, Zap } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { VoiceCommandBar } from '@/components/expenses/VoiceCommandBar'
import { offlineSync, type ServerStatus } from '@/services/offlineSync'
import { formatDay } from '@/lib/utils'

function StatusPill({
  children,
  className,
}: {
  children: ReactNode
  className: string
}) {
  return (
    <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold ${className}`}>
      {children}
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [triggerVoice, setTriggerVoice] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [serverStatus, setServerStatus] = useState<ServerStatus>(offlineSync.getServerStatus())
  const [pendingCount, setPendingCount] = useState(offlineSync.getPendingCount())

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      offlineSync.probeServer()
    }
    const handleOffline = () => {
      setIsOnline(false)
      setServerStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const unsubscribe = offlineSync.subscribe(() => {
      setPendingCount(offlineSync.getPendingCount())
      setIsOnline(navigator.onLine)
      setServerStatus(offlineSync.getServerStatus())
    })

    // Populate local cache in background
    offlineSync.fetchAndCacheSnapshot()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribe()
    }
  }, [])

  return (
    <div className="relative min-h-screen">
      <div aria-hidden className="bg-aurora" />
      <div className="relative flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden pb-24 lg:pb-0">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <header className="mb-8 flex items-center justify-between">
              <AnimatePresence mode="wait">
                <motion.p
                  key="date"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm font-medium text-slate-400"
                >
                  <CalendarDays size={16} className="text-volt-400" />
                  {formatDay(new Date())}
                </motion.p>
              </AnimatePresence>
              <div className="flex items-center gap-3">
                {/* Voice Assistant Header Trigger — Available across all modules */}
                <button
                  onClick={() => setTriggerVoice(true)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-edge bg-surface text-volt-400 transition-colors hover:border-edge-strong hover:bg-card-hover"
                  title="Voice Assistant (All Modules)"
                >
                  <Mic size={18} />
                </button>

                <NotificationBell />

                {/* Real-time Cloud Sync & Offline Badge */}
                {!isOnline ? (
                  <StatusPill className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                    <WifiOff size={13} />
                    <span>Offline{pendingCount > 0 ? ` (${pendingCount} saved)` : ''}</span>
                  </StatusPill>
                ) : serverStatus === 'waking' ? (
                  <StatusPill className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                    <Zap size={13} className="animate-pulse" />
                    <span>Server waking up... {pendingCount > 0 ? `(${pendingCount} saved)` : 'Changes saved locally'}</span>
                  </StatusPill>
                ) : pendingCount > 0 ? (
                  <button
                    onClick={() => offlineSync.flushQueue()}
                    className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1.5 text-[11px] font-semibold text-sky-300 transition-colors hover:bg-sky-500/20"
                    title="Click to sync offline items"
                  >
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Syncing {pendingCount}...</span>
                  </button>
                ) : (
                  <div className="hidden items-center gap-2 rounded-full border border-edge px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 sm:flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-volt-400" />
                    Synced
                  </div>
                )}
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

      {/* Global Multi-Module Voice Assistant */}
      <VoiceCommandBar
        triggerListening={triggerVoice}
        onResetTrigger={() => setTriggerVoice(false)}
      />
    </div>
  )
}