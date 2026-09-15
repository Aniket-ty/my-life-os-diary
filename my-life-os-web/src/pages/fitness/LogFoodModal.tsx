import { useRef, useState } from 'react'
import { Camera, Sparkles } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { fitnessService, type FoodAnalysisResult } from '@/services/fitness'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toISODate, MEALS, MEAL_LABEL, type MealType } from '@/lib/utils'
import { cn } from '@/lib/utils'

const QUICK_FOODS = [
  { name: '🍌 Banana', calories: 105, proteinG: 1, carbsG: 27, fatG: 0 },
  { name: '🍗 Chicken Breast', calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  { name: '🍚 Rice', calories: 205, proteinG: 4.3, carbsG: 45, fatG: 0.4 },
  { name: '🥚 Egg', calories: 70, proteinG: 6.3, carbsG: 0.4, fatG: 4.8 },
  { name: '🥜 Almonds', calories: 164, proteinG: 6, carbsG: 6, fatG: 14 },
  { name: '🥛 Protein Shake', calories: 120, proteinG: 24, carbsG: 3, fatG: 1.5 },
]

export function LogFoodModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)

  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<FoodAnalysisResult | null>(null)
  const [portionG, setPortionG] = useState('100')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  function reset() {
    setName('')
    setQuantity('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setPhotoUrl(null)
    setPhotoName(null)
    setAiResult(null)
    setPortionG('100')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function applyPortion(result: FoodAnalysisResult, grams: string) {
    const g = Math.max(0, Number(grams) || 0)
    const factor = g / 100
    setName(result.foodName)
    setCalories(String(Math.max(0, Math.round(result.per100g.calories * factor))))
    setProtein(String(Math.max(0, Math.round(result.per100g.proteinG * factor * 10) / 10)))
    setCarbs(String(Math.max(0, Math.round(result.per100g.carbsG * factor * 10) / 10)))
    setFat(String(Math.max(0, Math.round(result.per100g.fatG * factor * 10) / 10)))
    setQuantity(`${g}g`)
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUrl(URL.createObjectURL(file))
    setPhotoName(file.name)
    setAiResult(null)
    setAnalyzing(true)
    try {
      const data = await fitnessService.analyzeFoodImage(file)
      if (!data.foodName || !data.per100g) {
        throw new Error('AI could not identify this food. Try a clearer photo.')
      }
      setAiResult(data)
      setPortionG('100')
      applyPortion(data, '100')
    } catch (err) {
      setPhotoUrl(null)
      setPhotoName(null)
      toast(err instanceof Error ? err.message : 'Could not analyze the photo', 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  function onPortionChange(value: string) {
    setPortionG(value)
    if (aiResult) applyPortion(aiResult, value)
  }

  async function save() {
    if (!name.trim() || !calories) {
      toast('Name and calories are required', 'error')
      return
    }
    setSaving(true)
    try {
      await fitnessService.logFood({
        foodName: name.trim(),
        mealType,
        calories: Number(calories),
        proteinG: protein ? Number(protein) : undefined,
        carbsG: carbs ? Number(carbs) : undefined,
        fatG: fat ? Number(fat) : undefined,
        quantity: quantity.trim() || undefined,
        logDate: toISODate(new Date()),
        aiSuggested: !!aiResult,
      })
      toast(`${name.trim()} logged`)
      reset()
      onSaved()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to log', 'error')
    } finally {
      setSaving(false)
    }
  }

  function applyQuick(food: (typeof QUICK_FOODS)[number]) {
    setName(food.name)
    setCalories(String(food.calories))
    setProtein(String(food.proteinG))
    setCarbs(String(food.carbsG))
    setFat(String(food.fatG))
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Log food" wide>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Meal</label>
          <div className="grid grid-cols-4 gap-1.5">
            {MEALS.map((m) => (
              <button
                key={m}
                onClick={() => setMealType(m)}
                className={cn(
                  'rounded-xl border py-2 text-xs font-semibold capitalize transition-all',
                  mealType === m
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08]',
                )}
              >
                {MEAL_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        {/* AI food photo */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFilePicked}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Snap or upload a food photo — AI identifies it and fills nutrition from the portion weight.
            </p>
            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={analyzing} className="shrink-0 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
              <Camera size={14} />
              {analyzing ? 'Analyzing…' : 'Add photo'}
            </Button>
          </div>

          {photoUrl && (
            <div className="mt-3 flex gap-3">
              <img src={photoUrl} alt={photoName ?? 'Food'} className="h-24 w-24 shrink-0 rounded-lg border border-white/10 object-cover" />
              <div className="min-w-0 flex-1">
                {analyzing ? (
                  <p className="text-sm text-slate-300">AI is identifying your food…</p>
                ) : aiResult ? (
                  <div className="space-y-1.5">
                    <p className="truncate text-sm font-semibold text-white">{aiResult.foodName}</p>
                    <p className="text-xs text-emerald-300">
                      per 100g: {aiResult.per100g.calories} kcal · P {aiResult.per100g.proteinG}g · C {aiResult.per100g.carbsG}g · F {aiResult.per100g.fatG}g
                    </p>
                    {aiResult.serving && <p className="text-xs text-slate-400">Serving: {aiResult.serving}</p>}
                    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                      <Input label="Portion (g)" type="number" value={portionG} onChange={(e) => onPortionChange(e.target.value)} placeholder="100" />
                      <p className="self-end pb-1.5 text-xs font-semibold text-teal-300">
                        → {calories} kcal · P {protein}g · C {carbs}g · F {fat}g
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_FOODS.map((f) => (
            <button
              key={f.name}
              onClick={() => applyQuick(f)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200"
            >
              {f.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Food" value={name} onChange={(e) => setName(e.target.value)} placeholder="Grilled chicken salad" />
          <Input label="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1 bowl, 150g…" />
        </div>
        <Input
          label="Calories"
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="320"
        />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Protein (g)" type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="25" />
          <Input label="Carbs (g)" type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="40" />
          <Input label="Fat (g)" type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="10" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => { onClose(); reset() }}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={save}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20"
          >
            <Sparkles size={15} />
            Set fitness
          </Button>
        </div>
      </div>
    </Modal>
  )
}