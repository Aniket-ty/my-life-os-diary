import React, { useState, useEffect } from 'react'
import {
  UserPlus,
  ArrowRight,
  Plus,
  Receipt,
  CheckCircle2,
  Trash2,
  LogOut,
  Download,
  Printer,
  Search,
  Mail,
  UserCheck,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { groupService, type GroupDetail } from '../../services/group'
import { settlementService } from '../../services/settlement'
import { notificationService } from '../../services/notification'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'

interface GroupDetailModalProps {
  groupId: string
  onClose: () => void
  onAddExpense: () => void
}

export function GroupDetailModal({ groupId, onClose, onAddExpense }: GroupDetailModalProps) {
  const { user } = useAuth()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'balances' | 'expenses' | 'members'>('balances')

  // Invite & search member state
  const [inviteContact, setInviteContact] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string; phoneNumber?: string | null }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isInviting, setIsInviting] = useState(false)

  // Settle up modal state
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false)
  const [settlePayer, setSettlePayer] = useState('')
  const [settlePayee, setSettlePayee] = useState('')
  const [settleAmount, setSettleAmount] = useState('')
  const [isSettling, setIsSettling] = useState(false)

  const { toast } = useToast()

  const fetchGroup = async () => {
    try {
      setIsLoading(true)
      const data = await groupService.getGroupById(groupId)
      setGroup(data)
    } catch (err: any) {
      toast(err.message || 'Failed to load group', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGroup()
  }, [groupId])

  const handleSearchContact = async (val: string) => {
    setInviteContact(val)
    if (val.trim().length < 2) {
      setSearchResults([])
      return
    }
    try {
      setIsSearching(true)
      const users = await notificationService.searchUsers(val)
      // Exclude users already in the group
      const existingIds = new Set(group?.members.map((m) => m.id) || [])
      setSearchResults(users.filter((u) => !existingIds.has(u.id)))
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddExistingUser = async (targetUser: { id: string; name: string }) => {
    try {
      setIsInviting(true)
      await groupService.addMember(groupId, { userId: targetUser.id })
      toast(`${targetUser.name} added to the group!`, 'success')
      setInviteContact('')
      setSearchResults([])
      fetchGroup()
    } catch (err: any) {
      toast(err.message || 'Failed to add member', 'error')
    } finally {
      setIsInviting(false)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteContact.trim()) return
    try {
      setIsInviting(true)
      const isPhone = /^\+?[\d\s-]{7,15}$/.test(inviteContact.trim())
      const payload = isPhone
        ? { phoneNumber: inviteContact.trim() }
        : { email: inviteContact.trim() }

      const res = await groupService.addMember(groupId, payload)
      if (res?.pending) {
        toast(res.message || 'Invitation sent to friend via email/SMS!', 'success')
      } else {
        toast('Member added successfully!', 'success')
      }
      setInviteContact('')
      setSearchResults([])
      fetchGroup()
    } catch (err: any) {
      toast(err.message || 'Failed to add/invite member', 'error')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    try {
      await groupService.removeMember(groupId, memberId)
      toast('Member removed', 'info')
      fetchGroup()
    } catch (err: any) {
      toast(err.message || 'Failed to remove member', 'error')
    }
  }

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return
    try {
      await groupService.leaveGroup(groupId)
      toast('You left the group', 'info')
      onClose()
    } catch (err: any) {
      toast(err.message || 'Failed to leave group', 'error')
    }
  }

  const handleDownloadCsv = async () => {
    try {
      const token = localStorage.getItem('lifeos_token')
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001'
      const res = await fetch(`${apiUrl}/api/v1/groups/${groupId}/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to download CSV')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `group-${group?.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'statement'}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast('Group expense statement downloaded as CSV', 'success')
    } catch (err: any) {
      toast(err.message || 'Failed to download CSV', 'error')
    }
  }

  const handlePrintStatement = () => {
    window.print()
  }

  const handleOpenSettle = (fromId?: string, toId?: string, defaultAmt?: number) => {
    setSettlePayer(fromId || user?.id || '')
    setSettlePayee(toId || '')
    setSettleAmount(defaultAmt != null ? String(defaultAmt) : '')
    setIsSettleModalOpen(true)
  }

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(settleAmount)
    if (!settlePayer || !settlePayee || isNaN(amt) || amt <= 0) {
      toast('Please enter valid settlement details', 'error')
      return
    }

    try {
      setIsSettling(true)
      await settlementService.createSettlement({
        groupId,
        fromUserId: settlePayer,
        toUserId: settlePayee,
        amount: amt,
        currency: group?.defaultCurrency || 'INR',
      })
      toast('Settlement recorded successfully!', 'success')
      setIsSettleModalOpen(false)
      fetchGroup()
    } catch (err: any) {
      toast(err.message || 'Failed to record settlement', 'error')
    } finally {
      setIsSettling(false)
    }
  }

  if (isLoading || !group) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-400">Loading group details...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
      {/* Group Header Info & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">{group.name}</h2>
          {group.description && <p className="text-xs text-slate-400 mt-0.5">{group.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
            <span>{group.members.length} members</span>
            <span>•</span>
            <span>Total Spent: {group.defaultCurrency} {group.totalSpent?.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export and Print Buttons */}
          <Button onClick={handleDownloadCsv} variant="secondary" className="text-xs py-1.5 px-3">
            <Download size={14} className="mr-1.5" /> CSV
          </Button>
          <Button onClick={handlePrintStatement} variant="secondary" className="text-xs py-1.5 px-3">
            <Printer size={14} className="mr-1.5" /> Print
          </Button>
          <Button onClick={() => handleOpenSettle()} variant="secondary" className="text-xs py-1.5 px-3">
            <CheckCircle2 size={14} className="mr-1.5" /> Settle Up
          </Button>
          <Button onClick={onAddExpense} className="text-xs py-1.5 px-3">
            <Plus size={14} className="mr-1.5" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-6 text-sm">
        {(['balances', 'expenses', 'members'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-semibold capitalize transition-all ${
              activeTab === tab
                ? 'border-b-2 border-violet-brand text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB: Balances & Simplified Settlements */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {/* Suggested minimal settlements */}
          {group.suggestedSettlements.length > 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Suggested Settlements (Optimized)
              </h4>
              <div className="space-y-2">
                {group.suggestedSettlements.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{s.fromName}</span>
                      <ArrowRight size={14} className="text-slate-500" />
                      <span className="font-semibold text-white">{s.toName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-400">
                        {group.defaultCurrency} {s.amount.toFixed(2)}
                      </span>
                      <Button
                        variant="secondary"
                        className="py-1 px-2.5 text-[11px] h-auto"
                        onClick={() => handleOpenSettle(s.fromUserId, s.toUserId, s.amount)}
                      >
                        Settle
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400 opacity-80" />
              <p className="text-sm font-semibold text-white">All balances are settled up!</p>
              <p className="text-xs text-slate-400 mt-1">No pending debts inside this group.</p>
            </div>
          )}

          {/* Member Balance Ledger */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
              Member Balances Ledger
            </h4>
            <div className="space-y-2">
              {group.balances.map((b) => (
                <div key={b.userId} className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-white">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {b.name} {b.userId === user?.id && '(You)'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Paid {group.defaultCurrency} {b.paid.toFixed(2)} • Share {group.defaultCurrency} {b.owed.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      b.net > 0 ? 'text-emerald-400' : b.net < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {b.net > 0 ? `+${group.defaultCurrency} ${b.net.toFixed(2)}` : b.net < 0 ? `-${group.defaultCurrency} ${Math.abs(b.net).toFixed(2)}` : 'Settled'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {b.net > 0 ? 'gets back' : b.net < 0 ? 'owes' : 'settled up'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Group Expenses & Settlement History */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Shared Expenses ({group.expenses.length})
            </h4>
            <span className="text-xs text-slate-400">
              Total: {group.defaultCurrency} {group.totalSpent.toFixed(2)}
            </span>
          </div>

          {group.expenses.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] py-12 text-center">
              <Receipt size={32} className="mx-auto mb-2 text-slate-500 opacity-60" />
              <p className="text-sm font-medium text-white">No expenses in this group yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Add your shared trip, flat or dinner expenses.</p>
              <Button onClick={onAddExpense}>
                <Plus size={14} className="mr-1.5" /> Add First Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {group.expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-brand">
                      <Receipt size={17} />
                    </div>
                    <div>
                      <h5 className="font-semibold text-white">{exp.title}</h5>
                      <p className="text-xs text-slate-400">
                        Paid by {exp.paidBy?.name || 'Unknown'} • {new Date(exp.expenseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white">
                      {exp.currency} {exp.amount.toFixed(2)}
                    </span>
                    {exp.splits && (
                      <p className="text-[11px] text-slate-400">
                        {exp.splits.length} people split
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settlement History */}
          {group.settlements.length > 0 && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                Settlement History
              </h4>
              <div className="space-y-2">
                {group.settlements.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl bg-white/[0.01] p-2.5 text-xs text-slate-300">
                    <div>
                      <span className="font-semibold text-white">{s.fromUser?.name || 'Payer'}</span> paid{' '}
                      <span className="font-semibold text-white">{s.toUser?.name || 'Payee'}</span>
                      {s.note && <span className="text-slate-400 italic"> ({s.note})</span>}
                    </div>
                    <div className="font-bold text-emerald-400">
                      {s.currency} {s.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Members, Phone Search & Invitations */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="relative">
            <form onSubmit={handleInviteSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={inviteContact}
                  onChange={(e) => handleSearchContact(e.target.value)}
                  placeholder="Search by phone number, email, or name..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-20 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-brand focus:outline-none"
                />
                {isSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-violet-400 font-medium animate-pulse">
                    Searching...
                  </span>
                )}
              </div>
              <Button type="submit" loading={isInviting}>
                <UserPlus size={16} className="mr-1.5" /> Invite
              </Button>
            </form>

            {/* Realtime Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-12 left-0 right-0 z-30 rounded-xl border border-white/15 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl">
                <p className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Registered Users on Life OS
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {searchResults.map((su) => (
                    <div
                      key={su.id}
                      onClick={() => handleAddExistingUser(su)}
                      className="flex items-center justify-between rounded-lg p-2 hover:bg-white/10 cursor-pointer transition"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                          {su.name}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-3">
                          <span>{su.email}</span>
                          {su.phoneNumber && <span>• 📞 {su.phoneNumber}</span>}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-violet-400 flex items-center gap-1">
                        <UserCheck size={14} /> Add
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 text-sm">
                <div>
                  <p className="font-semibold text-white">
                    {m.name} {m.id === user?.id && '(You)'}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <Mail size={12} /> {m.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                    {m.role}
                  </span>
                  {m.id !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remove Member"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={handleLeaveGroup}
              className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300"
            >
              <LogOut size={14} /> Leave Group
            </button>
          </div>
        </div>
      )}

      {/* Settle Up Dialog */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Record Settlement</h3>
            <form onSubmit={handleRecordSettlement} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Payer (Who paid)</label>
                <select
                  value={settlePayer}
                  onChange={(e) => setSettlePayer(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Payee (Who received)</label>
                <select
                  value={settlePayee}
                  onChange={(e) => setSettlePayee(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  <option value="">Select recipient...</option>
                  {group.members
                    .filter((m) => m.id !== settlePayer)
                    .map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Amount ({group.defaultCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setIsSettleModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSettling}>
                  Record Settlement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
