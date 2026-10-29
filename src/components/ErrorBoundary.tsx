import { Component, type ErrorInfo, type ReactNode } from 'react'
import { backupFilename, downloadBackup } from '../utils/backup'

interface Props {
  children: ReactNode
  /** Shown in the fallback so it is obvious which screen failed. */
  label?: string
}

interface State {
  error: Error | null
  confirmReset: boolean
  exported: boolean
}

/**
 * The last resort when a render throws.
 *
 * Without this, one bad lazy chunk or one malformed task object blanks the
 * whole app — including the Settings screen that would let you export a
 * backup. The fallback keeps three exits open: reload, export, and (after a
 * second, deliberate click) clear the local cache.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, confirmReset: false, exported: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the detail in the console; the fallback shows a short message.
    console.error('[pixel-productivity] render error', error, info.componentStack)
  }

  private handleExport = (): void => {
    try {
      downloadBackup()
      this.setState({ exported: true })
    } catch {
      /* storage unreadable — nothing to export */
    }
  }

  private handleReset = (): void => {
    if (!this.state.confirmReset) {
      this.setState({ confirmReset: true })
      return
    }
    try {
      localStorage.clear()
    } catch {
      /* ignore */
    }
    const reload = () => window.location.reload()
    if (typeof caches !== 'undefined') {
      caches
        .keys()
        .then(keys => Promise.all(keys.map(key => caches.delete(key))))
        .finally(reload)
    } else {
      reload()
    }
  }

  render(): ReactNode {
    const { error, confirmReset, exported } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-app-bg text-ink">
        <div className="max-w-lg w-full bg-surface border-4 border-line p-5 pixel-border space-y-4">
          <h1 className="font-pixel text-body text-danger flex items-center gap-2">
            <span aria-hidden="true">⚠</span>
            <span>THIS SCREEN CRASHED</span>
          </h1>
          <p className="font-pixel text-caption text-muted leading-relaxed">
            {this.props.label ? `${this.props.label}: ` : ''}
            {error.message || 'Unknown render error.'}
          </p>
          <p className="font-pixel text-label text-muted leading-relaxed">
            Your data is still in this browser. Export a backup before clearing
            anything.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="retro-btn-accent font-pixel text-caption px-3 py-2"
            >
              RELOAD
            </button>
            <button
              type="button"
              onClick={this.handleExport}
              className="retro-btn font-pixel text-caption px-3 py-2"
            >
              {exported ? 'BACKUP DOWNLOADED' : 'DOWNLOAD BACKUP'}
            </button>
            <button
              type="button"
              onClick={this.handleReset}
              className="font-pixel text-caption px-3 py-2 border-2 border-danger text-danger"
            >
              {confirmReset ? 'SURE? CLEAR LOCAL CACHE' : 'CLEAR LOCAL CACHE'}
            </button>
          </div>
          {exported && (
            <p className="font-pixel text-label text-accent-2">
              Saved as {backupFilename()}. Keep it somewhere safe.
            </p>
          )}
          {confirmReset && (
            <p className="font-pixel text-label text-warn leading-relaxed">
              This removes the local cache and reloads. Cloud data is not
              deleted, so signing in again restores it.
            </p>
          )}
        </div>
      </div>
    )
  }
}
