import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Pin, Pencil, Trash2, CalendarDays, Music2, Clapperboard, FileText } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { diaryService, type DiaryEntry } from '@/services/diary'
import { Loading } from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'
import { formatDate, formatDay, moodEmoji } from '@/lib/utils'

export function DiaryView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [entry, setEntry] = useState<DiaryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!id) return
    diaryService
      .get(id)
      .then(setEntry)
      .catch((err) => toast(err instanceof Error ? err.message : 'Failed to load', 'error'))
      .finally(() => setLoading(false))
  }, [id, toast])

  async function handleDelete() {
    if (!entry) return
    try {
      await diaryService.remove(entry.id)
      toast('Entry deleted')
      navigate('/diary')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', 'error')
    }
  }

  if (loading) return <Loading />
  if (!entry) return <div className="text-slate-400">Entry not found</div>

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/diary')}>
          <ArrowLeft size={16} />
          Back to journal
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/diary/write/${entry.id}`)}>
            <Pencil size={14} />
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-[#fdf6e3] text-[#3d2b1f] shadow-2xl"
      >
        <div className="absolute bottom-0 left-12 top-0 w-px bg-[#e8c4b8]" />
        <div
          className="absolute inset-x-12 top-6 bottom-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 38px, #d5cfc0 38px, #d5cfc0 39px)',
          }}
        />
        <div className="relative z-10 p-6 pl-16 sm:p-10 sm:pl-16">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#a08464]">
              <CalendarDays size={14} />
              {formatDay(entry.entryDate)}
            </span>
            {entry.isPinned && <Pin size={14} className="text-[#c8a96e]" />}
            <span className="text-2xl">{moodEmoji(entry.mood)}</span>
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight">
            {entry.title || 'Untitled'}
          </h1>
          <div className="my-5 h-px w-full bg-[#e0d4ba]" />
          {entry.content ? (
            <p className="whitespace-pre-wrap text-[15px] leading-[2.4] text-[#4e3b2d]">
              {entry.content}
            </p>
          ) : (
            entry.attachments.some((a) => a.fileName?.toLowerCase().startsWith('handwriting_')) ? (
              <p className="text-sm italic text-[#b8a680]">✍️ Handwritten entry — see drawing below</p>
            ) : (
              <p className="text-sm italic text-[#b8a680]">No text content</p>
            )
          )}

          {entry.attachments.length > 0 && (
            <div className="mt-8 space-y-6 border-t border-[#e8ddc6] pt-6">
              {/* Embedded Photos & Handwritten Sketches */}
              {entry.attachments.some((a) => a.mediaType === 'photo') && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#a08464]">
                    ✍️ Drawings & Photos
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {entry.attachments
                      .filter((a) => a.mediaType === 'photo')
                      .map((a) => (
                        <a
                          key={a.id}
                          href={a.cloudinaryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative block overflow-hidden rounded-2xl border border-[#d8cbb0] bg-white/70 shadow-sm transition-all hover:shadow-md"
                        >
                          <img
                            src={a.cloudinaryUrl}
                            alt={a.fileName ?? 'Handwritten Note'}
                            className="max-h-72 w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                          <div className="flex items-center justify-between border-t border-[#e8ddc6] bg-white/80 px-3 py-2 text-xs">
                            <span className="truncate font-medium text-[#5a4435]">{a.fileName ?? 'Photo'}</span>
                            <span className="text-[#a08464]">{formatDate(a.createdAt)}</span>
                          </div>
                        </a>
                      ))}
                  </div>
                </div>
              )}

              {/* Other Media & Document Attachments */}
              {entry.attachments.some((a) => a.mediaType !== 'photo') && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#a08464]">
                    Attachments & Documents
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {entry.attachments
                      .filter((a) => a.mediaType !== 'photo')
                      .map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 rounded-xl border border-[#d8cbb0] bg-white/60 p-3"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f0e7d2] text-[#8a6d2f]">
                            {a.mediaType === 'audio' ? (
                              <Music2 size={20} />
                            ) : a.mediaType === 'document' ? (
                              <FileText size={20} />
                            ) : (
                              <Clapperboard size={20} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{a.fileName ?? a.mediaType}</p>
                            <a
                              href={a.cloudinaryUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-[#8a6d2f] hover:underline"
                            >
                              Open {a.mediaType}
                            </a>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="mt-8 text-xs text-[#b8a680]">
            {formatDate(entry.createdAt)} · last edited {formatDate(entry.updatedAt)}
          </p>
        </div>
      </motion.article>

      {confirmDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDelete(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="glass-strong w-full max-w-sm rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-white">Delete this entry?</h3>
            <p className="mt-1 text-sm text-slate-400">This cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}