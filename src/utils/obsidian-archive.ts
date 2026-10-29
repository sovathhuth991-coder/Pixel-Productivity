// ─── Obsidian Archive via File System Access API ─────────────────────────
// Persists the picked directory handle in IndexedDB so the user only
// re-picks the folder once per machine. Each save writes directly into
// the chosen folder, no gateway, no extra software.

import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'pixel-obsidian-handles'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'tasksFromPP'

let cachedHandle: FileSystemDirectoryHandle | null = null
let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    }).catch((err) => {
      // A failed open must not be cached, or every later call fails with
      // the same error for the rest of the session.
      dbPromise = null
      throw err
    })
  }
  return dbPromise
}

async function saveHandleToIDB(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await getDB()
    await db.put(STORE_NAME, handle, HANDLE_KEY)
  } catch {
    /* the handle still works for this session, it just will not persist */
  }
}

async function loadHandleFromIDB(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getDB()
    const handle = (await db.get(STORE_NAME, HANDLE_KEY)) as
      | FileSystemDirectoryHandle
      | undefined
    return handle ?? null
  } catch {
    return null
  }
}

async function clearHandleInIDB(): Promise<void> {
  try {
    const db = await getDB()
    await db.delete(STORE_NAME, HANDLE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * The current permission state for a handle.
 *
 * `queryPermission` never shows a dialog, so it is safe to call from a
 * mount effect or a background timer.
 */
async function queryPermissionState(
  handle: FileSystemDirectoryHandle,
  write = true,
): Promise<PermissionState> {
  try {
    // @ts-expect-error - FileSystemHandle.queryPermission is standard
    const opts: FileSystemHandlePermissionDescriptor = { mode: write ? 'readwrite' : 'read' }
    // @ts-expect-error
    return (await handle.queryPermission(opts)) as PermissionState
  } catch {
    return 'prompt'
  }
}

/**
 * Ask for permission to use a handle.
 *
 * `requestPermission` needs transient user activation — the browser shows a
 * prompt, and without an activation it resolves to "prompt" without
 * granting anything. It must therefore only be called from a real user
 * gesture, never from a mount effect.
 */
async function requestPermission(
  handle: FileSystemDirectoryHandle,
  write = true,
): Promise<boolean> {
  try {
    // @ts-expect-error - FileSystemHandle.requestPermission is standard
    const opts: FileSystemHandlePermissionDescriptor = { mode: write ? 'readwrite' : 'read' }
    // @ts-expect-error
    return (await handle.requestPermission(opts)) === 'granted'
  } catch {
    return false
  }
}

// Pick a folder. Returns the handle (also caches + persists it).
export async function pickVaultFolder(): Promise<FileSystemDirectoryHandle | null> {
  // @ts-expect-error - showDirectoryPicker is the standard FSA method
  const handle = (await window.showDirectoryPicker({
    id: 'pixel-obsidian-vault',
    mode: 'readwrite',
  })) as FileSystemDirectoryHandle

  if (!handle) return null
  cachedHandle = handle
  await saveHandleToIDB(handle)
  return handle
}

// Try to recover the saved handle. If the user has revoked permission
// or the DB is gone, returns null and the caller should re-pick.
export async function getVaultFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (cachedHandle) return cachedHandle
  const handle = await loadHandleFromIDB()
  if (!handle) return null
  const state = await queryPermissionState(handle, true)
  if (state === 'denied') {
    // The access was explicitly revoked — forget the handle.
    await clearHandleInIDB()
    cachedHandle = null
    return null
  }
  // "prompt" means the permission has lapsed but was never revoked. The
  // handle stays: the next save (a real click) asks for it again.
  //
  // This path used to call `requestPermission` from a mount effect, where
  // there is no user activation. That never grants anything, so the check
  // always failed and the saved folder was deleted — the user had to
  // re-pick their vault every time the Weekly Report page was opened, even
  // though they had revoked nothing.
  cachedHandle = handle
  return handle
}

// Forget the saved folder. Next save will re-prompt.
export async function forgetVaultFolder(): Promise<void> {
  cachedHandle = null
  await clearHandleInIDB()
}

/**
 * Is the saved vault folder writable *right now*, without prompting?
 *
 * `queryPermission` never shows a dialog, so this is safe to call from a
 * background timer — which is exactly what the weekly auto-save is. If the
 * permission was revoked, the answer is "no" and the auto-save stays quiet
 * instead of throwing a browser dialog at the user.
 */
export async function hasVaultPermission(): Promise<boolean> {
  try {
    const handle = cachedHandle ?? (await loadHandleFromIDB())
    if (!handle) return false
    // @ts-expect-error - FileSystemHandle.queryPermission is standard
    const state = await handle.queryPermission({ mode: 'readwrite' })
    return state === 'granted'
  } catch {
    return false
  }
}

export interface SaveResult {
  ok: boolean
  filename?: string
  error?: string
}

// Write markdown content into the vault folder under a given filename.
// If no folder is saved, returns ok:false with a clear error so the UI
// can prompt the user to pick one.
export async function writeMarkdownToVault(
  filename: string,
  content: string,
): Promise<SaveResult> {
  let handle = await getVaultFolder()
  if (!handle) {
    return {
      ok: false,
      error: 'NO_FOLDER',
    }
  }

  // Re-check permission (may have been revoked between page loads). This
  // runs from a click on the Save button, so asking for permission here is
  // allowed — the browser prompt keeps the user activation.
  const state = await queryPermissionState(handle, true)
  let allowed = state === 'granted'
  if (!allowed && state === 'prompt') {
    allowed = await requestPermission(handle, true)
  }
  if (!allowed) {
    // Only forget the folder when the access was explicitly denied. A
    // lapsed permission is not a revocation, and throwing the choice away
    // would make the user re-pick their vault.
    if (state === 'denied') {
      await forgetVaultFolder()
    }
    return { ok: false, error: 'PERMISSION_DENIED' }
  }

  try {
    const fileHandle = await handle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
    return { ok: true, filename }
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'UNKNOWN_ERROR',
    }
  }
}
