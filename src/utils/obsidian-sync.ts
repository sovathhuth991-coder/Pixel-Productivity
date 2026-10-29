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

export const submitSessionToGateway = async (
  session: PomodoroSaleToObsidian,
  vaultPath: string,
  gatewayUrl: string = 'http://localhost:5789'
): Promise<boolean> => {
  if (!vaultPath) return false
  try {
    const response = await fetch(`${gatewayUrl.replace(/\/$/, '')}/pomodoro/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...session, vaultPath })
    })
    return response.ok
  } catch (error) {
    console.warn('Obsidian gateway not reachable:', error)
    return false
  }
}

export const autoLogSession = async (
  session: PomodoroSaleToObsidian,
  vaultPath: string,
  gatewayUrl?: string
): Promise<boolean> => {
  return await submitSessionToGateway(session, vaultPath, gatewayUrl)
}

export const logTaskCompletion = async (
  entry: TaskLogEntry,
  vaultPath: string,
  gatewayUrl: string = 'http://localhost:5789'
): Promise<boolean> => {
  if (!vaultPath) return false
  try {
    const response = await fetch(`${gatewayUrl.replace(/\/$/, '')}/tasks/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...entry, vaultPath })
    })
    return response.ok
  } catch (error) {
    console.warn('Obsidian gateway not reachable:', error)
    return false
  }
}

export const removeTaskCompletion = async (
  taskName: string,
  vaultPath: string,
  gatewayUrl: string = 'http://localhost:5789'
): Promise<boolean> => {
  if (!vaultPath) return false
  try {
    const response = await fetch(`${gatewayUrl.replace(/\/$/, '')}/tasks/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskName, vaultPath })
    })
    const result = await response.json()
    return result?.success ?? false
  } catch (error) {
    console.warn('Obsidian gateway not reachable:', error)
    return false
  }
}

