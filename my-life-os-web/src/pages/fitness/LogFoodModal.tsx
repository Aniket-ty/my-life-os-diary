import { useRef, useState, useEffect } from 'react'
import { Camera, Sparkles, Upload, Search, Loader2, Scale, Hash } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { fitnessService } from '@/services/fitness'
import { searchLocalFoods } from '@/services/foodDatabase'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toISODate, MEALS, MEAL_LABEL, type MealType } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BaseMacros {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

interface QuickFood {
  name: string
  servingUnit: string
  servingWeightG: number
  per100g: BaseMacros
}

const QUICK_FOODS: QuickFood[] = [
  {
    name: '🍌 Banana',
    servingUnit: 'banana (118g)',
    servingWeightG: 118,
    per100g: { calories: 89, proteinG: 1.1, carbsG: 22.8, fatG: 0.3 },
  },
  {
    name: '🍗 Chicken Breast',
    servingUnit: 'fillet (150g)',
    servingWeightG: 150,
    per100g: { calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  },
  {
    name: '🍚 Cooked Rice',
    servingUnit: 'cup / bowl (150g)',
    servingWeightG: 150,
    per100g: { calories: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3 },
  },
  {
    name: '🥚 Whole Egg',
    servingUnit: 'large egg (50g)',
    servingWeightG: 50,
    per100g: { calories: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
  },
  {
    name: '🥜 Almonds',
    servingUnit: 'handful (30g)',
    servingWeightG: 30,
    per100g: { calories: 579, proteinG: 21.2, carbsG: 21.6, fatG: 49.9 },
  },
  {
    name: '🥛 Protein Shake',
    servingUnit: 'scoop (30g powder)',
    servingWeightG: 30,
    per100g: { calories: 400, proteinG: 80, carbsG: 10, fatG: 5 },
  },
  {
    name: '🍞 Whole Wheat Bread',
    servingUnit: 'slice (40g)',
    servingWeightG: 40,
    per100g: { calories: 247, proteinG: 13, carbsG: 41, fatG: 3.4 },
  },
  {
    name: '🥣 Oatmeal / Oats',
    servingUnit: 'bowl (50g dry)',
    servingWeightG: 50,
    per100g: { calories: 389, proteinG: 16.9, carbsG: 66.3, fatG: 6.9 },
  },
]

interface FoodItemMeta {
  foodName: string
  per100g: BaseMacros
  servingUnit: string
  servingWeightG: number
}

interface ApiFoodResult {
  name: string
  servingUnit: string
  servingWeightG: number
  macros: BaseMacros
  isCurated?: boolean
}

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
  const [measureMode, setMeasureMode] = useState<'weight' | 'quantity'>('weight')
  const [weightG, setWeightG] = useState<string>('100')
  const [quantityNum, setQuantityNum] = useState<string>('1')
  const [servingUnit, setServingUnit] = useState<string>('serving')

  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)

  // AI Scanning
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  // API Search
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<ApiFoodResult[]>([])

  // Active Food Metadata for dynamic weight/quantity calculations
  const [foodMeta, setFoodMeta] = useState<FoodItemMeta | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  function reset() {
    setName('')
    setMeasureMode('weight')
    setWeightG('100')
    setQuantityNum('1')
    setServingUnit('serving')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setPhotoUrl(null)
    setPhotoName(null)
    setFoodMeta(null)
    setSearchQuery('')
    setSearchResults([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  // ── Calculation Functions based on Weight or Quantity ───────────

  function computeFromWeight(grams: number, per100: BaseMacros) {
    const g = Math.max(0, grams)
    const factor = g / 100
    setCalories(String(Math.max(0, Math.round(per100.calories * factor))))
    setProtein(String(Math.max(0, Math.round(per100.proteinG * factor * 10) / 10)))
    setCarbs(String(Math.max(0, Math.round(per100.carbsG * factor * 10) / 10)))
    setFat(String(Math.max(0, Math.round(per100.fatG * factor * 10) / 10)))
  }

  function computeFromQuantity(qty: number, meta: FoodItemMeta) {
    const q = Math.max(0, qty)
    const totalG = Math.round(q * (meta.servingWeightG || 100))
    setWeightG(String(totalG))
    computeFromWeight(totalG, meta.per100g)
  }

  function handleWeightChange(val: string) {
    setWeightG(val)
    const numG = Number(val) || 0
    if (foodMeta) {
      computeFromWeight(numG, foodMeta.per100g)
      // Sync quantity estimate
      const estQty = (numG / (foodMeta.servingWeightG || 100)).toFixed(1)
      setQuantityNum(estQty === '1.0' ? '1' : estQty)
    }
  }

  function handleQuantityChange(val: string) {
    setQuantityNum(val)
    const numQty = Number(val) || 0
    if (foodMeta) {
      computeFromQuantity(numQty, foodMeta)
    }
  }

  function selectFoodItem(item: FoodItemMeta) {
    setName(item.foodName)
    setFoodMeta(item)
    setServingUnit(item.servingUnit || 'serving')

    if (measureMode === 'weight') {
      const defaultG = String(item.servingWeightG || 100)
      setWeightG(defaultG)
      setQuantityNum('1')
      computeFromWeight(Number(defaultG), item.per100g)
    } else {
      setQuantityNum('1')
      setWeightG(String(item.servingWeightG || 100))
      computeFromQuantity(1, item)
    }
  }

  function switchMode(newMode: 'weight' | 'quantity') {
    setMeasureMode(newMode)
    if (!foodMeta) return

    if (newMode === 'weight') {
      const g = Math.max(0, Number(weightG) || foodMeta.servingWeightG || 100)
      computeFromWeight(g, foodMeta.per100g)
    } else {
      const q = Math.max(0, Number(quantityNum) || 1)
      computeFromQuantity(q, foodMeta)
    }
  }

  // ── AI Food Photo Analysis ──────────────────────────────────────

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUrl(URL.createObjectURL(file))
    setPhotoName(file.name)
    setAnalyzing(true)
    try {
      const data = await fitnessService.analyzeFoodImage(file)
      if (!data.foodName || !data.per100g) {
        throw new Error('AI could not identify this food. Try a clearer photo.')
      }

      let servingWeight = 100
      let unit = data.serving || 'serving (100g)'
      const match = unit.match(/(\d+)\s*g/i)
      if (match) {
        servingWeight = Number(match[1]) || 100
      }

      selectFoodItem({
        foodName: data.foodName,
        per100g: {
          calories: Number(data.per100g.calories) || 0,
          proteinG: Number(data.per100g.proteinG) || 0,
          carbsG: Number(data.per100g.carbsG) || 0,
          fatG: Number(data.per100g.fatG) || 0,
        },
        servingUnit: unit,
        servingWeightG: servingWeight,
      })
    } catch (err) {
      setPhotoUrl(null)
      setPhotoName(null)
      toast(err instanceof Error ? err.message : 'Could not analyze the photo', 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Smart Food Search (Instant Curated Database + OpenFoodFacts Fallback) ──

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    // 1. Instant 0ms local search from curated database
    const localMatches: ApiFoodResult[] = searchLocalFoods(trimmed, 8).map((item) => ({
      name: item.name,
      servingUnit: item.servingUnit,
      servingWeightG: item.servingWeightG,
      macros: item.per100g,
      isCurated: true,
    }))
    setSearchResults(localMatches)

    // 2. If query has 3+ chars, search OpenFoodFacts in background for packaged products
    if (trimmed.length < 3) return

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true)
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 4000)
        const res = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
            trimmed,
          )}&search_simple=1&action=process&json=1&page_size=8&lc=en`,
          { signal: controller.signal },
        )
        clearTimeout(timeout)
        const data = await res.json()
        if (data.products && data.products.length > 0) {
          const apiMatches: ApiFoodResult[] = data.products
            .filter((p: any) => {
              const pName = (p.product_name || '').trim()
              const cal = Number(p.nutriments?.['energy-kcal_100g'] || p.nutriments?.['energy-kcal'] || 0)
              return pName.length > 2 && cal > 0
            })
            .map((p: any) => {
              const servingWeight = Number(p.serving_quantity) || 100
              const unit = p.serving_size || `${servingWeight}g serving`
              return {
                name: p.product_name,
                servingUnit: unit,
                servingWeightG: servingWeight,
                macros: {
                  calories: Math.round(Number(p.nutriments?.['energy-kcal_100g'] || p.nutriments?.['energy-kcal'] || 0)),
                  proteinG: Math.round(Number(p.nutriments?.['proteins_100g'] || 0) * 10) / 10,
                  carbsG: Math.round(Number(p.nutriments?.['carbohydrates_100g'] || 0) * 10) / 10,
                  fatG: Math.round(Number(p.nutriments?.['fat_100g'] || 0) * 10) / 10,
                },
                isCurated: false,
              }
            })

          const seenNames = new Set(localMatches.map((l) => l.name.toLowerCase()))
          const dedupedApi = apiMatches.filter((a) => !seenNames.has(a.name.toLowerCase()))
          setSearchResults([...localMatches, ...dedupedApi])
        }
      } catch {
        // Keep local matches
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  // ── Save Food Log ───────────────────────────────────────────────

  async function save() {
    if (!name.trim() || !calories) {
      toast('Food name and calories are required', 'error')
      return
    }
    setSaving(true)
    try {
      const finalQuantity =
        measureMode === 'weight'
          ? `${weightG.trim() || '100'}g`
          : `${quantityNum.trim() || '1'} ${servingUnit} (${weightG || 100}g)`

      await fitnessService.logFood({
        foodName: name.trim(),
        mealType,
        calories: Number(calories),
        proteinG: protein ? Number(protein) : undefined,
        carbsG: carbs ? Number(carbs) : undefined,
        fatG: fat ? Number(fat) : undefined,
        quantity: finalQuantity,
        logDate: toISODate(new Date()),
        aiSuggested: !!foodMeta,
      })
      toast(`${name.trim()} logged successfully!`)
      reset()
      onSaved()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to log food', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Log food" wide>
      <div className="space-y-4">
        {/* Meal Type Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">Meal</label>
          <div className="grid grid-cols-4 gap-1.5">
            {MEALS.map((m) => (
              <button
                key={m}
                type="button"
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

        {/* AI Food Photo Scanner */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFilePicked}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFilePicked}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Snap or upload a photo — AI identifies the meal and calculates macros from your weight or quantity.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => cameraInputRef.current?.click()}
                disabled={analyzing}
                className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
              >
                <Camera size={14} />
                {analyzing ? 'Analyzing…' : 'Take photo'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="border-white/10 text-slate-300 hover:bg-white/10"
              >
                <Upload size={14} />
                Add photo
              </Button>
            </div>
          </div>

          {photoUrl && (
            <div className="mt-3 flex gap-3">
              <img
                src={photoUrl}
                alt={photoName ?? 'Food'}
                className="h-20 w-20 shrink-0 rounded-lg border border-white/10 object-cover"
              />
              <div className="min-w-0 flex-1">
                {analyzing ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-slate-300">
                    <Loader2 size={16} className="animate-spin text-emerald-400" />
                    <span>AI is identifying your meal nutrition…</span>
                  </div>
                ) : foodMeta ? (
                  <div className="space-y-1">
                    <p className="truncate text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-emerald-300">
                      Nutrition per 100g: {foodMeta.per100g.calories} kcal · P {foodMeta.per100g.proteinG}g · C {foodMeta.per100g.carbsG}g · F {foodMeta.per100g.fatG}g
                    </p>
                    <p className="text-xs text-slate-400">Standard serving: {foodMeta.servingUnit}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Search OpenFoodFacts Database */}
        <div className="relative z-10 space-y-1.5">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food database (e.g. Greek yogurt, oats, salmon)..."
              className="pl-10"
            />
            {isSearching && (
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-black/95 shadow-2xl backdrop-blur-xl">
              <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      selectFoodItem({
                        foodName: res.name,
                        per100g: res.macros,
                        servingUnit: res.servingUnit,
                        servingWeightG: res.servingWeightG,
                      })
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-white/10 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-200">{res.name}</span>
                        {res.isCurated ? (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            Verified
                          </span>
                        ) : (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                            Packaged
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Per 100g: {res.macros.calories} kcal · P {res.macros.proteinG}g · C {res.macros.carbsG}g · F {res.macros.fatG}g
                        {res.servingUnit ? ` · Serving: ${res.servingUnit}` : ''}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-emerald-400">
                      {res.macros.calories} kcal
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Food Chips */}
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium">Quick Picks:</span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FOODS.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() =>
                  selectFoodItem({
                    foodName: f.name,
                    per100g: f.per100g,
                    servingUnit: f.servingUnit,
                    servingWeightG: f.servingWeightG,
                  })
                }
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  foodMeta?.foodName === f.name
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-semibold'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200',
                )}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Food Name Field */}
        <Input
          label="Food Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Grilled chicken breast"
        />

        {/* ── WEIGHT VS QUANTITY PORTION CALCULATOR ─────────────── */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Calculate Portion By:
            </label>
            <div className="flex rounded-lg border border-white/10 bg-black/40 p-0.5">
              <button
                type="button"
                onClick={() => switchMode('weight')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all',
                  measureMode === 'weight'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200',
                )}
              >
                <Scale size={13} />
                <span>Weight (g)</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('quantity')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all',
                  measureMode === 'quantity'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200',
                )}
              >
                <Hash size={13} />
                <span>Quantity</span>
              </button>
            </div>
          </div>

          {measureMode === 'weight' ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <Input
                  label="Enter Weight (grams)"
                  type="number"
                  min="1"
                  value={weightG}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  placeholder="e.g. 150"
                />
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    Quick Weight Presets
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[50, 100, 150, 200, 250, 300].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleWeightChange(String(g))}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-lg border transition-all',
                          weightG === String(g)
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10',
                        )}
                      >
                        {g}g
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {foodMeta && (
                <p className="text-xs text-slate-400">
                  Calculated from base: {foodMeta.per100g.calories} kcal per 100g
                  {foodMeta.servingWeightG ? ` (≈ ${(Number(weightG || 0) / foodMeta.servingWeightG).toFixed(1)} ${foodMeta.servingUnit})` : ''}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <Input
                  label={`Enter Quantity (${foodMeta?.servingUnit || 'servings / pieces'})`}
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={quantityNum}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="e.g. 1, 2, 1.5"
                />
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    Quick Quantity Presets
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['0.5', '1', '1.5', '2', '3', '4'].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleQuantityChange(q)}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-lg border transition-all',
                          quantityNum === q
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10',
                        )}
                      >
                        {q}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                1 {foodMeta?.servingUnit || 'serving'} = {foodMeta?.servingWeightG || 100}g
                {weightG ? ` (Total weight: ${weightG}g)` : ''}
              </p>
            </div>
          )}

          {/* Real-time Calculation Confirmation */}
          {calories && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <Sparkles size={14} className="shrink-0" />
              <span className="font-semibold">
                {measureMode === 'weight'
                  ? `${weightG || 0}g`
                  : `${quantityNum || 1} ${foodMeta?.servingUnit || 'serving'} (${weightG}g)`}:
              </span>
              <span className="font-bold">
                {calories} kcal · P {protein || 0}g · C {carbs || 0}g · F {fat || 0}g
              </span>
            </div>
          )}
        </div>

        {/* Nutritional Breakdown Inputs */}
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <Input
            label="Total Calories (kcal)"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="e.g. 248"
          />
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Input
              label="Protein (g)"
              type="number"
              step="0.1"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="46.5"
            />
            <Input
              label="Carbs (g)"
              type="number"
              step="0.1"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Fat (g)"
              type="number"
              step="0.1"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              placeholder="5.4"
            />
          </div>
        </div>

        {/* Action Buttons */}
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
            Log Food
          </Button>
        </div>
      </div>
    </Modal>
  )
}