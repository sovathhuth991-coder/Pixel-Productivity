// Drop-in replacement for `useLocalStorage` that mirrors every write to Cloud
// Firestore via SyncContext. When offline or unsigned it behaves exactly like
// `useLocalStorage` (localStorage is the source of truth), so the app never
// depends on a live backend. Once signed in, Firestore becomes authoritative:
// remote changes stream in via onSnapshot, local writes are pushed to the cloud,
// and our own writes are suppressed client-side via a nonce (no feedback loop).
//
// Conflict model: last successful cloud write wins (by server `updatedAt`).
// The listener always treats the cloud doc as authoritative, so a check you
// complete on your phone propagates to desktop within one snapshot — it can't
// be silently clobbered by a stale local client state.

import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, getDoc, onSnapshot, type Firestore } from 'firebase/firestore'
import { useSyncContext } from '../context/SyncContext'

type Setter<T> = (value: T | ((prev: T) => T)) => void

export interface SyncedStorageOptions<T> {
  /**
   * Merge the local value with the remote one on the *first* contact with
   * the cloud for a given account, instead of letting the remote value
   * replace it.
   *
   * This matters for a browser that held real data before it ever signed
   * in. A second device can create the cloud document first — with nothing
   * in it — and then the plain last-write-wins rule would hand that empty
   * document to the device that actually has the history, wiping it.
   *
   * The merge runs once per account. After that the normal
   * last-write-wins behaviour applies, so deletions still propagate.
   */
  mergeOnFirstContact?: (local: T, remote: T) => T
}

export function useSyncedStorage<T>(
  key: string,
  initialValue: T,
  options?: SyncedStorageOptions<T>,
): [T, Setter<T>] {
  const { user, db, setStoredValue } = useSyncContext()
  const enabled = Boolean(user && db)

  const [value, setValue] = useState<T>(() => readLocal<T>(key, initialValue))
  const valueRef = useRef(value)
  valueRef.current = value
  // Nonce of the last write *we* issued, echoed back by onSnapshot -> skip it.
  const nonceRef = useRef<string | null>(null)
  // Server timestamp of the latest cloud snapshot we have applied. Used to
  // drop stale remote writes (e.g. a backgrounded device briefly streaming an
  // old doc back) so the cloud can't resurrect a task state we already
  // superseded. Only strictly-older snapshots are suppressed (Firestore
  // streams onSnapshot in updateTime order, so a current one is never dropped).
  const lastAppliedTsRef = useRef<number | null>(null)
  // True while one of our own cloud writes is still in flight. A snapshot that
  // does not carry our nonce must predate that write, so applying it would
  // undo the change we just made — the "my tick vanished" / "last week's
  // check came back" symptom. Released when our own write echoes back, or
  // when the write fails.
  const pendingWriteRef = useRef(false)
  // The account the refs above belong to. When the signed-in account
  // changes, the previous account's timestamps and nonce must not be
  // applied to the new account's documents — a document from another
  // account can legitimately carry an older timestamp and would be
  // discarded as "stale".
  const lastUidRef = useRef<string | null>(null)
  // True until the first cloud snapshot for the current account has been
  // applied. See `mergeOnFirstContact`.
  const firstContactRef = useRef(true)
  // initialValue is typically an inline literal (`{}`, `[]`) at the call site,
  // so it gets a new identity every render. Track it via a ref so the
  // subscription effect below does NOT re-run (and tear down + re-subscribe
  // the Firestore listener) on every render — that churn drops remote updates.
  const initialValueRef = useRef(initialValue)
  initialValueRef.current = initialValue

  const mergeOnFirstContact = options?.mergeOnFirstContact
  const mergeRef = useRef(mergeOnFirstContact)
  mergeRef.current = mergeOnFirstContact

  useEffect(() => {
    if (!enabled) return
    const ref = doc(db as Firestore, 'users', user!.uid, 'kv', key)

    // A different account brings its own documents, its own timestamps and
    // its own history. Anything remembered about the previous account would
    // misread this account's first snapshot as a stale one.
    if (lastUidRef.current !== user!.uid) {
      lastUidRef.current = user!.uid
      lastAppliedTsRef.current = null
      nonceRef.current = null
      pendingWriteRef.current = false
      firstContactRef.current = true
    }

    // First sign-in migration: if the cloud doc doesn't exist yet, seed it
    // from whatever is already in localStorage so nothing is lost.
    //
    // Only a value that is actually STORED locally is seeded. A browser
    // that has never been used has no entry for this key, and falling back
    // to `initialValue` would push the default seed data to the cloud —
    // creating a document that then shadows the real task list of the
    // device that actually has one.
    getDoc(ref).then((snap) => {
      if (!snap.exists()) {
        const local = readLocalRaw<T>(key)
        if (local === null) return
        nonceRef.current = setStoredValue(key, local)
      }
    }).catch(() => { /* Firestore unavailable; stay on localStorage */ })

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return
        const data = snap.data() as { value: T; nonce?: string; updatedAt?: unknown }
        const ts = toMillis(data.updatedAt)

        if (data.nonce != null && data.nonce === nonceRef.current) {
          // Our own write coming back. Adopt its timestamp so anything older
          // is dropped from now on, and release the in-flight barrier.
          if (ts != null) lastAppliedTsRef.current = ts
          pendingWriteRef.current = false
          firstContactRef.current = false
          return
        }

        // Drop a remote write older than the last snapshot we already applied —
        // this enforces "cloud authoritative, last-write-wins by server
        // updatedAt" so a stale/backgrounded device can't check a task back on
        // (the cross-week stale-check symptom). Only strictly-older docs are
        // suppressed; missing/equal timestamps are still applied.
        if (ts != null && lastAppliedTsRef.current != null && ts < lastAppliedTsRef.current) return
        // A write of ours is still in flight, and this snapshot does not carry
        // our nonce — so it was taken before that write and does not know about
        // it. Applying it would revert the change we just made. Wait for our own
        // echo instead.
        if (pendingWriteRef.current) return

        if (ts != null) lastAppliedTsRef.current = ts

        // The very first snapshot for this account: if this browser holds
        // data the cloud does not, keep both instead of letting the cloud
        // replace it.
        //
        // "Holds data" means the key has actually been written locally. A
        // browser that has never stored this key only has the default
        // value in memory, and merging that in would push the demo seed
        // list into a real task list.
        const hasLocalHistory = readLocalRaw<T>(key) !== null
        const merging =
          firstContactRef.current && mergeRef.current != null && hasLocalHistory
        firstContactRef.current = false
        const next = merging
          ? mergeRef.current!(valueRef.current, data.value)
          : data.value

        setValue(next)
        valueRef.current = next
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {}
        // The merge produced something the cloud does not have — push it up
        // so the other device converges on the same set.
        if (merging && next !== data.value) {
          nonceRef.current = setStoredValue(key, next)
        }
      },
      () => {
        /* The listener failed (rules, revoked token, network). The app
           keeps working from localStorage; there is nothing to recover
           here, and an uncaught error would take the page down. */
      },
    )

    return () => {
      unsub()
      // Release the in-flight barrier. A write that was still in flight when
      // the listener was torn down would otherwise never echo back, and the
      // barrier would block every remote update for the rest of the session.
      pendingWriteRef.current = false
    }
    // setStoredValue already captures user/db, so it drives re-subscribe on
    // sign-in/sign-out. initialValue is read via ref above (see comment).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, db, user, key, setStoredValue])

  const set: Setter<T> = useCallback(
    (v) => {
      const next = v instanceof Function ? (v as (p: T) => T)(valueRef.current) : v
      // Nothing actually changed — skip the write entirely. Without this the
      // periodic reset check would push an identical document to Firestore
      // every minute, and the resulting snapshot traffic would churn the
      // sync state for no reason.
      if (next === valueRef.current) return
      setValue(next)
      valueRef.current = next
      // Hold back remote snapshots until our own write echoes back.
      if (enabled) pendingWriteRef.current = true
      // setStoredValue mirrors to localStorage (and Firestore when enabled),
      // returning a nonce so the listener echoes this write away.
      nonceRef.current = setStoredValue(key, next, () => {
        pendingWriteRef.current = false
      })
    },
    [setStoredValue, key, enabled],
  )

  return [value, set]
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/**
 * The stored value, or `null` when the key has never been written.
 *
 * The difference from `readLocal` matters for the first sign-in: a browser
 * that has never stored this key has no history worth pushing to the
 * cloud, and must not contribute its default value instead.
 */
function readLocalRaw<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

// Normalize a Firestore serverTimestamp into epoch ms. Accepts Timestamps
// (have toMillis()), plain numbers (pending estimate), or date strings.
// Returns null if the value isn't a usable timestamp — in which case the
// caller must fall back to applying the snapshot (never suppress for lack of
// a parseable ts, to avoid silently stalling sync).
function toMillis(ts: unknown): number | null {
  if (ts == null) return null
  const t = ts as { toMillis?: () => number }
  if (typeof t.toMillis === 'function') {
    try {
      return t.toMillis()
    } catch {
      return null
    }
  }
  if (typeof ts === 'number') return ts
  if (typeof ts === 'string') {
    const p = Date.parse(ts)
    return isNaN(p) ? null : p
  }
  return null
}
