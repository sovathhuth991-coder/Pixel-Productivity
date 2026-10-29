import { createContext, useContext, type ReactNode } from 'react'
import { useTaskManager, type TaskManagerReturn } from '../hooks/useTaskManager'

const TaskContext = createContext<TaskManagerReturn | null>(null)

export function TaskProvider({ children }: { children: ReactNode }) {
  const taskManager = useTaskManager()
  return (
    <TaskContext.Provider value={taskManager}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTaskContext(): TaskManagerReturn {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTaskContext must be used within a TaskProvider')
  return ctx
}
