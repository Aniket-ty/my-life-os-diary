import { useState } from 'react'
import { Sparkles } from 'lucide-react'
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
  const { toast } = useToast()

  function reset() {
    setName('')
    setQuantity('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
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