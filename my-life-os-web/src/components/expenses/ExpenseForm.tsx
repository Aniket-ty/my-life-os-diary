import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { expenseService } from '../../services/expense'
import type { Expense } from '../../services/expense'
import { groupService, type Group } from '../../services/group'
import { useToast } from '../ui/Toast'

const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Fitness',
  'Education',
  'Travel',
  'Groceries',
  'Rent',
  'Other',
]

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'CAD', 'AUD', 'SGD']

interface ExpenseFormProps {
  initialGroupId?: string
  onSuccess: (expense: Expense) => void
  onCancel: () => void
}

export function ExpenseForm({ initialGroupId, onSuccess, onCancel }: ExpenseFormProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [category, setCategory] = useState('Food')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [notes, setNotes] = useState('')
  const [groupId, setGroupId] = useState(initialGroupId || '')
  const [groups, setGroups] = useState<Group[]>([])
  const [splitType, setSplitType] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES'>('EQUAL')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    groupService.getUserGroups().then(setGroups).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) {
      toast('Please enter a valid title and positive amount', 'error')
      return
    }

    try {
      setIsLoading(true)
      const data: any = {
        title: title.trim(),
        amount: numAmount,
        currency,
        category,
        expenseDate,
        paymentMethod,
        notes: notes.trim() || undefined,
        groupId: groupId || undefined,
        splitType: groupId ? splitType : undefined,
      }

      const newExpense = await expenseService.createExpense(data)
      toast('Expense saved successfully!', 'success')
      onSuccess(newExpense)
    } catch (err: any) {
      toast(err.message || 'Failed to create expense', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title / Description"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Dinner with Friends"
        required
      />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-300">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-violet-brand focus:outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-slate-900 text-white">
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-300">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-violet-brand focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-slate-900 text-white">
                {cat}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Date"
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-300">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-violet-brand focus:outline-none"
          >
            <option value="UPI" className="bg-slate-900 text-white">UPI / GPay / PhonePe</option>
            <option value="Credit Card" className="bg-slate-900 text-white">Credit Card</option>
            <option value="Debit Card" className="bg-slate-900 text-white">Debit Card</option>
            <option value="Cash" className="bg-slate-900 text-white">Cash</option>
            <option value="Net Banking" className="bg-slate-900 text-white">Net Banking</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-300">Group (Splitwise)</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-violet-brand focus:outline-none"
          >
            <option value="" className="bg-slate-900 text-white">Personal (No Group)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {groupId && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
          <label className="mb-1.5 block text-xs font-medium text-violet-300">Split Method</label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSplitType(type)}
                className={`rounded-lg py-1.5 font-medium transition-all ${
                  splitType === type
                    ? 'bg-violet-brand text-white shadow'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {splitType === 'EQUAL' && 'Split equally among all group members.'}
            {splitType === 'EXACT' && 'Individual exact amounts will be adjusted or divided.'}
            {splitType === 'PERCENTAGE' && 'Calculated according to member percentage shares.'}
            {splitType === 'SHARES' && 'Divided proportionately by assigned shares.'}
          </p>
        </div>
      )}

      <Input
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes or context"
      />

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          Save Expense
        </Button>
      </div>
    </form>
  )
}
