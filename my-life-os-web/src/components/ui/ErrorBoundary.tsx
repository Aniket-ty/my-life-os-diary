import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[Life OS] Render error:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="glass-strong w-full max-w-md rounded-3xl p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15">
              <AlertTriangle size={22} className="text-rose-400" />
            </div>
            <h2 className="font-display text-lg font-semibold text-white">Something broke</h2>
            <p className="mt-1 break-all font-mono text-xs text-rose-300">
              {this.state.error.message}
            </p>
            <button
              onClick={() => {
                this.setState({ error: null })
                window.location.reload()
              }}
              className="mt-4 rounded-xl bg-gradient-to-r from-violet-brand to-indigo-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}