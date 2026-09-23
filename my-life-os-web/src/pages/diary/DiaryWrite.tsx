import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PenLine,
  ArrowLeft,
  Pin,
  Paperclip,
  ImagePlus,
  Trash2,
  X,
  Keyboard,
  PenTool,
  Layers,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { diaryService, type DiaryEntry } from '@/services/diary'
import { offlineSync } from '@/services/offlineSync'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { MOODS, type Mood, toISODate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  HandwritingCanvas,
  type HandwritingCanvasHandle,
} from '@/components/diary/HandwritingCanvas'

interface PendingFile {
  id: string
  file: File
  type: 'photo' | 'video' | 'audio' | 'document'
  preview?: string
}

type InputMode = 'type' | 'stylus' | 'mixed'

function isDrawingAttachment(a: { fileName?: string | null }): boolean {
  return !!a.fileName && a.fileName.toLowerCase().startsWith('handwriting_')
}

export function DiaryWrite() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [inputMode, setInputMode] = useState<InputMode>('type')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<Mood | null>(null)
  const [pinned, setPinned] = useState(false)
  const [picked, setPicked] = useState<PendingFile[]>([])
  const [date, setDate] = useState(toISODate(new Date()))
  const [saving, setSaving] = useState(false)
  const [existingDrawing, setExistingDrawing] = useState<{ id: string; url: string } | null>(null)
  const canvasRef = useRef<HandwritingCanvasHandle>(null)

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
        // Load existing pen drawing as the editable image base layer
        const drawing = (entry.attachments || []).find((a) => isDrawingAttachment(a))
        setExistingDrawing(drawing ? { id: drawing.id, url: drawing.cloudinaryUrl } : null)
        if (drawing) {
          setInputMode(entry.content?.trim() ? 'mixed' : 'stylus')
        }
      })
      .catch((err) => {
        if (!cancelled) toast(err instanceof Error ? err.message : 'Could not load entry', 'error')
      })
    return () => { cancelled = true }
  }, [id, toast])

  async function save() {
    const drawingBlob = await canvasRef.current?.getCanvasBlob()
    if (!content.trim() && !drawingBlob) {
      toast('Write or handwrite something before saving', 'error')
      return
    }

    setSaving(true)
    try {
      const entryData = {
        title: title.trim() || undefined,
        // If the user only drew something, send empty string — drawing is uploaded separately
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

      // Save the pen drawing as an image attachment (no text conversion).
      // On edit, the previous drawing image is replaced with the new one.
      if (drawingBlob) {
        if (existingDrawing) {
          try {
            await diaryService.deleteMedia(entry.id, existingDrawing.id)
          } catch {
            // ignore — best effort cleanup
          }
        }
        try {
          const file = new File([drawingBlob], `handwriting_${Date.now()}.png`, { type: 'image/png' })
          await diaryService.uploadMedia(entry.id, file, 'photo')
        } catch {
          toast('Entry saved, but your drawing could not be uploaded', 'error')
        }
      } else if (existingDrawing) {
        // Canvas was cleared — remove the old drawing
        try {
          await diaryService.deleteMedia(entry.id, existingDrawing.id)
        } catch {
          // ignore
        }
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
      if (!isEdit) {
        offlineSync.queueDiaryEntry({
          title: title.trim() || undefined,
          // Drawings can't be stored offline — save a note about it
          content: content.trim() || (drawingBlob ? '[Handwritten entry — drawing pending upload]' : ''),
          mood: mood ?? undefined,
          entryDate: date,
          isPinned: pinned,
        })
        toast('Saved offline! Will automatically sync once server connects.', 'info')
        navigate('/diary')
        return
      }
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
        subtitle="Write freely with keyboard or digital stylus"
        icon={<PenLine size={22} className="text-gold-300" />}
        accent="from-gold-500 to-amber-600"
        action={
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Back
          </Button>
        }
      />

      {/* Input Mode Switcher (Type / Stylus / Mixed) */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setInputMode('type')}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
              inputMode === 'type'
                ? 'bg-gradient-to-r from-gold-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <Keyboard size={14} />
            Type
          </button>
          <button
            type="button"
            onClick={() => setInputMode('stylus')}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
              inputMode === 'stylus'
                ? 'bg-gradient-to-r from-gold-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <PenTool size={14} />
            Stylus / Handwrite
          </button>
          <button
            type="button"
            onClick={() => setInputMode('mixed')}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
              inputMode === 'mixed'
                ? 'bg-gradient-to-r from-gold-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <Layers size={14} />
            Both (Text + Sketch)
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-[#fdf6e3] text-[#3d2b1f] shadow-2xl"
      >
        <div className="absolute bottom-0 left-12 top-0 w-px bg-[#e8c4b8]" />
        {inputMode !== 'stylus' && (
          <div
            className="absolute inset-x-12 top-8 bottom-0 pointer-events-none opacity-50"
            style={{
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 35px, #d5cfc0 35px, #d5cfc0 36px)',
            }}
          />
        )}
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

          {/* Typing Area (visible in 'type' or 'mixed' mode) */}
          {(inputMode === 'type' || inputMode === 'mixed') && (
            <div>
              {inputMode === 'mixed' && (
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#a08464]">
                  Typed Notes
                </label>
              )}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind today?"
                className={cn(
                  'w-full resize-y border-none bg-transparent text-[15px] leading-[2.4] text-[#3d2b1f] placeholder:text-[#b8a680] focus:outline-none',
                  inputMode === 'mixed' ? 'min-h-[160px]' : 'min-h-[320px]',
                )}
                autoFocus={inputMode === 'type'}
              />
            </div>
          )}

          {/* Stylus Handwriting Canvas (visible in 'stylus' or 'mixed' mode) */}
          <AnimatePresence>
            {(inputMode === 'stylus' || inputMode === 'mixed') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 pt-2"
              >
                {inputMode === 'mixed' && (
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#a08464]">
                    ✍️ Stylus Sketch / Handwritten Notes
                  </label>
                )}
                <HandwritingCanvas
                  ref={canvasRef}
                  height={inputMode === 'stylus' ? 520 : 360}
                  initialImageUrl={existingDrawing?.url}
                />
              </motion.div>
            )}
          </AnimatePresence>

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