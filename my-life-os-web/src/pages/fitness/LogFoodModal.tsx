import { useRef, useState, useEffect } from 'react'
import { Camera, Sparkles, Upload, Search, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { fitnessService } from '@/services/fitness'
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

interface BaseMacros {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

interface ApiFoodResult {
  name: string
  macros: BaseMacros
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
  const [quantityStr, setQuantityStr] = useState('')
  const [weightStr, setWeightStr] = useState('')
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
  
  // Base macros & Multiplier (for both AI and API)
  const [baseMacros, setBaseMacros] = useState<BaseMacros | null>(null)
  const [multiplier, setMultiplier] = useState('1')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  function reset() {
    setName('')
    setQuantityStr('')
    setWeightStr('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setPhotoUrl(null)
    setPhotoName(null)
    setBaseMacros(null)
    setMultiplier('1')
    setSearchQuery('')
    setSearchResults([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  function applyBaseMacros(foodName: string, macros: BaseMacros, defaultMultiplier = '1') {
    setName(foodName)
    setBaseMacros(macros)
    setMultiplier(defaultMultiplier)
    updateMacrosWithMultiplier(macros, defaultMultiplier)
  }

  function updateMacrosWithMultiplier(macros: BaseMacros, mult: string) {
    const m = Math.max(0, Number(mult) || 0)
    setCalories(String(Math.max(0, Math.round(macros.calories * m))))
    setProtein(String(Math.max(0, Math.round(macros.proteinG * m * 10) / 10)))
    setCarbs(String(Math.max(0, Math.round(macros.carbsG * m * 10) / 10)))
    setFat(String(Math.max(0, Math.round(macros.fatG * m * 10) / 10)))
  }

  function onMultiplierChange(val: string) {
    setMultiplier(val)
    if (baseMacros) {
      updateMacrosWithMultiplier(baseMacros, val)
    }
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUrl(URL.createObjectURL(file))
    setPhotoName(file.name)
    setBaseMacros(null)
    setAnalyzing(true)
    try {
      const data = await fitnessService.analyzeFoodImage(file)
      if (!data.foodName || !data.per100g) {
        throw new Error('AI could not identify this food. Try a clearer photo.')
      }
      applyBaseMacros(data.foodName, data.per100g, '1')
    } catch (err) {
      setPhotoUrl(null)
      setPhotoName(null)
      toast(err instanceof Error ? err.message : 'Could not analyze the photo', 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const delayDebounceFn = setTimeout(() => {
      searchFood(searchQuery)
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  async function searchFood(query: string) {
    setIsSearching(true)
    try {
      const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`)
      const data = await res.json()
      if (data.products && data.products.length > 0) {
        const results: ApiFoodResult[] = data.products.map((p: any) => ({
          name: p.product_name || 'Unknown Food',
          macros: {
            calories: p.nutriments?.['energy-kcal_100g'] || p.nutriments?.['energy-kcal'] || 0,
            proteinG: p.nutriments?.['proteins_100g'] || 0,
            carbsG: p.nutriments?.['carbohydrates_100g'] || 0,
            fatG: p.nutriments?.['fat_100g'] || 0,
          }
        }))
        setSearchResults(results)
      } else {
        setSearchResults([])
      }
    } catch (err) {
      console.error(err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  async function save() {
    if (!name.trim() || !calories) {
      toast('Name and calories are required', 'error')
      return
    }
    setSaving(true)
    try {
      const finalQuantity = [quantityStr.trim(), weightStr.trim() ? `${weightStr.trim()}g` : ''].filter(Boolean).join(' - ')
      await fitnessService.logFood({
        foodName: name.trim(),
        mealType,
        calories: Number(calories),
        proteinG: protein ? Number(protein) : undefined,
        carbsG: carbs ? Number(carbs) : undefined,
        fatG: fat ? Number(fat) : undefined,
        quantity: finalQuantity || undefined,
        logDate: toISODate(new Date()),
        aiSuggested: !!baseMacros,
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
    applyBaseMacros(food.name, {
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
    }, '1')
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
              Snap or upload a food photo — AI identifies it and estimates macros.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="secondary" onClick={() => cameraInputRef.current?.click()} disabled={analyzing} className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
                <Camera size={14} />
                {analyzing ? 'Analyzing…' : 'Take photo'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={analyzing} className="border-white/10 text-slate-300 hover:bg-white/10">
                <Upload size={14} />
                Add photo
              </Button>
            </div>
          </div>

          {photoUrl && (
            <div className="mt-3 flex gap-3">
              <img src={photoUrl} alt={photoName ?? 'Food'} className="h-24 w-24 shrink-0 rounded-lg border border-white/10 object-cover" />
              <div className="min-w-0 flex-1">
                {analyzing ? (
                  <p className="text-sm text-slate-300">AI is identifying your food…</p>
                ) : baseMacros ? (
                  <div className="space-y-1.5">
                    <p className="truncate text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-emerald-300">
                      Base: {baseMacros.calories} kcal · P {baseMacros.proteinG}g · C {baseMacros.carbsG}g · F {baseMacros.fatG}g
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
        
        {/* API Food Search */}
        <div className="relative z-10 space-y-1.5">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search OpenFoodFacts database..."
              className="pl-10"
            />
            {isSearching && (
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            )}
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-black/90 shadow-2xl backdrop-blur-xl">
              <div className="max-h-48 overflow-y-auto">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      applyBaseMacros(res.name, res.macros, '1')
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="flex w-full flex-col items-start px-4 py-2 hover:bg-white/10"
                  >
                    <span className="truncate text-sm font-medium text-slate-200">{res.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {res.macros.calories} kcal · P {res.macros.proteinG}g · C {res.macros.carbsG}g · F {res.macros.fatG}g
                    </span>
                  </button>
                ))}
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
          <Input label="Food Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Grilled chicken salad" />
          {baseMacros ? (
             <Input label="Multiplier / Quantity" type="number" step="0.1" value={multiplier} onChange={(e) => onMultiplierChange(e.target.value)} placeholder="1" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Input label="Quantity" value={quantityStr} onChange={(e) => setQuantityStr(e.target.value)} placeholder="1 bowl" />
              <Input label="Weight (g)" type="number" value={weightStr} onChange={(e) => setWeightStr(e.target.value)} placeholder="150" />
            </div>
          )}
        </div>
        
        {baseMacros && (
          <div className="grid grid-cols-2 gap-2">
              <Input label="Quantity (Optional)" value={quantityStr} onChange={(e) => setQuantityStr(e.target.value)} placeholder="1 bowl" />
              <Input label="Weight (g) (Optional)" type="number" value={weightStr} onChange={(e) => setWeightStr(e.target.value)} placeholder="150" />
          </div>
        )}

        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <Input
            label="Total Calories"
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="320"
          />
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Input label="Protein (g)" type="number" step="0.1" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="25" />
            <Input label="Carbs (g)" type="number" step="0.1" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="40" />
            <Input label="Fat (g)" type="number" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="10" />
          </div>
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