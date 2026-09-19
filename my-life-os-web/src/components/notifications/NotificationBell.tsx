import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck, Wallet, ArrowRightLeft, Users, Receipt, Info, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { notificationService, type InAppNotification } from '@/services/notification'

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      // Ignore background network errors
    }
  }

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error(err)
    }
  }

  const handleItemClick = async (notif: InAppNotification) => {
    if (!notif.isRead) {
      try {
        await notificationService.markAsRead(notif.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        )
        setUnreadCount((c) => Math.max(0, c - 1))
      } catch (err) {
        console.error(err)
      }
    }
  }

  const renderIcon = (type: string) => {
    switch (type) {
      case 'expense':
      case 'split':
        return <Wallet size={15} className="text-amber-400" />
      case 'settlement':
        return <ArrowRightLeft size={15} className="text-emerald-400" />
      case 'group':
        return <Users size={15} className="text-sky-400" />
      case 'receipt':
        return <Receipt size={15} className="text-violet-400" />
      default:
        return <Info size={15} className="text-slate-400" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) loadNotifications()
        }}
        className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-md shadow-rose-500/40">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="glass-strong absolute right-0 top-10 z-50 w-80 sm:w-96 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-3 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-semibold text-white">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-violet-400 transition-colors hover:text-violet-300"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-white/5 py-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Sparkles size={24} className="mx-auto mb-2 text-slate-500 opacity-60" />
                  <p>No notifications yet</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Settlements, bill splits and group updates appear here
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl p-2.5 transition-colors ${
                      notif.isRead
                        ? 'opacity-70 hover:bg-white/5'
                        : 'bg-violet-500/10 hover:bg-violet-500/15'
                    }`}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                      {renderIcon(notif.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-semibold ${notif.isRead ? 'text-slate-300' : 'text-white'}`}>
                          {notif.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-500">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                        {notif.message}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400 shadow-sm shadow-violet-400" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
