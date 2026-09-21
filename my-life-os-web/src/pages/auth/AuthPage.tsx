import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, Command } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function AuthPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-void p-4">
      <div aria-hidden className="bg-aurora" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-volt-500">
            <Command size={30} className="text-void" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">
            Life <span className="text-volt-400">OS</span>
          </h1>
          <p className="mt-2 max-w-xs text-sm text-slate-400">
            Diary, fitness, plans, money — organised in one clean space.
          </p>
        </div>

        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          <AuthForm />
        </div>
      </motion.div>
    </div>
  )
}

function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const { login, register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
        toast('Welcome back to your Life OS')
      } else {
        await register(name.trim(), email.trim(), password)
        toast('Welcome! Your Life OS is ready')
      }
      navigate('/')
    } catch (err) {
      toast(err instanceof Error ? err.message.split(':').pop() ?? 'Something went wrong' : 'Something went wrong', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-surface p-1">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-sm font-semibold transition-all ${
              mode === m ? 'bg-volt-500 text-void' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {m === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <Input
              label="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              icon={<User size={16} />}
              required
            />
          </motion.div>
        )}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          icon={<Mail size={16} />}
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
          icon={<Lock size={16} />}
          minLength={mode === 'register' ? 8 : undefined}
          required
        />
        <Button type="submit" loading={busy} className="w-full" size="lg">
          {mode === 'login' ? 'Sign in' : 'Create account'}
          <ArrowRight size={18} />
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-slate-500">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="font-semibold text-volt-400 hover:text-volt-300"
        >
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}