import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import type { Category } from '../types/tasks'

interface CategoryWindowState {
  id: string
  categoryId: string
  minimized: boolean
  position: { x: number; y: number }
}

interface WindowRect {
  categoryId: string
  x: number
  y: number
  w: number
  h: number
}

interface CategoryWindowContextType {
  windows: CategoryWindowState[]
  openWindow: (category: Category) => void
  closeWindow: (categoryId: string) => void
  minimizeWindow: (categoryId: string) => void
  toggleWindow: (categoryId: string, category: Category) => void
  updatePosition: (categoryId: string, position: { x: number; y: number }) => void
  getOtherWindowRects: (excludeCategoryId: string, winW: number, winH: number) => WindowRect[]
}

const CategoryWindowContext = createContext<CategoryWindowContextType>({
  windows: [],
  openWindow: () => {},
  closeWindow: () => {},
  minimizeWindow: () => {},
  toggleWindow: () => {},
  updatePosition: () => {},
  getOtherWindowRects: () => [],
})

export function useCategoryWindowContext() {
  return useContext(CategoryWindowContext)
}

export function CategoryWindowProvider({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<CategoryWindowState[]>(() => {
    // Load from localStorage on initial render
    try {
      const saved = localStorage.getItem('category_windows_open')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  
  // Persist windows to localStorage on change
  useEffect(() => {
    localStorage.setItem('category_windows_open', JSON.stringify(windows))
  }, [windows])
  
  const openWindow = useCallback((category: Category) => {
    setWindows(prev => {
      // If already open and visible, don't duplicate
      if (prev.some(w => w.categoryId === category.id && !w.minimized)) return prev
      // Restore minimized window
      const existing = prev.find(w => w.categoryId === category.id)
      if (existing && existing.minimized) {
        return prev.map(w => 
          w.categoryId === category.id ? { ...w, minimized: false } : w
        )
      }
      // Create new window
      return [...prev, {
        id: category.id,
        categoryId: category.id,
        position: { x: 100, y: 100 },
        minimized: false
      }]
    })
  }, [])
  
  const closeWindow = useCallback((categoryId: string) => {
    setWindows(prev => prev.filter(w => w.categoryId !== categoryId))
  }, [])
  
  const minimizeWindow = useCallback((categoryId: string) => {
    setWindows(prev => prev.map(w => 
      w.categoryId === categoryId ? { ...w, minimized: true } : w
    ))
  }, [])
  
  const toggleWindow = useCallback((categoryId: string, category: Category) => {
    setWindows(prev => {
      const existing = prev.find(w => w.categoryId === categoryId)
      if (existing && !existing.minimized) {
        // Already open and visible, close it
        return prev.filter(w => w.categoryId !== categoryId)
      }
      if (existing && existing.minimized) {
        // Restore from minimized
        return prev.map(w => 
          w.categoryId === categoryId ? { ...w, minimized: false } : w
        )
      }
      // Open new window
      return [...prev, {
        id: category.id,
        categoryId: category.id,
        position: { x: 100, y: 100 },
        minimized: false
      }]
    })
  }, [])
  
  const updatePosition = useCallback((categoryId: string, position: { x: number; y: number }) => {
    setWindows(prev => prev.map(w => 
      w.categoryId === categoryId ? { ...w, position } : w
    ))
  }, [])

  // Returns bounding rects for all visible (non-minimized) windows except the one being dragged
  const getOtherWindowRects = useCallback((excludeCategoryId: string, winW: number, winH: number): WindowRect[] => {
    return windows
      .filter(w => w.categoryId !== excludeCategoryId && !w.minimized)
      .map(w => ({
        categoryId: w.categoryId,
        x: w.position.x,
        y: w.position.y,
        w: winW,
        h: winH,
      }))
  }, [windows])
  
  const value = useMemo(() => ({
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    toggleWindow,
    updatePosition,
    getOtherWindowRects,
  }), [windows, openWindow, closeWindow, minimizeWindow, toggleWindow, updatePosition, getOtherWindowRects])
  
  return (
    <CategoryWindowContext.Provider value={value}>
      {children}
    </CategoryWindowContext.Provider>
  )
}