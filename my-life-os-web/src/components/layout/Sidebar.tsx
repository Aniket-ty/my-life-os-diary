import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  BookHeart,
  Dumbbell,
  Sparkles,
  ListTodo,
  ScanLine,
  CalendarRange,
  Settings,
  LogOut,
  Command,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { initials } from '@/lib/utils'
import { cn } from '@/lib/utils'

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/diary', label: 'Diary', icon: BookHeart },
  { to: '/fitness', label: 'Fitness', icon: Dumbbell },
  { to: '/fitness/planner', label: 'Workout Plan', icon: CalendarRange },
  { to: '/ai', label: 'AI Coach', icon: Sparkles },
  { to: '/todo', label: 'To-Do', icon: ListTodo },
  { to: '/body-scan', label: 'Body Scan', icon: ScanLine },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="glass sticky top-0 z-40 hidden h-screen w-64 flex-col border-r border-white/5 bg-black/20 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-brand to-indigo-500 shadow-lg shadow-violet-brand/30">
            <Command size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-tight text-white">
              Life OS
            </h1>
            <p className="text-[11px] font-medium text-slate-400">Personal operating system</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-brand/25 to-indigo-500/20"
                      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                    />
                  )}
                  <Icon
                    size={19}
                    className={cn(
                      'relative z-10 transition-colors',
                      isActive
                        ? 'text-violet-brand'
                        : 'text-slate-500 group-hover:text-slate-300',
                    )}
                  />
                  <span className="relative z-10">{label}</span>
                  {isActive && (
                    <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-violet-brand shadow-[0_0_12px_rgba(155,89,182,0.9)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-amber-600 text-xs font-bold text-black">
              {user?.name ? initials(user.name) : 'ME'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
            </div>
            <NavLink
              to="/settings"
              title="Settings"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Settings size={17} />
            </NavLink>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="glass-strong fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items.filter((i) => i.to !== '/fitness/planner').slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-violet-brand' : 'text-slate-500',
              )
            }
          >
            <Icon size={21} />
            {label.split(' ')[0]}
          </NavLink>
        ))}
        <NavLink
          to="/body-scan"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-violet-brand' : 'text-slate-500',
            )
          }
        >
          <ScanLine size={21} />
          Scan
        </NavLink>
      </nav>
    </>
  )
}