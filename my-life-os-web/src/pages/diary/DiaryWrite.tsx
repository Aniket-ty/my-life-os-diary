import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PenLine, ArrowLeft, Pin, Paperclip, ImagePlus, Trash2, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { diaryService, type DiaryEntry } from '@/services/diary'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { MOODS, type Mood, toISODate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PendingFile {
  id: string
  file: File
  type: 'photo' | 'video' | 'audio' | 'document'
  preview?: string
}

export function DiaryWrite() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<Mood | null>(null)
  const [pinned, setPinned] = useState(false)
  const [picked, setPicked] = useState<PendingFile[]>([])
  const [date, setDate] = useState(toISODate(new Date()))
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(id)

  // Load the existing entry when editing so previous data is preserved
  useEffect(() => {
    if (!id) return
    let cancelled = false
    diaryService.get(id)
      .then((entry) => {
        if (cancelled) return
        setTitle(entry.title || '')
        setContent(entry.content)
        setMood((entry.mood as Mood | null) || null)
        setPinned(entry.isPinned)
        setDate(toISODate(entry.entryDate))
      })
      .catch((err) => {
        if (!cancelled) toast(err instanceof Error ? err.message : 'Could not load entry', 'error')
      })
    return () => { cancelled = true }
  }, [id, toast])

  async function save() {
    if (!content.trim()) {
      toast('Write something before saving', 'error')
      return
    }
    setSaving(true)
    try {
      const entryData = {
        title: title.trim() || undefined,
        content: content.trim(),
        mood: mood ?? undefined,
        entryDate: date,
        isPinned: pinned,
      }
      let entry: DiaryEntry
      if (isEdit) {
        entry = await diaryService.update(id!, entryData)
      } else {
        entry = await diaryService.create(entryData)
      }

      for (const p of picked) {
        try {
          await diaryService.uploadMedia(entry.id, p.file, p.type)
        } catch {
          toast(`Could not upload ${p.file.name}`, 'error')
        }
      }
      toast(isEdit ? 'Entry updated' : 'Entry saved to your journal')
      navigate(`/diary/${entry.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return
    const next: PendingFile[] = []
    for (const file of Array.from(files)) {
      const type = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : file.type === 'application/pdf' ||
              file.type === 'application/msword' ||
              file.type.startsWith('application/vnd.openxmlformats') ||
              file.type === 'text/plain'
            ? 'document'
            : 'photo'
      const preview = type === 'photo' ? URL.createObjectURL(file) : undefined
      next.push({ id: crypto.randomUUID(), file, type, preview })
    }
    setPicked((prev) => [...prev, ...next])
  }

  function removeFile(fid: string) {
    setPicked((prev) => prev.filter((p) => p.id !== fid))
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isEdit ? 'Edit entry' : 'New diary entry'}
        subtitle="Write freely — this is your space"
        icon={<PenLine size={22} className="text-gold-300" />}
        accent="from-gold-500 to-amber-600"
        action={
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Back
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-[#fdf6e3] text-[#3d2b1f] shadow-2xl"
      >
        <div className="absolute bottom-0 left-12 top-0 w-px bg-[#e8c4b8]" />
        <div
          className="absolute inset-x-12 top-8 bottom-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 35px, #d5cfc0 35px, #d5cfc0 36px)',
          }}
        />
        <div className="relative z-10 space-y-5 p-6 pl-16 sm:p-8 sm:pl-16">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-[#d8cbb0] bg-white/60 px-3 py-2 text-sm text-[#3d2b1f] focus:border-[#c8a96e] focus:outline-none"
            />
            <button
              onClick={() => setPinned((p) => !p)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                pinned
                  ? 'border-[#c8a96e] bg-[#c8a96e]/20 text-[#8a6d2f]'
                  : 'border-[#d8cbb0] bg-white/60 text-[#a08464] hover:bg-white/80',
              )}
            >
              <Pin size={14} />
              Pin
            </button>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title…"
            className="w-full border-none bg-transparent font-display text-2xl font-bold text-[#3d2b1f] placeholder:text-[#b8a680] focus:outline-none"
          />

          {/* mood picker */}
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(mood === m.value ? null : m.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all',
                  mood === m.value
                    ? 'border-[#c8a96e] bg-[#c8a96e]/25 font-semibold shadow-sm'
                    : 'border-[#d8cbb0] bg-white/50 hover:bg-white/80',
                )}
              >
                <span>{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind today?"
            className="min-h-[320px] w-full resize-y border-none bg-transparent text-[15px] leading-[2.4] text-[#3d2b1f] placeholder:text-[#b8a680] focus:outline-none"
            autoFocus
          />

          {/* attachments */}
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-3 border-t border-[#e8ddc6] pt-4">
              {picked.map((p) => (
                <div key={p.id} className="relative">
                  {p.type === 'photo' && p.preview ? (
                    <img src={p.preview} alt="" className="h-24 w-24 rounded-xl object-cover shadow" />
                  ) : (
                    <div className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-[#d8cbb0] bg-white/60 text-[#a08464]">
                      <Paperclip size={20} />
                      <span className="max-w-[80px] truncate px-1 text-[10px]">{p.file.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(p.id)}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-500 p-1 text-white shadow"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8ddc6] pt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#d8cbb0] bg-white/60 px-4 py-2.5 text-sm font-medium text-[#a08464] transition-colors hover:bg-white/80">
              <ImagePlus size={16} />
              Attach photo / video / audio / document
              <input
                type="file"
                accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.pdf,.doc,.docx"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" className="text-[#a08464]" onClick={() => navigate(-1)}>
                <Trash2 size={15} />
                Cancel
              </Button>
              <Button loading={saving} onClick={save} className="bg-gradient-to-r from-[#c8a96e] to-amber-600 text-white shadow-lg shadow-amber-600/20">
                {isEdit ? 'Update entry' : 'Save entry'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}