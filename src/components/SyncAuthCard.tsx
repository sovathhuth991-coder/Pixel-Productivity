import { useState } from 'react'
import { useSyncContext } from '../context/SyncContext'
import { useToast } from '../components/ui/Toast'
import PixelEmoji from '../components/ui/PixelEmoji'
import ActionButton from './ui/ActionButton'
import { copyText } from '../utils/download'

export default function SyncAuthCard() {
  const {
    configured,
    isSignedIn,
    user,
    authReady,
    authError,
    signInGoogle,
    signOut,
    signOutAndClearDevice,
    migrateLocalToCloud,
    syncStatus,
  } = useSyncContext()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [confirmClearDevice, setConfirmClearDevice] = useState(false)
  const [uidCopied, setUidCopied] = useState(false)

  const handleGoogle = async () => {
    setLoading(true)
    try {
      await signInGoogle()
      showToast('Signed in ✅ syncing your tasks', 'success')
    } catch (e: any) {
      showToast(`Sign-in failed: ${e?.message || 'unknown error'}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUid = async () => {
    if (!user) return
    const ok = await copyText(user.uid)
    setUidCopied(ok)
    if (!ok) showToast('Could not copy the account ID.', 'error')
  }

  const handleMigrate = async () => {
    setLoading(true)
    try {
      await migrateLocalToCloud()
      showToast('Local data pushed to the cloud ☁️', 'success')
    } catch {
      showToast('Migration failed — working offline', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOutAndClear = async () => {
    setLoading(true)
    try {
      await signOutAndClearDevice()
      // The helper reloads the page, so success never returns here.
    } finally {
      setLoading(false)
    }
  }

  if (!configured) {
    return (
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-3">
        <h3 className="font-pixel text-lead text-accent flex items-center gap-2">
          <PixelEmoji name="rocket" size={18} />
          <span>CLOUD SYNC (OFFLINE MODE)</span>
        </h3>
        <p className="font-pixel text-caption text-muted">
          Firebase is not configured. Paste your Web App config into{' '}
          <code className="px-1 py-0.5 bg-app-deep text-accent">.env</code>{' '}
          (VITE_FIREBASE_API_KEY …) and redeploy to enable cross-device sync.
        </p>
        <p className="font-pixel text-caption text-muted">
          Your data is safe in localStorage and will be migrated to the cloud on
          first sign-in once configured.
        </p>
      </div>
    )
  }

  if (!authReady) {
    return (
      <div className="bg-surface border-4 border-line p-4 pixel-border">
        <h3 className="font-pixel text-lead text-accent flex items-center gap-2">
          <PixelEmoji name="rocket" size={18} />
          <span>CONNECTING TO CLOUD…</span>
        </h3>
      </div>
    )
  }

  if (authError && !user) {
    return (
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-2">
        <h3 className="font-pixel text-lead text-accent flex items-center gap-2">
          <PixelEmoji name="warning" size={18} />
          <span>CLOUD SYNC UNAVAILABLE</span>
        </h3>
        <p className="font-pixel text-caption text-muted break-words">
          {(authError?.message || 'Firebase auth is not available').slice(0, 200)}
        </p>
        <p className="font-pixel text-caption text-muted">
          Make sure Auth + Firestore are enabled in the Firebase console. The
          app keeps working with localStorage in the meantime.
        </p>
      </div>
    )
  }

  if (isSignedIn && user) {
    return (
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-3">
        <h3 className="font-pixel text-lead text-accent flex items-center gap-2">
          <PixelEmoji name="check_shield" size={18} />
          <span>CLOUD SYNC ACTIVE</span>
        </h3>
        <p className="font-pixel text-caption text-muted break-words">
          Signed in as {user.email || user.uid.slice(0, 8)} • tasks sync live
          across devices
        </p>
        <div className="border-2 border-line/60 bg-app-deep/50 p-2 space-y-1">
          <div className="font-pixel text-micro text-dim">
            ACCOUNT ID — USE THIS AS THE FIRESTORE `owners` DOCUMENT ID
          </div>
          <div className="flex items-start gap-2">
            <code className="font-mono text-micro text-ink break-all flex-1">
              {user.uid}
            </code>
            <button
              type="button"
              onClick={() => void handleCopyUid()}
              className="font-pixel text-micro px-2 py-1 border border-line text-muted hover:text-ink shrink-0"
            >
              {uidCopied ? 'COPIED' : 'COPY'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={handleMigrate}
            loading={loading}
            loadingLabel="UPLOADING…"
            className="retro-btn font-pixel text-caption px-2 py-1"
          >
            Upload local data now
          </ActionButton>
          <button
            onClick={() => {
              setConfirmClearDevice(false)
              void signOut()
            }}
            className="retro-btn font-pixel text-caption px-2 py-1"
          >
            Sign out
          </button>
          <ActionButton
            onClick={() => {
              if (!confirmClearDevice) {
                setConfirmClearDevice(true)
                return
              }
              void handleSignOutAndClear()
            }}
            loading={loading && confirmClearDevice}
            loadingLabel="CLEARING…"
            className="retro-btn font-pixel text-caption px-2 py-1 border-danger text-danger"
          >
            {confirmClearDevice ? 'SURE? CLEAR THIS DEVICE' : 'SIGN OUT & CLEAR DEVICE'}
          </ActionButton>
        </div>
        {confirmClearDevice && (
          <p className="font-pixel text-micro text-warn leading-relaxed">
            The cloud copy is kept. This browser forgets its tasks, bookmarks,
            history and the active timer. Sign in again to download them.
          </p>
        )}
        {syncStatus === 'error' && (
          <p className="font-pixel text-micro text-danger leading-relaxed">
            CLOUD WRITE FAILED. CHECK THAT THE FIRESTORE RULES ARE DEPLOYED AND
            THAT THE owners/{user.uid} DOCUMENT EXISTS. THE APP KEEPS WORKING
            LOCALLY UNTIL THEN.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-surface border-4 border-line p-4 pixel-border space-y-3">
      <h3 className="font-pixel text-lead text-accent flex items-center gap-2">
        <PixelEmoji name="rocket" size={18} />
        <span>SYNC TO MOBILE / DESKTOP</span>
      </h3>
      <p className="font-pixel text-caption text-muted">
        Sign in on every device with the same account to keep tasks in sync.
        Local data is migrated to the cloud on the first sign-in. Signing in
        with a different account clears this browser&apos;s local copy first.
      </p>

      <ActionButton
        onClick={handleGoogle}
        loading={loading}
        loadingLabel="SIGNING IN…"
        className="retro-btn retro-btn-accent w-full font-pixel text-caption px-2 py-1.5"
      >
        Continue with Google
      </ActionButton>

      <p className="font-pixel text-micro text-dim leading-relaxed pt-2 border-t-2 border-line/50">
        ONLY GOOGLE SIGN-IN IS ENABLED FOR THIS APP. EMAIL/PASSWORD IS NOT
        OFFERED — KEEP THE PROVIDER DISABLED IN THE FIREBASE CONSOLE TOO.
      </p>
    </div>
  )
}
