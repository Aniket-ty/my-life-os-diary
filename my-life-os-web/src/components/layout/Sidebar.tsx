import { NavLink, useNavigate } from 'react-router-dom'
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
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { initials, cn } from '@/lib/utils'

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/diary', label: 'Diary', icon: BookHeart },
  { to: '/fitness', label: 'Fitness', icon: Dumbbell },
  { to: '/fitness/planner', label: 'Workout Plan', icon: CalendarRange },
  { to: '/ai', label: 'Coach', icon: Sparkles },
  { to: '/todo', label: 'To-Do', icon: ListTodo },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/body-scan', label: 'Body Scan', icon: ScanLine },
]

function NavLinkInner({
  to,
  label,
  icon: Icon,
  exact,
  onNavigate,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  exact?: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={!!exact}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
          isActive ? 'bg-card text-volt-300' : 'text-slate-400 hover:bg-card-hover hover:text-slate-100',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={19} className={cn(isActive ? 'text-volt-400' : 'text-slate-500')} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

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
      <aside className="sticky top-0 z-40 hidden h-screen w-64 flex-col border-r border-edge bg-abyss lg:flex">
        <div className="flex items-center gap-3 px-6 py-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt-500">
            <Command size={20} className="text-void" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-tight tracking-tight text-white">
              Life OS
            </h1>
            <p className="text-[11px] font-medium text-slate-500">Your daily system</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {items.map((item) => (
            <NavLinkInner key={item.to} {...item} />
          ))}
        </nav>

        <div className="border-t border-edge p-3">
          <NavLink
            to="/settings"
            className="mb-1 flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-card-hover hover:text-slate-100"
          >
            <Settings size={19} className="text-slate-500" />
            Settings
          </NavLink>
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-surface p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-volt-500 text-xs font-bold text-void">
              {user?.name ? initials(user.name) : 'ME'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-edge bg-abyss/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {[
          { to: '/', label: 'Home', icon: LayoutDashboard, exact: true },
          { to: '/diary', label: 'Diary', icon: BookHeart },
          { to: '/fitness', label: 'Fitness', icon: Dumbbell },
          { to: '/ai', label: 'Coach', icon: Sparkles },
          { to: '/todo', label: 'To-Do', icon: ListTodo },
          { to: '/expenses', label: 'Expenses', icon: Wallet },
          { to: '/body-scan', label: 'Scan', icon: ScanLine },
          { to: '/settings', label: 'Settings', icon: Settings },
        ].map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={!!exact}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-volt-400' : 'text-slate-500',
              )
            }
          >
            <Icon size={19} />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}