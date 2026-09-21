import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  Plus,
  Receipt,
  Users,
  BarChart3,
  Search,
  ArrowDownRight,
  Camera,
  Trash2,
  Download,
  Printer,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { GlassCard as Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Loading } from '../../components/ui/Loading'
import { ExpenseForm } from '../../components/expenses/ExpenseForm'
import { BillScannerModal } from '../../components/expenses/BillScannerModal'
import { GroupDetailModal } from '../../components/expenses/GroupDetailModal'
import { ExpenseReports } from '../../components/expenses/ExpenseReports'
import { expenseService, type Expense, type ExpenseSummary } from '../../services/expense'
import { groupService, type Group } from '../../services/group'
import { receiptService, type Receipt as ReceiptType } from '../../services/receipt'
import { useToast } from '../../components/ui/Toast'

export function ExpenseDashboard() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'groups' | 'scanner' | 'reports'>('expenses')

  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [receipts, setReceipts] = useState<ReceiptType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtering states for expenses
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all')

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false)
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const { toast } = useToast()

  const loadAllData = async () => {
    try {
      setIsLoading(true)
      const [sumData, expData, groupData, receiptData] = await Promise.all([
        expenseService.getSummary().catch(() => null),
        expenseService.getExpenses({ limit: 50 }).catch(() => ({ expenses: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 } })),
        groupService.getUserGroups().catch(() => []),
        receiptService.getReceipts().catch(() => []),
      ])

      setSummary(sumData)
      setExpenses(expData.expenses)
      setGroups(groupData)
      setReceipts(receiptData)
    } catch (err: any) {
      toast(err.message || 'Failed to load expense dashboard', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const handleExpenseAdded = () => {
    setIsAddModalOpen(false)
    loadAllData()
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    try {
      await expenseService.deleteExpense(id)
      setExpenses((prev) => prev.filter((e) => e.id !== id))
      toast('Expense deleted', 'info')
    } catch (err: any) {
      toast(err.message || 'Failed to delete expense', 'error')
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    try {
      const g = await groupService.createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
      })
      toast(`Group "${g.name}" created!`, 'success')
      setIsCreateGroupModalOpen(false)
      setNewGroupName('')
      setNewGroupDesc('')
      loadAllData()
    } catch (err: any) {
      toast(err.message || 'Failed to create group', 'error')
    }
  }

  const handleExportExpensesCsv = async () => {
    try {
      const token = localStorage.getItem('lifeos_token')
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001'
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)
      const res = await fetch(`${apiUrl}/api/v1/expenses/export/csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to export CSV')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast('Personal expenses exported to CSV', 'success')
    } catch (err: any) {
      toast(err.message || 'Failed to export CSV', 'error')
    }
  }

  const handlePrintExpenses = () => {
    window.print()
  }

  // Filtered expenses
  const filteredExpenses = expenses.filter((exp) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = exp.title.toLowerCase().includes(q)
      const matchCat = exp.category.toLowerCase().includes(q)
      const matchNotes = exp.notes?.toLowerCase().includes(q)
      if (!matchTitle && !matchCat && !matchNotes) return false
    }

    if (categoryFilter && exp.category !== categoryFilter) {
      return false
    }

    const expDateStr = exp.expenseDate.slice(0, 10)
    const todayStr = new Date().toISOString().slice(0, 10)
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    if (dateFilter === 'today' && expDateStr !== todayStr) return false
    if (dateFilter === 'yesterday' && expDateStr !== yesterdayStr) return false
    if (dateFilter === 'week') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      if (expDateStr < sevenDaysAgo) return false
    }

    return true
  })

  // Grouping by Date
  const groupedExpenses: Record<string, Expense[]> = {}
  filteredExpenses.forEach((exp) => {
    const d = exp.expenseDate.slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    let label = d
    if (d === today) label = 'Today'
    else if (d === yesterday) label = 'Yesterday'
    else {
      label = new Date(exp.expenseDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }

    if (!groupedExpenses[label]) groupedExpenses[label] = []
    groupedExpenses[label].push(exp)
  })

  return (
    <div className="min-h-screen pb-24 lg:pb-12">
      <PageHeader
        title="Expenses"
        subtitle="Spending, group splits, and bill scanner"
        icon={<Wallet />}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsScanModalOpen(true)}>
              <Camera size={16} className="mr-1.5" />
              Scan Bill
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} className="mr-1.5" />
              Add Expense
            </Button>
          </div>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Top Metric Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-brand">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Today's Spending
              </p>
              <h3 className="text-2xl font-bold text-white">
                {summary?.currency || 'INR'} {summary?.today.total.toFixed(2) || '0.00'}
              </h3>
            </div>
          </Card>

          <Card className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                This Month's Total
              </p>
              <h3 className="text-2xl font-bold text-white">
                {summary?.currency || 'INR'} {summary?.thisMonth.total.toFixed(2) || '0.00'}
              </h3>
            </div>
          </Card>

          <Card className="flex items-center gap-4 p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Groups
              </p>
              <h3 className="text-2xl font-bold text-white">{groups.length}</h3>
            </div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex border-b border-white/10 gap-8 text-sm font-semibold">
          {[
            { id: 'expenses', label: 'Personal & All Expenses', icon: Wallet },
            { id: 'groups', label: 'Group Splits', icon: Users },
            { id: 'scanner', label: 'Scanned Bills', icon: Receipt },
            { id: 'reports', label: 'Analytics & Reports', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3 transition-all ${
                activeTab === tab.id
                  ? 'border-b-2 border-violet-brand text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <tab.icon size={17} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: ALL EXPENSES */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search expenses by title, category, or note..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-violet-brand focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-violet-brand focus:outline-none"
                >
                  <option value="" className="bg-slate-900 text-white">All Categories</option>
                  {[
                    'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment',
                    'Health', 'Fitness', 'Education', 'Travel', 'Groceries', 'Rent', 'Other'
                  ].map((c) => (
                    <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                  ))}
                </select>

                <div className="flex rounded-xl bg-white/5 p-1 text-xs">
                  {(['all', 'today', 'yesterday', 'week'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setDateFilter(period)}
                      className={`rounded-lg px-2.5 py-1 font-medium capitalize transition ${
                        dateFilter === period
                          ? 'bg-violet-brand text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportExpensesCsv}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                  title="Export to CSV"
                >
                  <Download size={14} /> CSV
                </button>
                <button
                  type="button"
                  onClick={handlePrintExpenses}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                  title="Print Statement / PDF"
                >
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>

            {/* Expenses List Grouped by Date */}
            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loading />
              </div>
            ) : Object.keys(groupedExpenses).length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                  <Receipt size={32} className="text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">No expenses found</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-sm">
                  Add your daily expenses or scan a bill to track your budget.
                </p>
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus size={16} className="mr-1.5" /> Add First Expense
                </Button>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.keys(groupedExpenses).map((dateKey) => (
                  <div key={dateKey} className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                      {dateKey}
                    </h4>
                    <div className="space-y-2">
                      {groupedExpenses[dateKey].map((exp, i) => (
                        <motion.div
                          key={exp.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <Card className="flex items-center justify-between p-4 transition hover:bg-white/[0.04]">
                            <div className="flex items-center gap-3.5">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                                <ArrowDownRight size={19} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm text-white">{exp.title}</h4>
                                <p className="text-xs text-slate-400">
                                  {exp.category}
                                  {exp.group && ` • Group: ${exp.group.name}`}
                                  {exp.source && exp.source !== 'MANUAL' && (
                                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                                      {exp.source}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-sm text-rose-400">
                                  -{exp.currency} {Number(exp.amount).toFixed(2)}
                                </p>
                                {exp.splits && exp.splits.length > 1 && (
                                  <p className="text-[11px] text-slate-500">
                                    Split with {exp.splits.length} people
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="text-slate-500 hover:text-rose-400 p-1.5 transition"
                                title="Delete Expense"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GROUP SPLITS */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Your Groups</h3>
                <p className="text-xs text-slate-400">Manage shared trips, house expenses, and debts</p>
              </div>
              <Button onClick={() => setIsCreateGroupModalOpen(true)}>
                <Plus size={16} className="mr-1.5" /> Create Group
              </Button>
            </div>

            {groups.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                  <Users size={32} className="text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">No groups yet</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-sm">
                  Create a group for trips, roommates, or shared dinner outings.
                </p>
                <Button onClick={() => setIsCreateGroupModalOpen(true)}>
                  <Plus size={16} className="mr-1.5" /> Create First Group
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => {
                  const net = group.userNetBalance || 0
                  return (
                    <Card
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      className="cursor-pointer p-5 transition-all hover:bg-white/[0.05] hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-base text-white">{group.name}</h4>
                          {group.description && (
                            <p className="text-xs text-slate-400 line-clamp-1">{group.description}</p>
                          )}
                        </div>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                          {group.memberCount} members
                        </span>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Your balance:</span>
                        <span
                          className={`font-bold ${
                            net > 0.01
                              ? 'text-emerald-400'
                              : net < -0.01
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {net > 0.01
                            ? `+${group.defaultCurrency} ${net.toFixed(2)}`
                            : net < -0.01
                            ? `-${group.defaultCurrency} ${Math.abs(net).toFixed(2)}`
                            : 'Settled up'}
                        </span>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SCANNED BILLS / RECEIPTS */}
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Scanned Receipts</h3>
                <p className="text-xs text-slate-400">Auto-extracted bills with item-level splitting</p>
              </div>
              <Button onClick={() => setIsScanModalOpen(true)}>
                <Camera size={16} className="mr-1.5" /> Scan New Bill
              </Button>
            </div>

            {receipts.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                  <Receipt size={32} className="text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">No receipts scanned yet</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-sm">
                  Snap or upload a photo of your receipt to automatically extract items and totals.
                </p>
                <Button onClick={() => setIsScanModalOpen(true)}>
                  <Camera size={16} className="mr-1.5" /> Scan First Bill
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {receipts.map((r) => (
                  <Card key={r.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl}
                          alt="Receipt thumbnail"
                          className="h-12 w-12 rounded-xl object-cover border border-white/10"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                          <Receipt size={24} />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm text-white">
                          {r.merchant || 'Store Receipt'}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {r.receiptDate ? new Date(r.receiptDate).toLocaleDateString() : 'Recent'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                      <span className="text-slate-400">
                        {r.items?.length || 0} items extracted
                      </span>
                      <span className="font-bold text-white">
                        {r.currency} {Number(r.total || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="capitalize">Status: {r.processingStatus}</span>
                      {r.expenseId ? (
                        <span className="text-emerald-400 font-medium">Added to Expenses</span>
                      ) : (
                        <span className="text-amber-400 font-medium">Draft</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REPORTS & ANALYTICS */}
        {activeTab === 'reports' && (
          <ExpenseReports summary={summary} />
        )}
      </main>

      {/* Modals */}
      <Modal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Expense">
        <ExpenseForm onSuccess={handleExpenseAdded} onCancel={() => setIsAddModalOpen(false)} />
      </Modal>

      <Modal open={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} title="Scan Bill / Receipt">
        <BillScannerModal
          onSuccess={() => {
            setIsScanModalOpen(false)
            loadAllData()
          }}
          onCancel={() => setIsScanModalOpen(false)}
        />
      </Modal>

      {/* Group Detail Modal */}
      {selectedGroupId && (
        <Modal
          open={!!selectedGroupId}
          onClose={() => setSelectedGroupId(null)}
          title="Group Details"
        >
          <GroupDetailModal
            groupId={selectedGroupId}
            onClose={() => setSelectedGroupId(null)}
            onAddExpense={() => {
              setSelectedGroupId(null)
              setIsAddModalOpen(true)
            }}
          />
        </Modal>
      )}

      {/* Create Group Modal */}
      <Modal
        open={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        title="Create New Group"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group Name (e.g. Goa Trip, Flat 402)"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            required
          />
          <input
            type="text"
            value={newGroupDesc}
            onChange={(e) => setNewGroupDesc(e.target.value)}
            placeholder="Optional description"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsCreateGroupModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Group</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
