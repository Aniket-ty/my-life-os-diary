import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon, Shield, UserRound, AlertTriangle, Loader2, Check,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

export function SettingsPage() {
  const { user, logout, deleteAccount } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [showDanger, setShowDanger] = useState(false)

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault()
    if (confirmEmail !== user?.email) {
      toast('Email does not match your account', 'error')
      return
    }
    if (!password) {
      toast('Enter your password to confirm', 'error')
      return
    }
    setBusy(true)
    try {
      await deleteAccount(password)
      toast('Account permanently deleted. Goodbye. 👋')
      navigate('/login', { replace: true })
    } catch (err) {
      toast(err instanceof Error ? err.message.split(':').pop() ?? 'Could not delete account' : 'Could not delete account', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle="Your profile, security and account"
        icon={<SettingsIcon size={22} className="text-violet-brand" />}
        accent="from-violet-brand to-indigo-500"
      />

      <div className="space-y-6">
        {/* Profile card */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-white">
            <UserRound size={18} className="text-violet-brand" />
            Profile
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Name</p>
              <p className="mt-0.5 font-semibold text-white">{user?.name}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Email</p>
              <p className="mt-0.5 font-semibold text-white">{user?.email}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Age</p>
              <p className="mt-0.5 font-semibold text-white">{user?.age ?? '—'}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Height</p>
              <p className="mt-0.5 font-semibold text-white">{user?.heightCm ? `${user.heightCm} cm` : '—'}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Activity level</p>
              <p className="mt-0.5 font-semibold text-white capitalize">{user?.activityLevel?.replace(/([A-Z])/g, ' $1') || '—'}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Fitness goal</p>
              <p className="mt-0.5 font-semibold capitalize text-white">{user?.fitnessGoal ?? '—'}</p>
            </div>
          </div>
        </motion.section>

        {/* Actions */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-strong rounded-3xl p-6"
        >
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-white">
            <Shield size={18} className="text-emerald-400" />
            Session
          </h2>
          <Button
            variant="outline"
            onClick={async () => { await logout(); navigate('/login') }}
            className="w-full sm:w-auto"
          >
            Sign out of this device
          </Button>
        </motion.section>

        {/* Danger zone */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-rose-500/25 bg-rose-500/[0.04] p-6"
        >
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-rose-300">
            <AlertTriangle size={18} />
            Danger zone
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Permanently deletes your account, all diary entries, body scans, workout history and attached media. This cannot be undone.
          </p>

          {!showDanger ? (
            <Button variant="danger" onClick={() => setShowDanger(true)}>
              Delete my account
            </Button>
          ) : (
            <form onSubmit={handleDelete} className="space-y-4">
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-4">
                <p className="mb-3 text-xs font-medium text-rose-200">
                  Type <span className="font-bold">{user?.email}</span> to confirm, then enter your password.
                </p>
                <div className={cn('space-y-3')}>
                  <Input
                    label="Confirm email"
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder={user?.email}
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" variant="danger" loading={busy}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Permanently delete account
                </Button>
                <Button variant="ghost" onClick={() => setShowDanger(false)} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </motion.section>
      </div>
    </div>
  )
}