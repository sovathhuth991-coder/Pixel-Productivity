import { useCategoryWindowContext } from '../../context/CategoryWindowContext'
import { useTaskContext } from '../../context/TaskContext'
import PixelEmoji from '../ui/PixelEmoji'
import { playClick } from '../../utils/audio'

export default function RetroWindowDock() {
  const { windows, openWindow, closeWindow } = useCategoryWindowContext()
  const { data } = useTaskContext()

  if (windows.length === 0) return null

  return (
    // On mobile the dock scrolls sideways in a single row instead of
    // wrapping, so it has a predictable height. The toast is anchored
    // above it and cannot be covered by it.
    <div className="fixed bottom-14 md:bottom-3 right-3 z-40 flex max-w-[calc(100vw-24px)] pointer-events-auto">
      <div className="bg-surface/95 border-2 border-line pixel-border p-1 flex items-center gap-1 shadow-2xl backdrop-blur-xs overflow-x-auto md:overflow-visible">
        <div className="px-1.5 py-0.5 font-pixel text-label text-muted border-r border-line/60 flex items-center gap-1">
          <PixelEmoji name="gear" size={10} />
          <span className="hidden sm:inline">DOCK:</span>
          <span>{windows.length}</span>
        </div>

        {windows.map(w => {
          const cat = data.categories.find(c => c.id === w.categoryId)
          if (!cat) return null

          const isMinimized = w.minimized

          return (
            <div
              key={w.categoryId}
              className={`flex items-center gap-1 px-2 py-1 font-pixel text-label border transition-all ${
                isMinimized
                  ? 'bg-app-deep border-line text-muted hover:text-ink hover:border-accent-2'
                  : 'bg-accent-2/15 border-accent-2 text-accent-2 shadow-xs'
              }`}
            >
              <button
                onClick={() => {
                  playClick()
                  openWindow(cat)
                }}
                className="flex items-center gap-1 text-left"
                title={isMinimized ? `Restore ${cat.name}` : `Bring ${cat.name} to front`}
              >
                <div
                  className="w-2 h-2 shrink-0 border border-ink/40"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="max-w-[80px] sm:max-w-[120px] truncate">{cat.name}</span>
                {isMinimized && (
                  <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse" />
                )}
              </button>

              <button
                onClick={e => {
                  e.stopPropagation()
                  playClick()
                  closeWindow(cat.id)
                }}
                className="text-dim hover:text-danger ml-0.5 p-0.5 w-8 h-8 flex items-center justify-center"
                title="Close Window" aria-label="Close Window"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
