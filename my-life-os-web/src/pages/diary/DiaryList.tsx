import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Search, Pin, Trash2, BookHeart, Paperclip, CalendarDays } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { diaryService, type DiaryEntry } from '@/services/diary'
import { offlineSync } from '@/services/offlineSync'
import { PageHeader } from '@/components/ui/PageHeader'
import { Loading } from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'
import { formatDate, moodEmoji, timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function DiaryList() {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [showPinned, setShowPinned] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    void loadEntries()
  }, [])

  async function loadEntries() {
    // 1. Optimistically display cached diary entries immediately
    const cached = offlineSync.getCachedDiary<DiaryEntry>()
    if (cached && cached.length > 0) {
      setEntries(cached)
      setLoading(false)
    }

    try {
      const res = await diaryService.list()
      setEntries(res.entries)
      offlineSync.cacheDiary(res.entries)
    } catch (err) {
      const cached = offlineSync.getCachedDiary<DiaryEntry>()
      if (cached && cached.length > 0) {
        setEntries(cached)
      } else {
        toast(err instanceof Error ? err.message : 'Failed to load diary', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(value: string) {
    setQuery(value)
    if (!value.trim()) {
      loadEntries()
      return
    }
    try {
      const res = await diaryService.search(value.trim())
      setEntries(res.entries)
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await diaryService.remove(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      setConfirmId(null)
      toast('Entry deleted')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', 'error')
    }
  }

  const visible = showPinned ? entries.filter((e) => e.isPinned) : entries

  return (
    <div>
      <PageHeader
        title="My Diary"
        subtitle={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} in your journal`}
        icon={<BookHeart size={22} className="text-gold-300" />}
        accent="from-gold-500 to-amber-600"
        action={
          <Button onClick={() => navigate('/diary/write')}>
            <PenLine size={16} />
            New entry
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search your thoughts…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
          />
        </div>
        <button
          onClick={() => setShowPinned((s) => !s)}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all',
            showPinned
              ? 'border-gold-500/50 bg-gold-500/15 text-gold-300'
              : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]',
          )}
        >
          <Pin size={15} />
          Pinned
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : visible.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-2xl py-20 text-center">
          <BookHeart size={36} className="mb-3 text-gold-300/50" />
          <p className="text-sm text-slate-400">
            {query ? 'No entries match your search' : 'Your journal is waiting for its first words'}
          </p>
          {!query && (
            <Button className="mt-4" onClick={() => navigate('/diary/write')}>
              <PenLine size={16} />
              Write something
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {visible.map((entry, i) => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.03, duration: 0.35 }}
                onClick={() => navigate(`/diary/${entry.id}`)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl bg-[#fdf6e3] text-[#3d2b1f] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                {/* red margin line */}
                <div className="absolute bottom-0 left-10 top-0 w-px bg-[#e8c4b8]" />
                {/* ruled lines */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-60"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #d5cfc0 31px, #d5cfc0 32px)',
                  }}
                />
                <div className="relative z-10 p-5 pl-14">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a08464]">
                      <CalendarDays size={13} />
                      {formatDate(entry.entryDate)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{moodEmoji(entry.mood)}</span>
                      {entry.isPinned && <Pin size={14} className="text-[#c8a96e]" />}
                    </div>
                  </div>
                  <h3 className="font-display text-lg font-bold leading-snug text-[#3d2b1f]">
                    {entry.title || 'Untitled thoughts'}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-sm leading-[1.6] text-[#6b5444]">
                    {entry.content}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-[#a08464]">{timeAgo(entry.createdAt)}</span>
                    <span className="flex items-center gap-1 text-[11px] text-[#a08464]">
                      {entry.attachments.length > 0 && (
                        <>
                          <Paperclip size={12} />
                          {entry.attachments.length}
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmId(entry.id)
                  }}
                  className="absolute right-3 top-3 z-20 rounded-lg bg-white/40 p-1.5 text-[#a08464] opacity-100 transition-opacity hover:bg-white/70 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* delete confirm */}
      <AnimatePresence>
        {confirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-strong w-full max-w-sm rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg font-semibold text-white">Delete this entry?</h3>
              <p className="mt-1 text-sm text-slate-400">
                This will permanently erase your words and any attached media from Cloudinary.
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setConfirmId(null)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => handleDelete(confirmId)}>
                  <Trash2 size={15} />
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}