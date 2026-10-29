import type { Firestore } from 'firebase/firestore'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import {
  loadFirebase,
  isFirebaseConfigured,
  subscribeAuth,
  signInWithGoogle,
  signInWithEmail,
  createAccount,
  signOutUser,
} from '../services/firebase'
import { firestoreApi } from '../services/cloud'
import { SYNC_KEYS } from '../services/syncKeys'
import { registerCloudWriter } from '../utils/cloudBridge'
import {
  BUFFER_CLOUD_KEY,
  POMO_HISTORY_KEY,
  SETTINGS_KEY,
  mergeBuffers,
  prunePomodoroHistoryMap,
  readBuffer,
  readPomodoroHistory,
  type ReportBuffer,
} from '../utils/weekly-report'
import type { Auth } from 'firebase/auth'

export { SYNC_KEYS }

/**
 * Where the user's data currently lives, from the UI's point of view.
 * - `local`   : not signed in — everything is in this browser only
 * - `syncing` : a cloud write is in flight
 * - `synced`  : signed in and the last write reached Firestore
 * - `error`   : signed in but the last cloud write failed
 */
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error'

/**
 * The account that owns the local cache in this browser.
 *
 * The synced keys are device-global (`taskmanager_tasks`, `pixel_bookmarks`,
 * …), so without this marker one account's cache would look like a brand-new
 * user's "local data" to the next account that signs in — and would be
 * uploaded into that account. On a shared device that is a data leak, not a
 * merge.
 */
export const LAST_UID_KEY = 'pixel_last_uid'

/**
 * Remove the synced keys from this browser only.
 *
 * Deliberately does **not** touch Firestore: switching accounts must clear
 * what the next user can see, not delete the previous user's cloud data.
 * Device-local preferences (theme, timer durations, vault handle) are left
 * alone as well.
 */
export function clearLocalSyncCache(): void {
  try {
    for (const key of SYNC_KEYS) localStorage.removeItem(key)
    // Legacy per-day report buffers (pre-`pixel_report_buffer`).
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('pixel_report_') && key !== 'pixel_report_buffer') {
        localStorage.removeItem(key)
      }
    }
    localStorage.removeItem('pixel_pomodoro_session')
    localStorage.removeItem(LAST_UID_KEY)
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

export interface SyncContextValue {
  user: User | null
  db: Firestore | null
  authReady: boolean
  authError: Error | null
  configured: boolean
  isSignedIn: boolean
  syncStatus: SyncStatus
  signInGoogle: () => Promise<void>
  signInEmail: (email: string, password: string) => Promise<void>
  createAccount: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Sign out **and** forget this browser's synced cache. Cloud data stays. */
  signOutAndClearDevice: () => Promise<void>
  setStoredValue: (key: string, value: unknown, onError?: () => void) => string
  removeStoredValue: (key: string) => Promise<void>
  migrateLocalToCloud: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function useSyncContext(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSyncContext must be used within a SyncProvider')
  return ctx
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured()
  const [auth, setAuth] = useState<Auth | null>(null)
  const [db, setDb] = useState<Firestore | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState<boolean>(!configured)
  const [authError, setAuthError] = useState<Error | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local')

  // Load Auth + Firestore after the shell has painted, and only when a real
  // config exists. `loadFirebase()` is a dynamic import, so the local-only
  // build never downloads the SDK at all.
  useEffect(() => {
    if (!configured) return
    let cancelled = false
    void loadFirebase()
      .then(({ auth: loadedAuth, db: loadedDb }) => {
        if (cancelled) return
        setAuth(loadedAuth)
        setDb(loadedDb)
      })
      .catch((error) => {
        if (cancelled) return
        setAuthError(error instanceof Error ? error : new Error('Firebase init failed'))
        setAuthReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [configured])

  useEffect(() => {
    if (!configured || !auth) return
    setAuthReady(false)
    setAuthError(null)
    let cancelled = false
    let unsub: (() => void) | null = null

    void subscribeAuth(auth, (u) => {
      // A different account must never inherit this browser's cache. The
      // check runs before `setUser`, and the reload means the storage hooks
      // mount again against an empty cache instead of rendering the previous
      // account's tasks for a frame.
      let previousUid: string | null = null
      try {
        previousUid = localStorage.getItem(LAST_UID_KEY)
      } catch {
        /* storage unavailable */
      }
      if (u && previousUid && previousUid !== u.uid) {
        clearLocalSyncCache()
        try {
          localStorage.setItem(LAST_UID_KEY, u.uid)
        } catch {
          /* storage unavailable */
        }
        window.location.reload()
        return
      }
      if (u) {
        try {
          localStorage.setItem(LAST_UID_KEY, u.uid)
        } catch {
          /* storage unavailable */
        }
      }
      setUser(u)
      setAuthReady(true)
      setSyncStatus(u ? 'synced' : 'local')
    })
      .then((fn) => {
        if (cancelled) fn()
        else unsub = fn
      })
      .catch((error) => {
        if (cancelled) return
        setAuthError(error instanceof Error ? error : new Error('Auth unavailable'))
        setAuthReady(true)
      })

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [configured, auth])

  // Never hold the whole app behind a Firebase handshake that cannot finish
  // (offline, blocked network, bad config). After a short grace period the
  // local-first app is allowed to render; the Sync card still reports the
  // error and retries on the next sign-in.
  useEffect(() => {
    if (!configured || authReady) return
    const t = setTimeout(() => {
      setAuthError(prev => prev ?? new Error('Cloud auth timed out — working locally'))
      setAuthReady(true)
    }, 5000)
    return () => clearTimeout(t)
  }, [configured, authReady])

  const signInGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase not configured')
    const u = await signInWithGoogle(auth)
    setUser(u)
  }, [auth])

  const signInEmailFn = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not configured')
    const u = await signInWithEmail(auth, email, password)
    setUser(u)
  }, [auth])

  const createAccountFn = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase not configured')
    const u = await createAccount(auth, email, password)
    setUser(u)
  }, [auth])

  const signOutCb = useCallback(async () => {
    if (!auth) return
    await signOutUser(auth)
    setUser(null)
    setSyncStatus('local')
  }, [auth])

  // Sign out and wipe this browser's copy of the synced data. The cloud copy
  // is untouched, so signing back in restores it. The reload guarantees every
  // `useSyncedStorage` hook remounts against empty storage instead of keeping
  // the old values in React state.
  const signOutAndClearDevice = useCallback(async () => {
    try {
      await signOutCb()
    } catch {
      /* even if the network sign-out fails, still forget the local cache */
    }
    clearLocalSyncCache()
    window.location.reload()
  }, [signOutCb])

  // Write a single KV pair to both localStorage (always, for offline + existing
  // readers) and Firestore (when signed in). Returns a nonce used to suppress
  // the onSnapshot echo of our own write.
  //
  // `onError` fires if the cloud write fails, so callers that are holding a
  // "write in flight" barrier can release it instead of blocking remote
  // updates forever.
  const setStoredValue = useCallback(
    (key: string, value: unknown, onError?: () => void): string => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {}
      const nonce = crypto.randomUUID()
      if (user && db) {
        setSyncStatus('syncing')
        // The Firestore SDK is fetched on demand; the first write of a
        // session is what pays for it, not the first paint.
        void firestoreApi()
          .then(({ doc, getDoc, setDoc, serverTimestamp }) => {
            const ref = doc(db, 'users', user.uid, 'kv', key)

            const write = (payload: unknown) =>
              setDoc(ref, { value: payload, updatedAt: serverTimestamp(), nonce }, { merge: true })

            // The report buffer is a union, not a single value: two devices can
            // both record an entry before either has pulled the other's. Writing
            // the local map verbatim replaced the other device's entries, so
            // the union of both is what goes to the cloud.
            //
            // Every other key keeps plain last-write-wins — merging them would
            // resurrect deleted tasks and undo completed ones.
            //
            // The read and the write are not one atomic step, so two devices
            // writing in the same instant can still lose one side's entries. A
            // transaction would close that window, but a transaction needs the
            // server and this app is offline-first: `setDoc` queues the write
            // locally when there is no connection, a transaction would not.
            const buildPayload = (): Promise<unknown> => {
              if (key !== BUFFER_CLOUD_KEY) return Promise.resolve(value)
              return getDoc(ref)
                .then((snap) => {
                  const cloud = snap.exists()
                    ? (snap.data()?.value as ReportBuffer | undefined)
                    : undefined
                  return cloud
                    ? mergeBuffers(cloud, value as ReportBuffer)
                    : (value as ReportBuffer)
                })
                .catch(() => value as ReportBuffer)
            }

            return buildPayload().then((merged) => write(merged))
          })
          .then(() => setSyncStatus('synced'))
          .catch(() => {
            // Offline / chunk-load failure: Firestore queues; local snapshot persists.
            setSyncStatus('error')
            onError?.()
          })
      } else {
        setSyncStatus('local')
      }
      return nonce
    },
    [user, db],
  )

  const removeStoredValue = useCallback(
    async (key: string): Promise<void> => {
      try {
        localStorage.removeItem(key)
      } catch {}
      if (user && db) {
        setSyncStatus('syncing')
        try {
          const { doc, deleteDoc } = await firestoreApi()
          await deleteDoc(doc(db, 'users', user.uid, 'kv', key))
          setSyncStatus('synced')
        } catch {
          setSyncStatus('error')
        }
      } else {
        setSyncStatus('local')
      }
    },
    [user, db],
  )

  // One-time migration: push any local data that has no cloud doc yet.
  const migrateLocalToCloud = useCallback(async () => {
    if (!user || !db) return
    const writes: Promise<unknown>[] = []
    try {
      const { doc, getDoc, setDoc, serverTimestamp } = await firestoreApi()
      for (const key of SYNC_KEYS) {
        const ref = doc(db, 'users', user.uid, 'kv', key)
        try {
          const snap = await getDoc(ref)
          if (!snap.exists()) {
            let local: unknown = null
            try {
              // The report buffer is read through its accessor, because a
              // buffer written by an older build lives in one localStorage key
              // per day and would otherwise never reach the cloud.
              if (key === BUFFER_CLOUD_KEY) {
                const buffer = readBuffer()
                local = Object.keys(buffer).length ? buffer : null
              } else {
                const raw = localStorage.getItem(key)
                local = raw ? JSON.parse(raw) : null
              }
            } catch {}
            if (local != null) {
              writes.push(
                setDoc(ref, { value: local, updatedAt: serverTimestamp(), nonce: crypto.randomUUID() }, { merge: true }),
              )
            }
          }
        } catch {
          /* ignore per-key migration errors */
        }
      }
      await Promise.allSettled(writes)
    } catch {
      /* SDK unavailable — the local data stays local and can be uploaded later */
    }
  }, [user, db])

  // Push anything that only exists on this device to the cloud, once the
  // user is signed in.
  //
  // `useSyncedStorage` seeds its own keys on first sign-in, but the keys
  // written by the plain storage utilities (the report buffer, the pomodoro
  // history, the save schedule) have no such hook — they only reach the
  // cloud when `writeToCloud` fires because the value changed. Without
  // this, a browser that had been in use before signing in would keep its
  // history here while every other device saw an empty week — and the
  // Settings card would be lying when it said the data was migrated on
  // first sign-in.
  //
  // The migration only writes keys that have no cloud document yet, so it
  // never overwrites cloud data that is already there.
  useEffect(() => {
    if (!user || !db) return
    void migrateLocalToCloud()
  }, [user, db, migrateLocalToCloud])

  // The plain-function storage utilities (the weekly-report buffer, the
  // pomodoro history, the save schedule) cannot call `useSyncContext()`
  // themselves — they run from context callbacks, not components. Hand them
  // the same writer the hooks use, and they mirror themselves to Firestore.
  useEffect(() => {
    registerCloudWriter(setStoredValue)
    return () => registerCloudWriter(null)
  }, [setStoredValue])

  // Pull the mirrored keys down and merge them with whatever is local.
  //
  // The report buffer is a union (every device contributes the days it
  // recorded); the pomodoro history takes the larger count per day; the save
  // schedule is last-write-wins and the cloud copy wins.
  useEffect(() => {
    if (!user || !db) return
    let cancelled = false

    void (async () => {
      try {
        const { doc, getDoc } = await firestoreApi()

        const pull = async (key: string) => {
          try {
            const snap = await getDoc(doc(db, 'users', user.uid, 'kv', key))
            if (cancelled || !snap.exists()) return
            const cloud = snap.data()?.value as unknown
            if (cloud == null) return

            if (key === BUFFER_CLOUD_KEY) {
              setStoredValue(key, mergeBuffers(readBuffer(), cloud as ReportBuffer))
              return
            }
            if (key === POMO_HISTORY_KEY) {
              const local = readPomodoroHistory()
              const remote = (cloud as Record<string, number>) ?? {}
              const merged: Record<string, number> = { ...local }
              for (const [date, count] of Object.entries(remote)) {
                merged[date] = Math.max(merged[date] ?? 0, count)
              }
              // Prune the merged map, not only the local one. Taking the max
              // per day pulls the days the local prune removed straight back
              // out of the cloud copy, so without this the retention window
              // never actually held.
              setStoredValue(key, prunePomodoroHistoryMap(merged))
              return
            }
            // Settings: the cloud copy is the newer one.
            setStoredValue(key, cloud)
          } catch {
            /* Firestore unavailable — stay on the local copy */
          }
        }

        await Promise.all([pull(BUFFER_CLOUD_KEY), pull(POMO_HISTORY_KEY), pull(SETTINGS_KEY)])
      } catch {
        /* SDK unavailable — stay on the local copy */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, db, setStoredValue])

  return (
    <SyncContext.Provider
      value={{
        user,
        db,
        authReady,
        authError,
        configured,
        isSignedIn: !!user,
        syncStatus,
        signInGoogle,
        signInEmail: signInEmailFn,
        createAccount: createAccountFn,
        signOut: signOutCb,
        signOutAndClearDevice,
        setStoredValue,
        removeStoredValue,
        migrateLocalToCloud,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}
