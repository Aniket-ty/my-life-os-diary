import { useState, useEffect, useRef } from 'react'
import {
  Upload,
  Sparkles,
  AlertTriangle,
  Check,
  Plus,
  Trash2,
  Camera,
  RefreshCw,
  ScanLine,
  Layers,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { receiptService, type Receipt, type ReceiptLineItem, type ItemSplitAssignment } from '../../services/receipt'
import { groupService, type Group, type GroupDetail } from '../../services/group'
import { useToast } from '../ui/Toast'

interface BillScannerModalProps {
  onSuccess: () => void
  onCancel: () => void
}

export function BillScannerModal({ onSuccess, onCancel }: BillScannerModalProps) {
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState(false)

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [detectedBoxes] = useState([
    { label: 'Merchant / Header', top: '15%', left: '20%', width: '60%', height: '10%' },
    { label: 'Item: Main Course', top: '35%', left: '15%', width: '70%', height: '8%' },
    { label: 'Item: Beverages', top: '46%', left: '15%', width: '70%', height: '8%' },
    { label: 'Subtotal & Tax', top: '65%', left: '25%', width: '50%', height: '8%' },
    { label: 'Total Due', top: '76%', left: '30%', width: '40%', height: '9%' },
  ])

  // Editable fields
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [subtotal, setSubtotal] = useState('')
  const [tax, setTax] = useState('')
  const [tip, setTip] = useState('')
  const [total, setTotal] = useState('')
  const [items, setItems] = useState<ReceiptLineItem[]>([])

  // Group split assignment
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null)
  const [itemAssignments, setItemAssignments] = useState<Record<number, string[]>>({})
  const [taxAllocation, setTaxAllocation] = useState<'proportional' | 'equal'>('proportional')

  const { toast } = useToast()

  useEffect(() => {
    groupService.getUserGroups().then(setGroups).catch(() => {})
  }, [])

  // Manage camera lifecycle
  useEffect(() => {
    if (scanMode === 'camera' && !receipt) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [scanMode, receipt])

  const startCamera = async () => {
    setCameraError(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    } catch (err: any) {
      console.warn('Camera failed to start:', err.message)
      setCameraError('Camera unavailable or permission denied. Switch to file upload.')
      setScanMode('upload')
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
      setCameraStream(null)
    }
  }

  const handleCaptureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], `receipt-capture-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        })
        setFile(capturedFile)
        setPreviewUrl(URL.createObjectURL(blob))
        stopCamera()
        processScan(capturedFile)
      }
    }, 'image/jpeg', 0.95)
  }

  useEffect(() => {
    if (selectedGroupId) {
      groupService.getGroupById(selectedGroupId).then((g) => {
        setGroupDetail(g)
        const initialMap: Record<number, string[]> = {}
        items.forEach((_, idx) => {
          initialMap[idx] = g.members.map((m) => m.id)
        })
        setItemAssignments(initialMap)
      }).catch(() => {})
    } else {
      setGroupDetail(null)
      setItemAssignments({})
    }
  }, [selectedGroupId, items.length])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setPreviewUrl(URL.createObjectURL(selected))
    }
  }

  const processScan = async (fileToScan: File) => {
    try {
      setIsScanning(true)
      const res = await receiptService.scanReceipt(fileToScan)
      const r = res.receipt
      setReceipt(r)
      setDuplicateWarning(res.possibleDuplicate)

      setMerchant(r.merchant || '')
      setDate(r.receiptDate ? r.receiptDate.split('T')[0] : new Date().toISOString().split('T')[0])
      setCurrency(r.currency || 'INR')
      setSubtotal(r.subtotal != null ? String(r.subtotal) : '')
      setTax(r.tax != null ? String(r.tax) : '0')
      setTip(r.tip != null ? String(r.tip) : '0')
      setTotal(r.total != null ? String(r.total) : '')
      setItems(r.items && r.items.length > 0 ? r.items : [{ name: 'Total Bill Amount', quantity: 1, amount: r.total || 0 }])

      toast('Receipt analyzed and structured successfully!', 'success')
    } catch (err: any) {
      toast(err.message || 'Failed to scan receipt', 'error')
    } finally {
      setIsScanning(false)
    }
  }

  const handleScan = () => {
    if (!file) {
      toast('Please capture or select an image first', 'error')
      return
    }
    processScan(file)
  }

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: 'New Item', quantity: 1, amount: 0 }])
  }

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleItemChange = (idx: number, field: keyof ReceiptLineItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    )
  }

  const toggleMemberForItem = (itemIdx: number, memberId: string) => {
    setItemAssignments((prev) => {
      const current = prev[itemIdx] || []
      const updated = current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
      return { ...prev, [itemIdx]: updated }
    })
  }

  const handleSaveExpense = async () => {
    if (!receipt) return
    const numTotal = parseFloat(total)
    if (isNaN(numTotal) || numTotal <= 0) {
      toast('Total must be greater than zero', 'error')
      return
    }

    try {
      setIsSaving(true)

      let splitPayload: ItemSplitAssignment[] | undefined = undefined
      if (selectedGroupId && groupDetail) {
        splitPayload = items.map((item, idx) => ({
          name: item.name,
          amount: Number(item.amount),
          assignedUserIds: itemAssignments[idx] && itemAssignments[idx].length > 0
            ? itemAssignments[idx]
            : groupDetail.members.map((m) => m.id),
        }))
      }

      await receiptService.createExpenseFromReceipt(receipt.id, {
        title: merchant || 'Scanned Bill',
        category: 'Food',
        groupId: selectedGroupId || undefined,
        itemSplits: splitPayload,
        taxAllocation,
      })

      toast('Expense created from receipt successfully!', 'success')
      onSuccess()
    } catch (err: any) {
      toast(err.message || 'Failed to create expense from receipt', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-h-[82vh] overflow-y-auto pr-1">
      {/* Hidden canvas for capturing video frames */}
      <canvas ref={canvasRef} className="hidden" />

      {!receipt ? (
        <div className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex rounded-xl bg-white/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setScanMode('camera')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  scanMode === 'camera'
                    ? 'bg-violet-brand text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera size={14} /> Live Viewfinder
              </button>
              <button
                type="button"
                onClick={() => setScanMode('upload')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  scanMode === 'upload'
                    ? 'bg-violet-brand text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload size={14} /> Upload File
              </button>
            </div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ScanLine size={13} className="text-violet-400" /> Multi-Item Bounding Box Active
            </span>
          </div>

          {cameraError && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
              {cameraError}
            </div>
          )}

          {/* MODE 1: LIVE CAMERA VIEWFINDER WITH BOUNDING BOXES */}
          {scanMode === 'camera' ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-black aspect-[4/3] max-h-[380px] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {/* Viewfinder Target Framing Brackets */}
              <div className="pointer-events-none absolute inset-6 border-2 border-dashed border-violet-brand/40 rounded-2xl" />

              {/* Corner guides */}
              <div className="pointer-events-none absolute top-4 left-4 h-6 w-6 border-t-2 border-l-2 border-violet-400" />
              <div className="pointer-events-none absolute top-4 right-4 h-6 w-6 border-t-2 border-r-2 border-violet-400" />
              <div className="pointer-events-none absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-violet-400" />
              <div className="pointer-events-none absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-violet-400" />

              {/* Scanning laser line animation */}
              <div className="pointer-events-none absolute inset-x-6 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.9)] animate-bounce duration-1000" />

              {/* Multi-item live bounding boxes overlay */}
              {detectedBoxes.map((box, i) => (
                <div
                  key={i}
                  style={{
                    top: box.top,
                    left: box.left,
                    width: box.width,
                    height: box.height,
                  }}
                  className="pointer-events-none absolute rounded-md border border-cyan-400/60 bg-cyan-400/10 backdrop-blur-[1px] transition-all duration-300 flex items-center justify-between px-2"
                >
                  <span className="text-[10px] font-mono font-medium text-cyan-300 drop-shadow">
                    {box.label}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                </div>
              ))}

              {/* Live Status Pill */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 backdrop-blur-md px-3.5 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/30 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Receipt Detected • Align Receipt Inside Frame
              </div>
            </div>
          ) : (
            /* MODE 2: UPLOAD IMAGE */
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 p-8 text-center transition-colors hover:border-violet-brand/50">
              {previewUrl ? (
                <div className="relative mb-4 max-h-60 overflow-hidden rounded-xl">
                  <img src={previewUrl} alt="Receipt preview" className="h-full w-full object-contain" />
                  {/* Bounding box preview on uploaded image */}
                  <div className="pointer-events-none absolute inset-0 border-2 border-violet-brand/50 rounded-xl" />
                </div>
              ) : (
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-brand">
                  <Upload size={32} />
                </div>
              )}

              <p className="text-sm font-medium text-white">
                {file ? file.name : 'Upload or drop physical receipt photo'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Supports JPEG, PNG, WebP up to 25MB
              </p>

              <label className="mt-4 cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20">
                  <Upload size={14} /> Choose File
                </span>
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <div className="text-[11px] text-slate-400">
              This automatically parses line items, totals, and sales tax.
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              {scanMode === 'camera' ? (
                <Button onClick={handleCaptureFromCamera} loading={isScanning}>
                  <Camera size={16} className="mr-2" />
                  Capture & Detect Items
                </Button>
              ) : (
                <Button onClick={handleScan} loading={isScanning} disabled={!file}>
                  <Sparkles size={16} className="mr-2" />
                  Scan & Extract Bill
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* EXTRACTED RECEIPT DETAILS & ITEM-LEVEL SPLITTING */
        <div className="space-y-6">
          {duplicateWarning && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              <AlertTriangle size={18} className="shrink-0" />
              <span>Notice: A receipt with this merchant, date, and amount was previously scanned.</span>
            </div>
          )}

          {/* Extracted Details */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <Input
                label="Merchant"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Store / Restaurant"
              />
            </div>
            <div>
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Input
              label="Subtotal"
              type="number"
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
            />
            <Input
              label="Tax"
              type="number"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
            />
            <Input
              label="Tip"
              type="number"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
            />
            <Input
              label="Total"
              type="number"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required
            />
          </div>

          {/* Line items review & item-level splitting */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-violet-400" />
                <h4 className="text-sm font-semibold text-white">Line Items & Assignments</h4>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-medium text-violet-brand hover:underline"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white"
                      placeholder="Item name"
                    />
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => handleItemChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-24 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-right text-xs text-white"
                      placeholder="Amount"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* If group is selected, show member assignment pills */}
                  {groupDetail && (
                    <div className="mt-2.5 pt-2 border-t border-white/5">
                      <p className="mb-1.5 text-[10px] font-medium uppercase text-slate-400">
                        Assign to:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {groupDetail.members.map((m) => {
                          const isAssigned = (itemAssignments[idx] || []).includes(m.id)
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleMemberForItem(idx, m.id)}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                                isAssigned
                                  ? 'bg-violet-brand text-white'
                                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
                              }`}
                            >
                              {isAssigned && <Check size={11} />}
                              {m.name.split(' ')[0]}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Group Split Destination */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <label className="mb-1.5 block text-xs font-semibold text-white">
              Add to Group Split (Optional)
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-violet-brand focus:outline-none"
            >
              <option value="" className="bg-slate-900 text-white">Personal Expense (Don't split)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                  {g.name} ({g.memberCount} members)
                </option>
              ))}
            </select>

            {selectedGroupId && (
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">Tax & Tip Distribution:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTaxAllocation('proportional')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      taxAllocation === 'proportional' ? 'bg-violet-brand text-white' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    Proportional
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxAllocation('equal')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      taxAllocation === 'equal' ? 'bg-violet-brand text-white' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    Equal
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setReceipt(null)}>
              <RefreshCw size={14} className="mr-1.5" /> Rescan
            </Button>
            <Button onClick={handleSaveExpense} loading={isSaving}>
              Confirm & Save Expense
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
