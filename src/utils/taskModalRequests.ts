/**
 * A tiny request bus for opening the "new task" dialog from anywhere in the
 * app (currently the global `N` keyboard shortcut).
 *
 * The dialog lives in the Dashboard, so a request that arrives while another
 * page is showing is parked here and consumed when the Dashboard mounts.
 */
export const OPEN_TASK_MODAL_EVENT = 'pixel:open-task-modal'

let pending = false

/** Ask the Dashboard to open the new-task dialog. */
export function requestOpenTaskModal(): void {
  pending = true
  window.dispatchEvent(new CustomEvent(OPEN_TASK_MODAL_EVENT))
}

/**
 * Consume a request that was made before the listener was attached.
 * Returns true (and clears the flag) when a request was waiting.
 */
export function consumeOpenTaskModalRequest(): boolean {
  if (!pending) return false
  pending = false
  return true
}
