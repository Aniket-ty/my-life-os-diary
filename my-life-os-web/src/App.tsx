import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AppShell } from '@/components/layout/AppShell'
import { AuthPage } from '@/pages/auth/AuthPage'
import { Dashboard } from '@/pages/Dashboard'
import { DiaryList } from '@/pages/diary/DiaryList'
import { DiaryWrite } from '@/pages/diary/DiaryWrite'
import { DiaryView } from '@/pages/diary/DiaryView'
import { Fitness } from '@/pages/fitness/Fitness'
import { WorkoutPlanner } from '@/pages/fitness/WorkoutPlanner'
import { AIChat } from '@/pages/ai/AIChat'
import { TodoPage } from '@/pages/todo/TodoPage'
import { BodyScanPage } from '@/pages/bodyscan/BodyScanPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { Loading } from '@/components/ui/Loading'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

function ProtectedRoutes() {
  const { token, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (user && user.onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/diary" element={<DiaryList />} />
        <Route path="/diary/write" element={<DiaryWrite />} />
        <Route path="/diary/write/:id" element={<DiaryWrite />} />
        <Route path="/diary/:id" element={<DiaryView />} />
        <Route path="/fitness" element={<Fitness />} />
        <Route path="/fitness/planner" element={<WorkoutPlanner />} />
        <Route path="/ai" element={<AIChat />} />
        <Route path="/todo" element={<TodoPage />} />
        <Route path="/body-scan" element={<BodyScanPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

function OnboardingRoute() {
  const { token, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (user?.onboardingCompleted) {
    return <Navigate to="/" replace />
  }

  return <OnboardingPage />
}

function AuthRoute() {
  const { token, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (token) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return <AuthPage />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthRoute />} />
      <Route path="/onboarding" element={<OnboardingRoute />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}