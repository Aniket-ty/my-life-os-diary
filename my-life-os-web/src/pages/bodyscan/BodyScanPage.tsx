import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import { ScanLine, Plus, Trash2, TrendingDown, TrendingUp, Minus, UserPlus, Dumbbell, Flame, CheckCircle2, CalendarCheck } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { bodyScanService, type BodyScan } from '@/services/bodyScan'
import { fitnessService, type ConsistencyReport } from '@/services/fitness'
import { PageHeader } from '@/components/ui/PageHeader'
import { Loading } from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { toISODate, formatDate } from '@/lib/utils'

function Trend({ value }: { value: number }) {
  if (value < 0) return <TrendingDown size={14} className="text-emerald-400" />
  if (value > 0) return <TrendingUp size={14} className="text-rose-400" />
  return <Minus size={14} className="text-slate-400" />
}

export function BodyScanPage() {
  const [scans, setScans] = useState<BodyScan[]>([])
  const [report, setReport] = useState<ConsistencyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      const [scansData, reportData] = await Promise.all([
        bodyScanService.list(),
        fitnessService.getReport(30).catch(() => null),
      ])
      setScans(scansData)
      setReport(reportData)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load scans', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!loading && scans.length === 0) setShowAdd(true)
  }, [loading, scans.length])

  const chartData = useMemo(() => {
    const sorted = [...scans].sort((a, b) => new Date(a.scanDate).getTime() - new Date(b.scanDate).getTime())
    return sorted.map((s) => ({
      date: formatDate(s.scanDate).split(',').slice(0, 2).join(' '),
      weight: Number(s.weight) || null,
      bodyFat: s.bodyFatPct != null ? Number(s.bodyFatPct) : null,
      muscle: s.muscleMassKg != null ? Number(s.muscleMassKg) : null,
    }))
  }, [scans])

  const latest = scans[0]
  const baseline = scans[scans.length - 1]

  async function remove(id: string) {
    try {
      await bodyScanService.remove(id)
      setScans((prev) => prev.filter((s) => s.id !== id))
      toast('Scan deleted')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error')
    }
  }

  const stats = [
    {
      label: 'Weight',
      value: latest ? `${Number(latest.weight).toFixed(1)} kg` : '—',
      delta: latest && baseline ? Number(latest.weight) - Number(baseline.weight) : null,
      icon: ScanLine,
      color: 'text-rose-300',
      bg: 'from-rose-500/20 to-red-500/5',
      desc: 'Total body mass',
    },
    {
      label: 'Body fat',
      value: latest?.bodyFatPct != null ? `${Number(latest.bodyFatPct).toFixed(1)}%` : '—',
      delta: latest && baseline && latest.bodyFatPct != null && baseline.bodyFatPct != null
        ? Number(latest.bodyFatPct) - Number(baseline.bodyFatPct)
        : null,
      icon: Dumbbell,
      color: 'text-orange-300',
      bg: 'from-orange-500/20 to-amber-500/5',
      desc: 'Fat percentage',
    },
    {
      label: 'Muscle mass',
      value: latest?.muscleMassKg != null ? `${Number(latest.muscleMassKg).toFixed(1)} kg` : '—',
      delta: latest && baseline && latest.muscleMassKg != null && baseline.muscleMassKg != null
        ? Number(latest.muscleMassKg) - Number(baseline.muscleMassKg)
        : null,
      icon: UserPlus,
      color: 'text-emerald-300',
      bg: 'from-emerald-500/20 to-teal-500/5',
      desc: 'Lean muscle mass',
    },
  ]

  const tooltipStyle = {
    background: 'rgba(17, 17, 34, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    fontSize: '12px',
  }

  return (
    <div>
      <PageHeader
        title="Body Scan"
        subtitle="Track your body's transformation over time"
        icon={<ScanLine size={22} className="text-rose-300" />}
        accent="from-rose-500 to-orange-500"
        action={
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add scan
          </Button>
        }
      />

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-2xl p-5"
              >
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.bg}`}>
                  <s.icon size={19} className={s.color} />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{s.label}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-display text-2xl font-bold text-white">{s.value}</p>
                  {s.delta != null && Math.abs(s.delta) > 0.001 && (
                    <span
                      className={`flex items-center gap-0.5 text-xs font-semibold ${
                        (s.label === 'Body fat' && s.delta < 0) || (s.label === 'Weight' && s.delta < 0) || (s.label === 'Muscle mass' && s.delta > 0)
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {s.delta > 0 ? '+' : ''}
                      {s.delta.toFixed(1)}
                      <Trend value={s.delta} />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {baseline ? `vs ${formatDate(baseline.scanDate).split(',').slice(1, 3).join(' ').trim()}` : s.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Weight trend"
              unit="kg"
              chart={
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="weight" stroke="#f43f5e" strokeWidth={2.5} fill="url(#w)" dot={{ r: 3, fill: '#f43f5e' }} />
                </AreaChart>
              }
            />
            <ChartCard
              title="Body fat %"
              unit="%"
              chart={
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="bodyFat" stroke="#f97316" strokeWidth={2.5} fill="url(#f)" dot={{ r: 3, fill: '#f97316' }} />
                </AreaChart>
              }
            />
            <div className="lg:col-span-2">
              <ChartCard
                title="Muscle mass trend"
                unit="kg"
                chart={
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="0" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} width={36} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="muscle" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: '#34d399' }} />
                  </LineChart>
                }
              />
            </div>
          </div>

          {/* Consistency Report */}
          {report && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="mb-3 font-display text-lg font-semibold text-white">Consistency Report</h2>
              <p className="mb-4 text-xs text-slate-500">Last {report.period} days overview</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="glass rounded-2xl p-5">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/5">
                    <Dumbbell size={19} className="text-emerald-300" />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Workouts</p>
                  <p className="mt-1 font-display text-2xl font-bold text-white">
                    {report.workouts.uniqueDays}
                    <span className="text-sm font-normal text-slate-500"> / {report.period} days</span>
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all"
                      style={{ width: `${report.workouts.consistencyPct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    {report.workouts.completed} completed · {report.workouts.consistencyPct}% consistency
                  </p>
                </div>

                <div className="glass rounded-2xl p-5">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/5">
                    <Flame size={19} className="text-orange-300" />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Nutrition Logs</p>
                  <p className="mt-1 font-display text-2xl font-bold text-white">
                    {report.nutrition.uniqueDays}
                    <span className="text-sm font-normal text-slate-500"> / {report.period} days</span>
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all"
                      style={{ width: `${report.nutrition.loggingPct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    {report.nutrition.totalLogs} entries · {report.nutrition.loggingPct}% logging
                  </p>
                </div>

                <div className="glass rounded-2xl p-5">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/5">
                    <CheckCircle2 size={19} className="text-sky-300" />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Tasks</p>
                  <p className="mt-1 font-display text-2xl font-bold text-white">
                    {report.todos.completed}
                    <span className="text-sm font-normal text-slate-500"> / {report.todos.total} done</span>
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 transition-all"
                      style={{ width: `${report.todos.completionRate}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    {report.todos.completionRate}% completion rate
                  </p>
                </div>
              </div>

              {/* Daily heatmap */}
              <div className="mt-4 glass rounded-2xl p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display font-semibold text-white">Daily Activity</h3>
                  {report.activePlan && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <CalendarCheck size={12} />
                      {report.activePlan.name} ({report.activePlan.daysPerWeek}d/wk)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {report.dailyBreakdown.map((day) => {
                    const score = (day.hasWorkout ? 1 : 0) + (day.hasNutrition ? 1 : 0)
                    const colors = ['bg-white/[0.04]', 'bg-emerald-500/30', 'bg-emerald-500/60']
                    return (
                      <div
                        key={day.date}
                        title={`${day.date}${day.hasWorkout ? ' · Workout' : ''}${day.hasNutrition ? ' · Nutrition' : ''}${day.plannedWorkout ? ` · Plan: ${day.plannedWorkout.workoutName}` : ''}`}
                        className={`h-7 w-7 rounded-md ${colors[score]} transition-all hover:scale-110`}
                      />
                    )
                  })}
                </div>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-white/[0.04]" /> None</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30" /> 1 activity</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/60" /> Both</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* History */}
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold text-white">Scan history</h2>
            {scans.length === 0 ? (
              <div className="glass flex flex-col items-center justify-center rounded-2xl py-14 text-center">
                <ScanLine size={30} className="mb-2 text-rose-300/50" />
                <p className="text-sm text-slate-400">No scans yet. Log your first body scan.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence>
                  {scans.map((s, i) => (
                    <motion.div
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass group flex items-center gap-4 rounded-2xl px-4 py-3.5"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15">
                        <ScanLine size={16} className="text-rose-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{formatDate(s.scanDate)}</p>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          <span>{Number(s.weight)} kg</span>
                          {s.bodyFatPct != null && <span>{Number(s.bodyFatPct)}% fat</span>}
                          {s.muscleMassKg != null && <span>{Number(s.muscleMassKg)} kg muscle</span>}
                          {s.visceralFat != null && <span>visceral {s.visceralFat}</span>}
                          {s.bioAge != null && <span>bio age {s.bioAge}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => remove(s.id)}
                        className="rounded-lg p-1.5 text-slate-600 opacity-0 transition-opacity hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </div>
      )}

      <AddScanModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => {
          load()
          toast('Scan recorded')
        }}
      />
    </div>
  )
}

function ChartCard({
  title,
  unit,
  chart,
}: {
  title: string
  unit: string
  chart: ReactNode
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-semibold text-white">{title}</h3>
        <span className="text-[11px] font-medium text-slate-500">({unit})</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const ADD_FIELDS = [
  { key: 'weight', label: 'Weight (kg)', required: true, type: 'number', step: '0.1' },
  { key: 'bodyFatPct', label: 'Body fat %', type: 'number', step: '0.1' },
  { key: 'muscleMassKg', label: 'Muscle mass (kg)', type: 'number', step: '0.1' },
  { key: 'leanBodyMassKg', label: 'Lean body mass (kg)', type: 'number', step: '0.1' },
  { key: 'bmr', label: 'BMR (kcal)', type: 'number' },
  { key: 'tee', label: 'TEE (kcal)', type: 'number' },
  { key: 'visceralFat', label: 'Visceral fat', type: 'number', step: '0.1' },
  { key: 'bwiScore', label: 'BWI score', type: 'number', step: '0.1' },
  { key: 'bioAge', label: 'Biological age', type: 'number' },
  { key: 'proteinKg', label: 'Protein (g/kg)', type: 'number', step: '0.1' },
]

function AddScanModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [scanDate, setScanDate] = useState(toISODate(new Date()))
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setValues({})
      setNotes('')
      setScanDate(toISODate(new Date()))
    }
  }, [open])

  async function save() {
    const weight = Number(values.weight)
    if (!values.weight || weight <= 0) {
      toast('Weight is required', 'error')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { scanDate, weight }
      for (const f of ADD_FIELDS) {
        if (values[f.key] !== undefined && values[f.key] !== '') {
          payload[f.key] = Number(values[f.key])
        }
      }
      if (notes.trim()) payload.notes = notes.trim()
      await bodyScanService.create(payload as never)
      onSaved()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save scan', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New body scan" wide>
      <div className="space-y-4">
        <Input
          label="Scan date"
          type="date"
          value={scanDate}
          onChange={(e) => setScanDate(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ADD_FIELDS.map((f) => (
            <Input
              key={f.key}
              label={f.label}
              type={f.type}
              step={f.step}
              required={f.required}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.required ? 'Required' : '—'}
            />
          ))}
        </div>
        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Feeling good…" />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save} className="bg-gradient-to-r from-rose-500 to-orange-500 shadow-lg shadow-rose-500/20">
            Save scan
          </Button>
        </div>
      </div>
    </Modal>
  )
}