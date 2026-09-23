import {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react'
import {
  Pen,
  Pencil,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Maximize2,
  Minimize2,
  Palette,
  Grid3X3,
  AlignJustify,
  File,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToolType = 'pen' | 'pencil' | 'highlighter' | 'eraser'
export type PaperTemplate = 'lined' | 'grid' | 'blank'

export interface HandwritingCanvasHandle {
  isEmpty: () => boolean
  getCanvasBlob: () => Promise<Blob | null>
  clear: () => void
  hasStrokes: boolean
}

interface Point {
  x: number
  y: number
  pressure: number
}

interface HandwritingCanvasProps {
  className?: string
  height?: number
  onStrokeChange?: (hasStrokes: boolean) => void
  /** Existing pen drawing image to load as the editable base layer */
  initialImageUrl?: string
}

const PALETTE = [
  { name: 'Classic Ink', color: '#2c221e' },
  { name: 'Navy Blue', color: '#1d4ed8' },
  { name: 'Amber Gold', color: '#b45309' },
  { name: 'Forest Emerald', color: '#047857' },
  { name: 'Crimson Red', color: '#b91c1c' },
  { name: 'Plum Violet', color: '#6d28d9' },
  { name: 'Highlighter Yellow', color: '#eab308' },
]

const STROKE_SIZES: Record<ToolType, number[]> = {
  pen: [2, 4, 7, 12],
  pencil: [1.5, 3, 5, 8],
  highlighter: [14, 22, 32, 42],
  eraser: [10, 20, 35, 55],
}

export const HandwritingCanvas = forwardRef<HandwritingCanvasHandle, HandwritingCanvasProps>(
  function HandwritingCanvas({ className, height = 480, onStrokeChange, initialImageUrl }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawingRef = useRef(false)
    const pointsRef = useRef<Point[]>([])
    const historyRef = useRef<ImageData[]>([])
    const historyStepRef = useRef<number>(-1)
    const baseImageRef = useRef<HTMLImageElement | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const [tool, setTool] = useState<ToolType>('pen')
    const [color, setColor] = useState('#2c221e')
    const [strokeWidthIdx, setStrokeWidthIdx] = useState(1) // medium by default
    const [paper, setPaper] = useState<PaperTemplate>('lined')
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)
    const [hasStrokes, setHasStrokes] = useState(false)

    const activeWidth = STROKE_SIZES[tool][strokeWidthIdx] ?? STROKE_SIZES[tool][1]

    // Save history snapshot
    const pushHistory = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const nextStep = historyStepRef.current + 1
      historyRef.current = historyRef.current.slice(0, nextStep)
      historyRef.current.push(imgData)
      historyStepRef.current = nextStep

      setCanUndo(nextStep > 0)
      setCanRedo(false)
      const stroked = nextStep > 0
      setHasStrokes(stroked)
      onStrokeChange?.(stroked)
    }, [onStrokeChange])

    // Draw background grid/lines onto canvas or clear
    const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, template: PaperTemplate) => {
      ctx.save()
      ctx.fillStyle = '#fdf6e3'
      ctx.fillRect(0, 0, width, height)

      if (template === 'lined') {
        // Red vertical margin line
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.22)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(50, 0)
        ctx.lineTo(50, height)
        ctx.stroke()

        // Horizontal ruled lines
        ctx.strokeStyle = 'rgba(180, 160, 130, 0.35)'
        ctx.lineWidth = 1
        const lineSpacing = 36
        for (let y = lineSpacing; y < height; y += lineSpacing) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
          ctx.stroke()
        }
      } else if (template === 'grid') {
        ctx.fillStyle = 'rgba(180, 160, 130, 0.45)'
        const gridSpacing = 24
        for (let x = gridSpacing; x < width; x += gridSpacing) {
          for (let y = gridSpacing; y < height; y += gridSpacing) {
            ctx.beginPath()
            ctx.arc(x, y, 1, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      ctx.restore()
    }, [])

    // Initialize canvas dimensions and history dynamically on resize
    useEffect(() => {
      const canvas = canvasRef.current
      const wrapper = wrapperRef.current
      if (!canvas || !wrapper) return

      let resizeTimer: any

      const handleResize = () => {
        const rect = wrapper.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        const w = rect.width || 700
        const h = rect.height || height

        if (canvas.style.width === `${w}px` && canvas.style.height === `${h}px`) return

        canvas.width = w * dpr
        canvas.height = h * dpr
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.scale(dpr, dpr)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Restore current step on top of a fresh full-size background
        if (historyRef.current.length > 0 && historyStepRef.current >= 0) {
          drawBackground(ctx, w, h, paper)
          ctx.putImageData(historyRef.current[historyStepRef.current], 0, 0)
        } else if (initialImageUrl && !baseImageRef.current) {
          drawBackground(ctx, w, h, paper)
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const scale = Math.min(w / img.width, h / img.height)
            const dw = img.width * scale
            const dh = img.height * scale
            ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
            baseImageRef.current = img
            const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            historyRef.current = [initialData]
            historyStepRef.current = 0
            setHasStrokes(true)
            onStrokeChange?.(true)
          }
          img.onerror = () => { baseImageRef.current = null }
          img.src = initialImageUrl
        } else if (!baseImageRef.current) {
          drawBackground(ctx, w, h, paper)
          const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          historyRef.current = [initialData]
          historyStepRef.current = 0
        }
      }

      const observer = new ResizeObserver(() => {
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(handleResize, 50)
      })

      observer.observe(wrapper)
      handleResize()

      return () => {
        observer.disconnect()
        clearTimeout(resizeTimer)
      }
    }, [height, paper, drawBackground, initialImageUrl, onStrokeChange])

    // Undo action
    const handleUndo = useCallback(() => {
      if (historyStepRef.current <= 0) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const nextStep = historyStepRef.current - 1
      historyStepRef.current = nextStep
      ctx.putImageData(historyRef.current[nextStep], 0, 0)

      setCanUndo(nextStep > 0)
      setCanRedo(true)
      const stroked = nextStep > 0
      setHasStrokes(stroked)
      onStrokeChange?.(stroked)
    }, [onStrokeChange])

    // Redo action
    const handleRedo = useCallback(() => {
      if (historyStepRef.current >= historyRef.current.length - 1) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const nextStep = historyStepRef.current + 1
      historyStepRef.current = nextStep
      ctx.putImageData(historyRef.current[nextStep], 0, 0)

      setCanUndo(true)
      setCanRedo(nextStep < historyRef.current.length - 1)
      setHasStrokes(true)
      onStrokeChange?.(true)
    }, [onStrokeChange])

    // Clear action
    const handleClear = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const rect = canvas.getBoundingClientRect()
      baseImageRef.current = null
      drawBackground(ctx, rect.width, rect.height, paper)
      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      historyRef.current = [initialData]
      historyStepRef.current = 0
      setHasStrokes(false)
      onStrokeChange?.(false)
      setCanUndo(false)
      setCanRedo(false)
    }, [drawBackground, paper, onStrokeChange])

    // Keyboard shortcuts for Undo/Redo
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            e.preventDefault()
            handleRedo()
          } else {
            e.preventDefault()
            handleUndo()
          }
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault()
          handleRedo()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleUndo, handleRedo])

    // Listen to native fullscreen changes
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement)
      }
      document.addEventListener('fullscreenchange', handleFullscreenChange)
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    // Pointer Event handlers
    const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      // Stylus pressure check (default to 0.5 for mouse/finger)
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5
      return { x, y, pressure }
    }

    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.setPointerCapture(e.pointerId)
      isDrawingRef.current = true

      const p = getCanvasPoint(e)
      pointsRef.current = [p]

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.save()
      configureContext(ctx, tool, color, activeWidth, p.pressure)
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(1, (activeWidth * p.pressure) / 2), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const p = getCanvasPoint(e)
      pointsRef.current.push(p)

      const points = pointsRef.current
      if (points.length < 2) return

      ctx.save()
      configureContext(ctx, tool, color, activeWidth, p.pressure)

      if (points.length === 2) {
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        ctx.lineTo(points[1].x, points[1].y)
        ctx.stroke()
      } else {
        // Smooth quadratic bezier curve between midpoints
        const p1 = points[points.length - 2]
        const p2 = points[points.length - 1]
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY)
        ctx.stroke()
      }
      ctx.restore()
    }

    const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      pointsRef.current = []
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        // pointer capture already released
      }
      pushHistory()
    }

    const configureContext = (
      ctx: CanvasRenderingContext2D,
      currentTool: ToolType,
      currentColor: string,
      baseWidth: number,
      pressure: number,
    ) => {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = '#fdf6e3'
        ctx.fillStyle = '#fdf6e3'
        ctx.lineWidth = baseWidth
      } else if (currentTool === 'highlighter') {
        ctx.globalCompositeOperation = 'multiply'
        ctx.strokeStyle = hexToRgba(currentColor, 0.4)
        ctx.fillStyle = hexToRgba(currentColor, 0.4)
        ctx.lineWidth = baseWidth
      } else if (currentTool === 'pencil') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = hexToRgba(currentColor, 0.75)
        ctx.fillStyle = hexToRgba(currentColor, 0.75)
        ctx.lineWidth = baseWidth * (0.6 + pressure * 0.5)
      } else {
        // Standard pressure-sensitive ink pen
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = currentColor
        ctx.fillStyle = currentColor
        ctx.lineWidth = Math.max(1, baseWidth * (0.4 + pressure * 0.9))
      }
    }

    const hexToRgba = (hex: string, alpha: number) => {
      const c = hex.replace('#', '')
      if (c.length === 3) {
        const r = parseInt(c[0] + c[0], 16)
        const g = parseInt(c[1] + c[1], 16)
        const b = parseInt(c[2] + c[2], 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      }
      if (c.length === 6) {
        const r = parseInt(c.substring(0, 2), 16)
        const g = parseInt(c.substring(2, 4), 16)
        const b = parseInt(c.substring(4, 6), 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      }
      return hex
    }

    // Imperative handle for parent component
    useImperativeHandle(ref, () => ({
      isEmpty: () => !baseImageRef.current && historyStepRef.current <= 0,
      hasStrokes,
      clear: handleClear,
      getCanvasBlob: () =>
        new Promise<Blob | null>((resolve) => {
          const canvas = canvasRef.current
          if (!canvas || (!baseImageRef.current && historyStepRef.current <= 0)) {
            resolve(null)
            return
          }
          canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95)
        }),
    }))

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative flex flex-col overflow-hidden rounded-3xl border border-[#d8cbb0] bg-[#fdf6e3] shadow-lg transition-all',
          isFullscreen && 'rounded-none border-none !w-screen !h-screen !max-w-none !max-h-none !m-0', 
          className,
        )}
      >
        {/* Stylus Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8ddc6] bg-[#f5ecda]/90 px-4 py-2.5 backdrop-blur-sm">
          {/* Tool selectors */}
          <div className="flex items-center gap-1 rounded-2xl bg-white/70 p-1 shadow-sm border border-[#e2d5bd]">
            <button
              type="button"
              title="Ink Pen (Stylus Pressure)"
              onClick={() => setTool('pen')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                tool === 'pen'
                  ? 'bg-[#c8a96e] text-white shadow-sm'
                  : 'text-[#5a4435] hover:bg-black/5',
              )}
            >
              <Pen size={14} />
              <span className="hidden sm:inline">Pen</span>
            </button>
            <button
              type="button"
              title="Pencil"
              onClick={() => setTool('pencil')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                tool === 'pencil'
                  ? 'bg-[#c8a96e] text-white shadow-sm'
                  : 'text-[#5a4435] hover:bg-black/5',
              )}
            >
              <Pencil size={14} />
              <span className="hidden sm:inline">Pencil</span>
            </button>
            <button
              type="button"
              title="Highlighter"
              onClick={() => setTool('highlighter')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                tool === 'highlighter'
                  ? 'bg-[#c8a96e] text-white shadow-sm'
                  : 'text-[#5a4435] hover:bg-black/5',
              )}
            >
              <Highlighter size={14} />
              <span className="hidden sm:inline">Highlighter</span>
            </button>
            <button
              type="button"
              title="Eraser"
              onClick={() => setTool('eraser')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                tool === 'eraser'
                  ? 'bg-[#c8a96e] text-white shadow-sm'
                  : 'text-[#5a4435] hover:bg-black/5',
              )}
            >
              <Eraser size={14} />
              <span className="hidden sm:inline">Eraser</span>
            </button>
          </div>

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-white/70 px-2.5 py-1 shadow-sm border border-[#e2d5bd]">
            <span className="text-[11px] font-semibold text-[#8a6d2f] hidden md:inline">Size</span>
            {STROKE_SIZES[tool].map((w, idx) => (
              <button
                key={w}
                type="button"
                onClick={() => setStrokeWidthIdx(idx)}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                  strokeWidthIdx === idx
                    ? 'bg-[#c8a96e]/25 ring-2 ring-[#c8a96e]'
                    : 'hover:bg-black/5',
                )}
              >
                <div
                  className="rounded-full bg-[#3d2b1f]"
                  style={{ width: Math.min(18, Math.max(3, w * 0.8)), height: Math.min(18, Math.max(3, w * 0.8)) }}
                />
              </button>
            ))}
          </div>

          {/* Colors Palette (hidden for eraser) */}
          {tool !== 'eraser' && (
            <div className="flex items-center gap-1.5 rounded-2xl bg-white/70 px-2.5 py-1 shadow-sm border border-[#e2d5bd]">
              {PALETTE.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  title={p.name}
                  onClick={() => setColor(p.color)}
                  className={cn(
                    'h-6 w-6 rounded-full transition-transform',
                    color === p.color ? 'scale-125 ring-2 ring-[#3d2b1f] ring-offset-1' : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: p.color }}
                />
              ))}
              <label
                title="Custom Color"
                className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[#d8cbb0] bg-white text-[#8a6d2f] hover:bg-black/5"
              >
                <Palette size={12} />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
          )}

          {/* Paper template selection & controls */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 rounded-xl bg-white/70 p-0.5 border border-[#e2d5bd]">
              <button
                type="button"
                title="Lined Paper"
                onClick={() => setPaper('lined')}
                className={cn('rounded-lg p-1.5 text-[#5a4435]', paper === 'lined' && 'bg-[#c8a96e]/20 text-[#8a6d2f]')}
              >
                <AlignJustify size={14} />
              </button>
              <button
                type="button"
                title="Dot Grid Paper"
                onClick={() => setPaper('grid')}
                className={cn('rounded-lg p-1.5 text-[#5a4435]', paper === 'grid' && 'bg-[#c8a96e]/20 text-[#8a6d2f]')}
              >
                <Grid3X3 size={14} />
              </button>
              <button
                type="button"
                title="Blank Paper"
                onClick={() => setPaper('blank')}
                className={cn('rounded-lg p-1.5 text-[#5a4435]', paper === 'blank' && 'bg-[#c8a96e]/20 text-[#8a6d2f]')}
              >
                <File size={14} />
              </button>
            </div>

            {/* Undo / Redo */}
            <button
              type="button"
              disabled={!canUndo}
              onClick={handleUndo}
              title="Undo (Ctrl+Z)"
              className="rounded-xl border border-[#e2d5bd] bg-white/70 p-2 text-[#5a4435] disabled:opacity-35 hover:bg-white"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={handleRedo}
              title="Redo (Ctrl+Y)"
              className="rounded-xl border border-[#e2d5bd] bg-white/70 p-2 text-[#5a4435] disabled:opacity-35 hover:bg-white"
            >
              <Redo2 size={14} />
            </button>
            <button
              type="button"
              onClick={handleClear}
              title="Clear Canvas"
              className="rounded-xl border border-[#e2d5bd] bg-white/70 p-2 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) {
                  containerRef.current?.requestFullscreen().catch(() => setIsFullscreen(true))
                } else {
                  document.exitFullscreen().catch(() => setIsFullscreen(false))
                }
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Drawing'}
              className="rounded-xl border border-[#e2d5bd] bg-white/70 p-2 text-[#5a4435] hover:bg-white"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        {/* Canvas writing surface */}
        <div ref={wrapperRef} className="relative flex-1 cursor-crosshair overflow-hidden touch-none select-none">
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onPointerLeave={stopDrawing}
            style={{ touchAction: 'none' }}
            className="block h-full w-full"
          />
          {/* Subtle stylus hint watermark */}
          <div className="pointer-events-none absolute bottom-3 right-4 select-none text-[11px] font-medium tracking-wide text-[#a08464]/60">
            ✍️ Stylus & Touch Enabled
          </div>
        </div>
      </div>
    )
  },
)
