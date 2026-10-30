import Modal from './Modal'
import PixelEmoji from './PixelEmoji'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'SPACE', desc: 'Start / Pause Focus Timer', section: 'Timer' },
  { key: 'R', desc: 'Reset Active Timer Interval', section: 'Timer' },
  { key: 'S or →', desc: 'Skip Current Interval', section: 'Timer' },
  { key: 'N', desc: 'Create New Task', section: 'Navigation' },
  { key: 'H', desc: 'Go to Home / Wallpaper Screen', section: 'Navigation' },
  { key: '1', desc: 'Go to Tasks Dashboard', section: 'Navigation' },
  { key: '2', desc: 'Go to Kanban Board', section: 'Navigation' },
  { key: '3', desc: 'Go to Bookmarks / Tabs', section: 'Navigation' },
  { key: '4', desc: 'Go to Focus / Pomodoro', section: 'Navigation' },
  { key: '5', desc: 'Go to Settings', section: 'Navigation' },
  { key: '?', desc: 'Toggle This Shortcuts Guide', section: 'General' },
  { key: 'ESC', desc: 'Close Active Window or Modal', section: 'General' },
]

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <PixelEmoji name="gear" size={18} />
          <span>KEYBOARD COMMANDS</span>
        </div>
      }
      footer={
        <button
          onClick={onClose}
          className="font-pixel text-small px-4 py-2 bg-accent text-on-accent border-2 border-accent-hot hover:brightness-110"
        >
          GOT IT [ESC]
        </button>
      }
    >
      <div className="space-y-3 font-pixel">
        <p className="text-caption text-muted">
          Speed up your productivity with full arcade keyboard shortcuts:
        </p>

        <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
          {SHORTCUTS.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 bg-app-deep border border-line text-caption"
            >
              <span className="text-accent-2 font-bold bg-surface px-1.5 py-0.5 border border-line">
                {s.key}
              </span>
              <span className="text-muted text-right">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
