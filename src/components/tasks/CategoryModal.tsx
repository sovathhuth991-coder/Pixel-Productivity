import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { useTaskContext } from '../../context/TaskContext'
import type { Category } from '../../types/tasks'
import { useToast } from '../ui/Toast'
import PixelEmoji from '../ui/PixelEmoji'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  categoryToEdit?: Category | null
}

// The category swatches are drawn straight onto the parchment surface, so
// every one of them has to hold its own contrast. The old list was a
// rainbow of Tailwind/Commander hexes; these are the app's own Pixel
// Center token values, each of which is legible on #f6f1e7.
const PRESET_COLORS = [
  '#b53823', // terracotta
  '#166b56', // jade
  '#7c3aed', // arcade violet
  '#231f32', // graphite
  '#9a5b06', // burnt amber
  '#1f7a3d', // forest
  '#c81e1e', // brick red
  '#0f3460', // navy line
]

export default function CategoryModal({
  isOpen,
  onClose,
  categoryToEdit,
}: CategoryModalProps) {
  const { addCategory, updateCategory } = useTaskContext()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [color, setColor] = useState('#b53823')

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name)
      setColor(categoryToEdit.color || '#b53823')
    } else {
      setName('')
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
    }
  }, [categoryToEdit, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showToast('Please enter a category name', 'error')
      return
    }

    if (categoryToEdit) {
      updateCategory(categoryToEdit.id, { name: name.trim(), color })
      showToast('Category updated!', 'success')
    } else {
      addCategory(name.trim(), color)
      showToast('Category created!', 'success')
    }

    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <PixelEmoji name={categoryToEdit ? 'paint' : 'gem'} size={18} />
          <span>{categoryToEdit ? 'EDIT CATEGORY' : 'NEW CATEGORY'}</span>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="font-pixel text-caption px-3 py-2 border-2 border-ink/20 text-muted hover:text-ink hover:border-ink/40"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="font-pixel text-caption px-3 py-2 bg-accent-2 border-2 border-accent-2-hot text-on-accent-2 font-bold hover:brightness-110"
          >
            {categoryToEdit ? 'SAVE CHANGES' : 'CREATE CATEGORY'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="category-name" className="block font-pixel text-caption text-muted mb-1.5">
            CATEGORY NAME *
          </label>
          <input
            id="category-name"
            type="text"
            required
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Work, Health, Reading..."
            className="w-full bg-app-deep border-2 border-line focus:border-accent p-2 text-ink font-pixel text-small outline-none"
          />
        </div>

        <div>
          <div
            id="category-color-label"
            className="block font-pixel text-caption text-muted mb-2"
          >
            THEME COLOR
          </div>
          <div
            className="grid grid-cols-5 gap-2"
            role="group"
            aria-labelledby="category-color-label"
          >
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                aria-label={`Theme colour ${c}`}
                aria-pressed={color === c}
                className={`h-8 border-2 transition-transform ${
                  color === c
                    ? 'border-ink scale-110 shadow-lg ring-2 ring-white/50'
                    : 'border-black/50 hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}
