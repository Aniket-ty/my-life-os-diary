import { useRef, useState, useEffect, useMemo } from 'react'
import { Camera, Sparkles, Upload, Search, Loader2, Scale, Hash, Check } from 'lucide-react'
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
    name: '🥚 Whole Egg',
    servingUnit: 'large egg (50g)',
    servingWeightG: 50,
    per100g: { calories: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
  },
  {
    name: '🍳 Boiled Egg',
    servingUnit: 'egg (50g)',
    servingWeightG: 50,
    per100g: { calories: 155, proteinG: 12.6, carbsG: 1.1, fatG: 10.6 },
  },
  {
    name: '🍌 Banana',
    servingUnit: 'medium banana (118g)',
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
    name: '🫓 Roti / Chapati',
    servingUnit: 'medium roti (40g)',
    servingWeightG: 40,
    per100g: { calories: 297, proteinG: 9.3, carbsG: 55.8, fatG: 3.7 },
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
  {
    name: '🥛 Protein Shake',
    servingUnit: 'scoop (30g powder)',
    servingWeightG: 30,
    per100g: { calories: 400, proteinG: 80, carbsG: 10, fatG: 5 },
  },
  {
    name: '🥜 Almonds',
    servingUnit: 'handful (30g)',
    servingWeightG: 30,
    per100g: { calories: 579, proteinG: 21.2, carbsG: 21.6, fatG: 49.9 },
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

/**
 * Extracts a natural, human unit name (e.g. "eggs", "bananas", "slices", "rotis")
 */
function getUnitDisplay(servingUnit?: string, foodName?: string, count: number = 1): string {
  const raw = (servingUnit || '').toLowerCase()
  const nameLower = (foodName || '').toLowerCase()

  if (raw.includes('egg') || nameLower.includes('egg')) {
    if (raw.includes('white') || nameLower.includes('white')) {
      return count === 1 ? 'egg white' : 'egg whites'
    }
    return count === 1 ? 'egg' : 'eggs'
  }
  if (raw.includes('banana') || nameLower.includes('banana')) {
    return count === 1 ? 'banana' : 'bananas'
  }
  if (raw.includes('roti') || raw.includes('chapati') || nameLower.includes('roti') || nameLower.includes('chapati')) {
    return count === 1 ? 'roti' : 'rotis'
  }
  if (raw.includes('slice') || raw.includes('bread') || nameLower.includes('bread')) {
    return count === 1 ? 'slice' : 'slices'
  }
  if (raw.includes('fillet') || raw.includes('breast') || nameLower.includes('chicken')) {
    return count === 1 ? 'fillet / piece' : 'fillets / pieces'
  }
  if (raw.includes('scoop')) {
    return count === 1 ? 'scoop' : 'scoops'
  }
  if (raw.includes('bowl') || raw.includes('cup') || raw.includes('katori')) {
    return count === 1 ? 'bowl' : 'bowls'
  }
  if (raw.includes('handful')) {
    return count === 1 ? 'handful' : 'handfuls'
  }
  if (raw.includes('idli') || nameLower.includes('idli')) {
    return count === 1 ? 'idli' : 'idlis'
  }
  if (raw.includes('dosa') || nameLower.includes('dosa')) {
    return count === 1 ? 'dosa' : 'dosas'
  }
  if (raw.includes('paratha') || nameLower.includes('paratha')) {
    return count === 1 ? 'paratha' : 'parathas'
  }
  if (raw.includes('apple') || nameLower.includes('apple')) {
    return count === 1 ? 'apple' : 'apples'
  }

  const cleaned = raw.replace(/\s*\(.*?\)/g, '').trim()
  if (cleaned && cleaned !== 'serving') return cleaned

  return count === 1 ? 'piece' : 'pieces'
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
  const [measureMode, setMeasureMode] = useState<'quantity' | 'weight'>('quantity')
  const [quantityNum, setQuantityNum] = useState<string>('1')
  const [weightG, setWeightG] = useState<string>('50')

  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)

  // Photo scanning
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  // API & Local Search
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<ApiFoodResult[]>([])

  // Active Food Metadata for dynamic calculations
  const [foodMeta, setFoodMeta] = useState<FoodItemMeta | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  function reset() {
    setName('')
    setMeasureMode('quantity')
    setQuantityNum('1')
    setWeightG('100')
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
    const singleWeight = meta.servingWeightG || 100
    const totalG = Math.round(q * singleWeight)
    setWeightG(String(totalG))
    computeFromWeight(totalG, meta.per100g)
  }

  function handleQuantityChange(val: string, metaOverride?: FoodItemMeta | null) {
    setQuantityNum(val)
    const activeMeta = metaOverride !== undefined ? metaOverride : foodMeta
    const numQty = Number(val) || 0
    if (activeMeta) {
      computeFromQuantity(numQty, activeMeta)
    } else if (calories && val) {
      const w = Number(weightG) || 100
      setWeightG(String(Math.round(numQty * w)))
    }
  }

  function handleWeightChange(val: string, metaOverride?: FoodItemMeta | null) {
    setWeightG(val)
    const activeMeta = metaOverride !== undefined ? metaOverride : foodMeta
    const numG = Number(val) || 0
    if (activeMeta) {
      computeFromWeight(numG, activeMeta.per100g)
      const singleWeight = activeMeta.servingWeightG || 100
      const estQty = (numG / singleWeight).toFixed(1)
      setQuantityNum(estQty.endsWith('.0') ? estQty.slice(0, -2) : estQty)
    }
  }

  function selectFoodItem(item: FoodItemMeta) {
    setName(item.foodName)
    setFoodMeta(item)

    if (measureMode === 'quantity') {
      const q = quantityNum && Number(quantityNum) > 0 ? Number(quantityNum) : 1
      setQuantityNum(String(q))
      computeFromQuantity(q, item)
    } else {
      const g = weightG && Number(weightG) > 0 ? Number(weightG) : item.servingWeightG || 100
      setWeightG(String(g))
      computeFromWeight(g, item.per100g)
      const singleWeight = item.servingWeightG || 100
      const estQty = (g / singleWeight).toFixed(1)
      setQuantityNum(estQty.endsWith('.0') ? estQty.slice(0, -2) : estQty)
    }
  }

  function switchMode(newMode: 'quantity' | 'weight') {
    setMeasureMode(newMode)
    if (!foodMeta) return

    if (newMode === 'quantity') {
      const q = Math.max(0.1, Number(quantityNum) || 1)
      computeFromQuantity(q, foodMeta)
    } else {
      const g = Math.max(1, Number(weightG) || foodMeta.servingWeightG || 100)
      computeFromWeight(g, foodMeta.per100g)
    }
  }

  // ── Auto-Match from Database when typing Food Name ───────────────

  function handleNameChange(text: string) {
    setName(text)
    const trimmed = text.trim()
    if (!trimmed) {
      setFoodMeta(null)
      return
    }

    const matches = searchLocalFoods(trimmed, 3)
    if (matches.length > 0) {
      const top = matches[0]
      const isDirectMatch =
        top.name.toLowerCase() === trimmed.toLowerCase() ||
        top.name.toLowerCase().startsWith(trimmed.toLowerCase()) ||
        top.keywords?.some((k) => k.toLowerCase() === trimmed.toLowerCase())

      if (isDirectMatch && (!foodMeta || foodMeta.foodName !== top.name)) {
        const newMeta: FoodItemMeta = {
          foodName: top.name,
          per100g: top.per100g,
          servingUnit: top.servingUnit,
          servingWeightG: top.servingWeightG,
        }
        setFoodMeta(newMeta)
        if (measureMode === 'quantity') {
          computeFromQuantity(Number(quantityNum) || 1, newMeta)
        } else {
          computeFromWeight(Number(weightG) || top.servingWeightG || 100, top.per100g)
        }
      }
    }
  }

  // ── Food Photo Analysis ──────────────────────────────────────

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUrl(URL.createObjectURL(file))
    setPhotoName(file.name)
    setAnalyzing(true)
    try {
      const data = await fitnessService.analyzeFoodImage(file)
      if (!data.foodName || !data.per100g) {
        throw new Error('Could not identify this food. Try a clearer photo.')
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

  // ── Smart Food Search ───────────────────────────────────────────

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const localMatches: ApiFoodResult[] = searchLocalFoods(trimmed, 8).map((item) => ({
      name: item.name,
      servingUnit: item.servingUnit,
      servingWeightG: item.servingWeightG,
      macros: item.per100g,
      isCurated: true,
    }))
    setSearchResults(localMatches)

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

  // Live matching suggestions for the Food Name field
  const inlineSuggestions = useMemo(() => {
    if (!name.trim() || (foodMeta && foodMeta.foodName.toLowerCase() === name.trim().toLowerCase())) {
      return []
    }
    return searchLocalFoods(name.trim(), 4)
  }, [name, foodMeta])

  const singlePieceWeight = foodMeta?.servingWeightG || 100
  const currentUnitLabel = getUnitDisplay(foodMeta?.servingUnit, name || foodMeta?.foodName, Number(quantityNum) || 1)

  // ── Save Food Log ───────────────────────────────────────────────

  async function save() {
    if (!name.trim() || !calories) {
      toast('Food name and calories are required', 'error')
      return
    }
    setSaving(true)
    try {
      const finalQuantity =
        measureMode === 'quantity'
          ? `${quantityNum || '1'} ${currentUnitLabel} (${weightG || singlePieceWeight}g)`
          : `${weightG || '100'}g`

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

        {/* Food Photo Scanner */}
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
              Snap or upload a photo — it identifies the meal and calculates macros from your quantity or weight.
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
                    <span>Identifying your meal nutrition…</span>
                  </div>
                ) : foodMeta ? (
                  <div className="space-y-1">
                    <p className="truncate text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-emerald-300">
                      Nutrition per 100g: {foodMeta.per100g.calories} kcal · P {foodMeta.per100g.proteinG}g · C {foodMeta.per100g.carbsG}g · F {foodMeta.per100g.fatG}g
                    </p>
                    <p className="text-xs text-slate-400">1 {currentUnitLabel} ≈ {singlePieceWeight}g</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Search Food Database */}
        <div className="relative z-20 space-y-1.5">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food database (e.g. egg, chicken, oats, rice, banana)..."
              className="pl-10"
            />
            {isSearching && (
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-black/95 shadow-2xl backdrop-blur-xl z-30">
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
                        {res.servingUnit ? ` · 1 serving: ${res.servingUnit}` : ''}
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
            {QUICK_FOODS.map((f) => {
              const isSelected = foodMeta?.foodName === f.name || name === f.name
              return (
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
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-semibold'
                      : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200',
                  )}
                >
                  {f.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Food Name Field + Live Auto-Match Suggestions */}
        <div className="space-y-1">
          <Input
            label="Food Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Whole Egg, Chicken Breast, Banana, Oats..."
          />
          {inlineSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400">Suggestions:</span>
              {inlineSuggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    selectFoodItem({
                      foodName: item.name,
                      per100g: item.per100g,
                      servingUnit: item.servingUnit,
                      servingWeightG: item.servingWeightG,
                    })
                  }
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                >
                  + {item.name} ({item.servingWeightG}g {getUnitDisplay(item.servingUnit, item.name, 1)})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── PORTION CALCULATOR: QUANTITY (COUNT) VS WEIGHT (GRAMS) ── */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Calculate Portion By:
            </label>
            <div className="flex rounded-lg border border-white/10 bg-black/40 p-0.5">
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
                <span>Quantity (Count)</span>
              </button>
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
                <span>Weight (Grams)</span>
              </button>
            </div>
          </div>

          {measureMode === 'quantity' ? (
            /* ── QUANTITY / COUNT MODE ── */
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <Input
                  label={`Quantity (${currentUnitLabel})`}
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={quantityNum}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="e.g. 1, 2, 3"
                />
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    Quick Count
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['0.5', '1', '2', '3', '4', '5', '6'].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleQuantityChange(q)}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-lg border transition-all font-medium',
                          quantityNum === q
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10',
                        )}
                      >
                        {q === '0.5' ? '½' : q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                1 {getUnitDisplay(foodMeta?.servingUnit, name || foodMeta?.foodName, 1)} = {singlePieceWeight}g
                {weightG ? ` · Total Weight: ${weightG}g` : ''}
              </p>
            </div>
          ) : (
            /* ── WEIGHT (GRAMS) MODE ── */
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <Input
                  label="Weight in Grams (g)"
                  type="number"
                  min="1"
                  value={weightG}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  placeholder="e.g. 100"
                />
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                    Quick Weights
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[50, 100, 150, 200, 250, 300].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleWeightChange(String(g))}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-lg border transition-all font-medium',
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
              <p className="text-xs text-slate-400">
                {weightG || 0}g ≈ {quantityNum || 1} {currentUnitLabel} (1 {getUnitDisplay(foodMeta?.servingUnit, name || foodMeta?.foodName, 1)} = {singlePieceWeight}g)
              </p>
            </div>
          )}

          {/* Real-time Dynamic Nutrition Summary Card */}
          {calories && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
              <Sparkles size={16} className="shrink-0 text-emerald-400" />
              <div className="flex-1">
                <div className="font-semibold text-emerald-200">
                  {measureMode === 'quantity'
                    ? `${quantityNum || 1} ${currentUnitLabel} (${weightG || 0}g)`
                    : `${weightG || 0}g ${name || foodMeta?.foodName || ''} (≈ ${quantityNum || 1} ${currentUnitLabel})`}
                </div>
                <div className="font-bold text-emerald-400 text-sm mt-0.5">
                  {calories} kcal · P {protein || 0}g · C {carbs || 0}g · F {fat || 0}g
                </div>
              </div>
              <div className="rounded-full bg-emerald-500/20 p-1 text-emerald-300">
                <Check size={14} />
              </div>
            </div>
          )}
        </div>

        {/* Nutritional Breakdown Inputs (Auto-filled, fully editable) */}
        <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-3">
          <Input
            label="Total Calories (kcal) *"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="e.g. 143"
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Protein (g)"
              type="number"
              step="0.1"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="12.6"
            />
            <Input
              label="Carbs (g)"
              type="number"
              step="0.1"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              placeholder="0.7"
            />
            <Input
              label="Fat (g)"
              type="number"
              step="0.1"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              placeholder="9.5"
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