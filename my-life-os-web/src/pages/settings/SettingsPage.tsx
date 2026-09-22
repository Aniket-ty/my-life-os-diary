import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings as SettingsIcon,
  Shield,
  UserRound,
  AlertTriangle,
  Edit3,
  X,
  Save,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (desk job, little exercise)' },
  { value: 'light', label: 'Lightly active (1–3 days/week)' },
  { value: 'moderate', label: 'Moderately active (3–5 days/week)' },
  { value: 'veryActive', label: 'Very active (6–7 days/week)' },
  { value: 'extraActive', label: 'Extra active (physical job or 2x/day)' },
]

const FITNESS_GOALS = [
  { value: 'fatLoss', label: 'Fat Loss (deficit)' },
  { value: 'maintain', label: 'Maintain (recomposition)' },
  { value: 'muscleGain', label: 'Muscle Gain (surplus)' },
  { value: 'endurance', label: 'Endurance / Performance' },
]

export function SettingsPage() {
  const { user, logout, updateProfile, deleteAccount } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '')
  const [age, setAge] = useState<string>(user?.age != null ? String(user?.age) : '')
  const [heightCm, setHeightCm] = useState<string>(user?.heightCm != null ? String(user?.heightCm) : '')
  const [activityLevel, setActivityLevel] = useState(user?.activityLevel || 'moderate')
  const [goal, setGoal] = useState(user?.fitnessGoal || 'maintain')

  // Account Deletion State
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [showDanger, setShowDanger] = useState(false)

  // Sync state when user context changes
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setPhoneNumber(user.phoneNumber || '')
      setAge(user.age != null ? String(user.age) : '')
      setHeightCm(user.heightCm != null ? String(user.heightCm) : '')
      setActivityLevel(user.activityLevel || 'moderate')
      setGoal(user.fitnessGoal || 'maintain')
    }
  }, [user])

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast('Name is required', 'error')
      return
    }
    if (!email.trim()) {
      toast('Email is required', 'error')
      return
    }

    setSavingProfile(true)
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim() || null,
        age: age ? Number(age) : null,
        heightCm: heightCm ? Number(heightCm) : null,
        activityLevel,
        goal,
      })
      toast('Profile details updated successfully', 'success')
      setIsEditing(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update profile', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

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
        icon={<SettingsIcon size={22} className="text-volt-400" />}
        accent="from-volt-500 to-indigo-500"
      />

      <div className="space-y-6">
        {/* Profile Card with View & Edit modes */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <UserRound size={18} className="text-volt-400" />
              Profile Details
            </h2>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-edge bg-surface px-3 py-1.5 text-xs font-semibold text-volt-300 hover:bg-card-hover hover:border-volt-500/40 transition shadow-sm"
              >
                <Edit3 size={13} />
                <span>Edit Details</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  // Reset form to current user values
                  if (user) {
                    setName(user.name || '')
                    setEmail(user.email || '')
                    setPhoneNumber(user.phoneNumber || '')
                    setAge(user.age != null ? String(user.age) : '')
                    setHeightCm(user.heightCm != null ? String(user.heightCm) : '')
                    setActivityLevel(user.activityLevel || 'moderate')
                    setGoal(user.fitnessGoal || 'maintain')
                  }
                  setIsEditing(false)
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X size={13} />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!isEditing ? (
              <motion.div
                key="view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Full Name</p>
                  <p className="mt-0.5 font-semibold text-white">{user?.name || '—'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Email Address</p>
                  <p className="mt-0.5 font-semibold text-white truncate">{user?.email || '—'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Mobile Number</p>
                  <p className="mt-0.5 font-semibold text-volt-300">
                    {user?.phoneNumber ? user.phoneNumber : <span className="italic text-slate-500">Not set</span>}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Age</p>
                  <p className="mt-0.5 font-semibold text-white">{user?.age ? `${user.age} yrs` : '—'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Height</p>
                  <p className="mt-0.5 font-semibold text-white">{user?.heightCm ? `${user.heightCm} cm` : '—'}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Activity Level</p>
                  <p className="mt-0.5 font-semibold text-white capitalize">
                    {user?.activityLevel?.replace(/([A-Z])/g, ' $1') || '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.04] px-4 py-3 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500">Fitness Goal</p>
                  <p className="mt-0.5 font-semibold text-white capitalize">{user?.fitnessGoal ?? '—'}</p>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="edit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSaveProfile}
                className="space-y-4 pt-1"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Full Name</label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Email Address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Mobile Number</label>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">Used for group expenses, contact alerts, and SMS sync</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Age</label>
                    <Input
                      type="number"
                      min={12}
                      max={120}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 25"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Height (cm)</label>
                    <Input
                      type="number"
                      min={80}
                      max={250}
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="e.g. 178"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Activity Level</label>
                    <select
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value)}
                      className="w-full rounded-2xl border border-edge bg-surface px-3.5 py-2.5 text-xs text-white outline-none focus:border-volt-500"
                    >
                      {ACTIVITY_LEVELS.map((lvl) => (
                        <option key={lvl.value} value={lvl.value} className="bg-slate-900 text-white">
                          {lvl.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Fitness Goal</label>
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="w-full rounded-2xl border border-edge bg-surface px-3.5 py-2.5 text-xs text-white outline-none focus:border-volt-500"
                    >
                      {FITNESS_GOALS.map((g) => (
                        <option key={g.value} value={g.value} className="bg-slate-900 text-white">
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-edge">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={savingProfile}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={savingProfile}
                    className="bg-volt-500 text-white hover:bg-volt-600 shadow-md shadow-volt-500/20"
                  >
                    <Save size={14} className="mr-1.5" />
                    Save Details
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Session Actions */}
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
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
            className="w-full sm:w-auto"
          >
            Sign out of this device
          </Button>
        </motion.section>

        {/* Danger Zone */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-rose-500/25 bg-rose-500/[0.04] p-6"
        >
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-rose-400">
            <AlertTriangle size={18} />
            Danger Zone
          </h2>
          <p className="mb-4 text-xs text-slate-400">
            Permanently deletes your account, all diary entries, body scans, workout history and attached media.
            This action cannot be undone.
          </p>

          {!showDanger ? (
            <Button variant="danger" onClick={() => setShowDanger(true)}>
              Delete my account
            </Button>
          ) : (
            <form onSubmit={handleDelete} className="space-y-4 rounded-2xl border border-rose-500/30 bg-black/40 p-4">
              <p className="text-xs text-rose-200">
                To confirm deletion, please type <span className="font-bold text-white">{user?.email}</span> and your password.
              </p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Confirm Email</label>
                <Input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={user?.email}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="danger" loading={busy}>
                  Permanently Delete Account
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowDanger(false)}>
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