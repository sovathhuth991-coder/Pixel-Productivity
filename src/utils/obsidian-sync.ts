export interface PomodoroSaleToObsidian {
  taskId: string
  taskTitle: string
  startedAt: string
  finishedAt: string
  duration: number
}

export interface TaskLogEntry {
  taskName: string
  categoryName: string
  frequency: 'daily' | 'weekly' | 'once'
  completedAt: string
  pomodoros: number
}

/**
 * Where the local Obsidian gateway lives, and the secret it expects.
 *
 * The gateway is an HTTP server on the user's own machine. Without a token
 * it is an open API: *any* website the user visits can POST to
 * `http://localhost:5789` and write files into their Obsidian vault. The
 * page cannot read the token out of this app (same-origin policy), so a
 * shared secret turns that hole into a dead end.
 *
 * The token is stored in `pixel_obsidian_settings`, which is device-local
 * and never synced to the cloud.
 */
export interface GatewayTarget {
  /** Base URL of the gateway. */
  url?: string
  /** Shared secret the gateway requires on every request. */
  token?: string
}

const DEFAULT_GATEWAY_URL = 'http://localhost:5789'
const TOKEN_HEADER = 'X-Pixel-Gateway-Token'

/**
 * POST to the gateway.
 *
 * Returns the response, or null when the gateway could not be reached.
 * A missing or wrong token is the gateway's business to reject — the app
 * only reports that the call did not succeed.
 */
async function postToGateway(
  path: string,
  body: unknown,
  target: GatewayTarget,
): Promise<Response | null> {
  const base = (target.url || DEFAULT_GATEWAY_URL).replace(/\/$/, '')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (target.token) headers[TOKEN_HEADER] = target.token
  try {
    return await fetch(`${base}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch (error) {
    console.warn('Obsidian gateway not reachable:', error)
    return null
  }
}

export const submitSessionToGateway = async (
  session: PomodoroSaleToObsidian,
  vaultPath: string,
  target: GatewayTarget = {},
): Promise<boolean> => {
  if (!vaultPath) return false
  const response = await postToGateway('/pomodoro/session', { ...session, vaultPath }, target)
  return response?.ok ?? false
}

export const autoLogSession = async (
  session: PomodoroSaleToObsidian,
  vaultPath: string,
  target?: GatewayTarget,
): Promise<boolean> => {
  return await submitSessionToGateway(session, vaultPath, target)
}

export const logTaskCompletion = async (
  entry: TaskLogEntry,
  vaultPath: string,
  target: GatewayTarget = {},
): Promise<boolean> => {
  if (!vaultPath) return false
  const response = await postToGateway('/tasks/log', { ...entry, vaultPath }, target)
  return response?.ok ?? false
}

export const removeTaskCompletion = async (
  taskName: string,
  vaultPath: string,
  target: GatewayTarget = {},
): Promise<boolean> => {
  if (!vaultPath) return false
  const response = await postToGateway('/tasks/remove', { taskName, vaultPath }, target)
  if (!response || !response.ok) return false
  try {
    const result = await response.json()
    return result?.success ?? false
  } catch {
    return true
  }
}
