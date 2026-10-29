// A tiny bridge between the plain-function storage utilities and the React
// sync layer.
//
// The weekly-report buffer and the pomodoro history are written from context
// callbacks (`recordTaskCompleted`, `recordPomodoroFinished`, …) that are not
// React components, so they cannot call `useSyncContext()` to reach
// Firestore. The SyncProvider registers its writer here once, and the
// utilities call it whenever they change something.
//
// With no signed-in user the writer is absent and every utility behaves
// exactly as before — localStorage only.

export type CloudWriter = (key: string, value: unknown) => void

let writer: CloudWriter | null = null

export function registerCloudWriter(w: CloudWriter | null): void {
  writer = w
}

export function getCloudWriter(): CloudWriter | null {
  return writer
}

/** Push a value to the cloud if a writer is registered. Returns true if it was. */
export function writeToCloud(key: string, value: unknown): boolean {
  if (!writer) return false
  try {
    writer(key, value)
    return true
  } catch {
    return false
  }
}
