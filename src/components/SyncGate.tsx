import type { ReactNode } from 'react'
import { useSyncContext } from '../context/SyncContext'
import PixelIcon from './ui/PixelIcon'

/**
 * Hold the app shell until Firebase has told us who (if anyone) is signed in.
 *
 * Every screen reads the synced keys straight out of `localStorage` during
 * render. On a shared browser that is the previous account's cache, so the
 * gate is what stops it from being painted for the new account before the
 * account-switch check in `SyncProvider` has cleared it.
 *
 * A local-only build (`configured === false`) renders immediately: there is
 * no account to wait for. A configured build that cannot reach Firebase is
 * released by the provider's five-second timeout, so a dead network never
 * traps the user on the splash screen.
 */
export default function SyncGate({ children }: { children: ReactNode }) {
  const { configured, authReady } = useSyncContext()

  if (configured && !authReady) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-app-bg text-ink">
        <PixelIcon name="gamepad" size={40} className="text-accent animate-pulse" />
        <p className="font-pixel text-caption text-muted">CHECKING ACCOUNT…</p>
      </div>
    )
  }

  return <>{children}</>
}
