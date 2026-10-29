import { useState, useCallback } from 'react'
import PixelIcon from '../components/ui/PixelIcon'
import PixelEmoji from '../components/ui/PixelEmoji'
import Dialog from '../components/ui/Dialog'
import ActionButton from '../components/ui/ActionButton'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { useToast } from '../components/ui/Toast'
import { playClick, playCoin } from '../utils/audio'
import type { Bookmark, Folder } from '../types/tasks'

// The folder swatches used to be Tailwind-500 hexes (#6366f1, #f59e0b,
// #10b981 …) that belong to neither skin — on parchment two of them sat
// under 3:1 at the size they were drawn. These are the app's own token
// values: terracotta, jade, violet, graphite, cyan.
const DEFAULT_FOLDERS: Folder[] = [
  { id: 'all', name: 'ALL BOOKMARKS', icon: 'bookmark', color: '#b53823', tasks: [], description: '' },
  { id: 'work', name: 'WORK', icon: 'bookmark', color: '#166b56', tasks: [], description: '' },
  { id: 'personal', name: 'PERSONAL', icon: 'bookmark', color: '#7c3aed', tasks: [], description: '' },
  { id: 'tools', name: 'TOOLS', icon: 'bookmark', color: '#231f32', tasks: [], description: '' },
  { id: 'reading', name: 'READING', icon: 'bookmark', color: '#9a5b06', tasks: [], description: '' },
]

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return ''
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
}

export default function BookmarksPage() {
  const { showToast } = useToast()
  const [bookmarks, setBookmarks] = useSyncedStorage<Bookmark[]>('pixel_bookmarks', [])
  const [folders, setFolders] = useSyncedStorage<Folder[]>('pixel_bookmark_folders', DEFAULT_FOLDERS)
  const [activeFolder, setActiveFolder] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<string>('work')
  const [isScraping, setIsScraping] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showAddFolderModal, setShowAddFolderModal] = useState(false)
  const [folderPendingDelete, setFolderPendingDelete] = useState<string | null>(null)

  // Real folders (excluding 'all' virtual tab)
  const selectableFolders = folders.filter(f => f.id !== 'all')

  const fetchBookmarkTitle = async (url: string): Promise<string> => {
    try {
      const response = await fetch(
        `https://microlink.io/api?url=${encodeURIComponent(url)}&title=true&image=false&favicon=false`
      )
      const data = await response.json()
      if (data?.title) {
        return data.title
      }
    } catch {
      // fallback
    }
    return getDomain(url)
  }

  const handleOpenAddModal = () => {
    setNewUrl('')
    setNewTitle('')
    setNewDescription('')
    const targetFolder = activeFolder === 'all' ? (selectableFolders[0]?.id || 'work') : activeFolder
    setSelectedFolderId(targetFolder)
    setShowAddModal(true)
  }

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    let urlInput = newUrl.trim()
    if (!urlInput) return

    if (!/^https?:\/\//i.test(urlInput)) {
      urlInput = 'https://' + urlInput
    }

    try {
      new URL(urlInput)
    } catch {
      showToast('Please enter a valid URL (e.g. https://github.com)', 'error')
      return
    }

    let finalTitle = newTitle.trim()
    if (!finalTitle) {
      setIsScraping(true)
      finalTitle = await fetchBookmarkTitle(urlInput)
      setIsScraping(false)
    }

    const newBookmark: Bookmark = {
      id: generateId(),
      title: finalTitle || getDomain(urlInput),
      url: urlInput,
      favicon: getFaviconUrl(urlInput),
      categoryId: selectedFolderId || selectableFolders[0]?.id || 'work',
      description: newDescription.trim(),
      createdAt: Date.now(),
    }

    setBookmarks(prev => [newBookmark, ...prev])
    setShowAddModal(false)
    showToast(`"${newBookmark.title}" saved!`, 'success')
  }

  const deleteBookmark = useCallback(
    (id: string) => {
      const index = bookmarks.findIndex(b => b.id === id)
      if (index === -1) return
      const removed = bookmarks[index]
      setBookmarks(prev => prev.filter(b => b.id !== id))
      showToast('Bookmark deleted', 'warn', {
        label: 'UNDO',
        onClick: () =>
          setBookmarks(prev =>
            prev.some(b => b.id === id) ? prev : [...prev.slice(0, index), removed, ...prev.slice(index)],
          ),
      })
    },
    [bookmarks, setBookmarks, showToast],
  )

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      showToast('URL copied to clipboard! 📋', 'success')
    } catch {
      // The old code never awaited the write, so it reported success even when
      // the copy failed (e.g. on a non-secure origin).
      showToast('Could not copy — your browser blocked the clipboard', 'error')
    }
  }

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newFolderName.trim()
    if (!name) return

    // New folders get a colour from the app's own palette, not from a
    // Tailwind scale that belongs to neither theme.
    const colors = ['#b53823', '#166b56', '#7c3aed', '#231f32', '#9a5b06', '#166b56', '#b53823']
    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name: name.toUpperCase(),
      icon: 'bookmark',
      color: colors[folders.length % colors.length],
      tasks: [],
      description: '',
    }

    setFolders(prev => [...prev, newFolder])
    setNewFolderName('')
    setShowAddFolderModal(false)
    showToast(`Folder "${newFolder.name}" added`, 'success')
  }

  const deleteFolder = (folderId: string) => {
    if (folderId === 'all') return
    // The old message said "kept in general list", but the code below
    // reassigns the bookmarks to the WORK folder. A wrong confirmation is
    // worse than no confirmation.
    // A native `confirm()` used to sit here: it ignored the theme, blocked
    // the UI and announced nothing useful. This opens the app's own dialog.
    setFolderPendingDelete(folderId)
  }

  const confirmDeleteFolder = () => {
    const folderId = folderPendingDelete
    if (!folderId) return
    setFolderPendingDelete(null)
    {
      const removedFolder = folders.find(f => f.id === folderId)
      const movedBookmarks = bookmarks.filter(b => b.categoryId === folderId)
      setFolders(prev => prev.filter(f => f.id !== folderId))
      setBookmarks(prev => prev.map(b => (b.categoryId === folderId ? { ...b, categoryId: 'work' } : b)))
      if (activeFolder === folderId) setActiveFolder('all')
      showToast('Folder deleted', 'warn', {
        label: 'UNDO',
        onClick: () => {
          if (removedFolder) setFolders(prev => [...prev, removedFolder])
          setBookmarks(prev =>
            prev.map(b =>
              movedBookmarks.find(m => m.id === b.id) ? { ...b, categoryId: folderId } : b,
            ),
          )
          setActiveFolder(folderId)
        },
      })
    }
  }

  const activeBookmarks = activeFolder === 'all'
    ? bookmarks
    : bookmarks.filter(b => b.categoryId === activeFolder)

  const getFolderName = (catId: string) => {
    return folders.find(f => f.id === catId)?.name || 'GENERAL'
  }

  const getFolderColor = (catId: string) => {
    return folders.find(f => f.id === catId)?.color || '#b53823'
  }

  return (
    <div className="flex flex-col h-full bg-app-bg text-ink overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-app-deep border-b-4 border-line">
        <div className="min-w-0">
          <h1 className="font-pixel text-xs md:text-sm text-accent pixel-shadow flex flex-wrap items-center gap-2.5">
            <PixelIcon name="bookmark" size={22} className="shrink-0" />
            <span className="min-w-0">TABS &amp; BOOKMARKS MANAGER</span>
          </h1>
          <p className="font-pixel text-label text-muted mt-1">
            {activeBookmarks.length} {activeBookmarks.length === 1 ? 'BOOKMARK' : 'BOOKMARKS'} SAVED IN {folders.find(f => f.id === activeFolder)?.name || 'CURRENT VIEW'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAddFolderModal(true)}
            className="font-pixel text-caption px-2.5 py-2 bg-surface hover:bg-hover-fill border-2 border-line text-muted hover:text-ink transition-colors flex items-center gap-1 pixel-border"
          >
            <PixelIcon name="plus" size={10} />
            <span>+ FOLDER</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="font-pixel text-caption px-3.5 py-2 bg-accent hover:bg-accent-hot border-2 border-accent-hot text-on-accent transition-all flex items-center gap-1.5 pixel-border active:scale-95"
          >
            <PixelIcon name="plus" size={11} />
            <span>ADD BOOKMARK</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Folders Sidebar */}
        <div className="w-full md:w-56 bg-surface/40 border-b-2 md:border-b-0 md:border-r-4 border-line flex flex-col shrink-0">
          <div className="p-2 border-b-2 border-line flex items-center justify-between">
            <span className="font-pixel text-label text-muted">COLLECTIONS</span>
          </div>

          {/* On mobile the collection list wraps into a two-up grid instead of
              a single horizontal strip: a strip forced long folder names
              ("READING AND RESEARCH MATERIALS") to run off the right edge of
              the phone. Desktop keeps the vertical sidebar. */}
          <nav className="flex flex-wrap md:flex-col md:flex-nowrap overflow-y-auto p-1.5 gap-1">
            {folders.map(folder => {
              const count = folder.id === 'all'
                ? bookmarks.length
                : bookmarks.filter(b => b.categoryId === folder.id).length
              const isActive = activeFolder === folder.id

              return (
                <div
                  key={folder.id}
                  className={`flex items-center justify-between px-2.5 py-2 text-caption font-pixel transition-all group w-[calc(50%-0.25rem)] md:w-auto md:shrink-0 min-w-0 ${
                    isActive
                      ? 'bg-accent/20 border-2 border-accent text-accent'
                      : 'hover:bg-app-deep border-2 border-transparent text-muted hover:text-ink'
                  }`}
                >
                  <button
                    onClick={() => setActiveFolder(folder.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left truncate cursor-pointer outline-none"
                  >
                    <span
                      className="w-2.5 h-2.5 inline-block shrink-0 border border-ink/20"
                      style={{ backgroundColor: folder.color }}
                    />
                    <span className="truncate min-w-0">{folder.name}</span>
                  </button>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <span className="font-pixel text-label opacity-60">
                      {count}
                    </span>
                    {folder.id !== 'all' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteFolder(folder.id)
                        }}
                        className="opacity-40 hover:opacity-100 focus-visible:opacity-100 hover:text-danger p-0.5 w-8 h-8 flex items-center justify-center transition-opacity"
                        title="Delete folder" aria-label="Delete folder"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Bookmarks Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border-4 border-dashed border-line p-8 text-center bg-surface/20">
              <PixelIcon name="bookmark" size={36} className="text-muted mb-3 opacity-50" />
              <h3 className="font-pixel text-body text-accent mb-1">NO BOOKMARKS HERE</h3>
              <p className="font-pixel text-label text-muted max-w-sm leading-relaxed mb-4">
                Save documentation, research links, dashboards, or daily tools with fast 1-click launchers.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="font-pixel text-caption px-3 py-2 bg-accent text-on-accent font-bold border-2 border-accent-hot hover:brightness-110"
              >
                + ADD FIRST BOOKMARK
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeBookmarks.map(bookmark => (
                <div
                  key={bookmark.id}
                  className="bg-surface border-4 border-line pixel-border p-3.5 flex flex-col justify-between hover:border-accent-2 transition-all group relative space-y-3"
                >
                  {/* Top Bar with Icon & Folder Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 bg-app-deep border-2 border-line flex items-center justify-center shrink-0 overflow-hidden p-1">
                        <img
                          src={bookmark.favicon || getFaviconUrl(bookmark.url)}
                          alt=""
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <span
                          className="font-pixel text-micro px-1 py-0.5 border"
                          style={{
                            borderColor: getFolderColor(bookmark.categoryId),
                            color: getFolderColor(bookmark.categoryId),
                          }}
                        >
                          {getFolderName(bookmark.categoryId)}
                        </span>
                        <div className="font-pixel text-label text-dim truncate max-w-[140px] mt-0.5">
                          {getDomain(bookmark.url)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteBookmark(bookmark.id)}
                      className="text-dim hover:text-danger p-1 font-pixel text-small transition-colors"
                      title="Delete bookmark" aria-label="Delete bookmark"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Title & Notes */}
                  <div className="flex-1 space-y-1">
                    <h3
                      className="font-pixel text-small text-ink group-hover:text-accent-2 transition-colors line-clamp-2 leading-relaxed"
                      title={bookmark.title}
                    >
                      {bookmark.title}
                    </h3>
                    {bookmark.description && (
                      <p className="font-pixel text-label text-muted line-clamp-2 leading-normal">
                        {bookmark.description}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-line flex items-center gap-1.5">
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => playClick()}
                      className="flex-1 font-pixel text-label py-1.5 px-2 bg-accent/20 hover:bg-accent text-accent hover:text-on-accent border border-accent transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <PixelEmoji name="rocket" size={10} />
                      <span>LAUNCH</span>
                    </a>
                    <button
                      onClick={() => {
                        playClick()
                        copyUrl(bookmark.url)
                      }}
                      className="font-pixel text-label py-1.5 px-2 bg-app-deep hover:bg-hover-fill border border-line text-muted hover:text-ink transition-colors flex items-center gap-1"
                      title="Copy URL" aria-label="Copy URL"
                    >
                      <PixelEmoji name="floppy" size={10} />
                      <span>COPY</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Bookmark Modal */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        labelledBy="bookmark-modal-title"
        panelClassName="bg-surface border-4 border-line pixel-border w-full max-w-md p-4 space-y-4"
      >
        <div className="flex items-center justify-between gap-2 border-b-2 border-line pb-2">
          <h3
            id="bookmark-modal-title"
            className="font-pixel text-body text-accent flex items-center gap-2"
          >
            <PixelEmoji name="rocket" size={16} />
            <span>SAVE NEW BOOKMARK</span>
          </h3>
          <button
            type="button"
            onClick={() => setShowAddModal(false)}
            aria-label="Close save bookmark dialog"
            className="font-pixel text-small text-muted hover:text-ink w-8 h-8 flex items-center justify-center shrink-0"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleAddBookmark} className="space-y-3 font-pixel">
          <div>
            <label htmlFor="bookmark-url" className="block text-label text-muted mb-1">
              TARGET URL *
            </label>
            <input
              id="bookmark-url"
              type="text"
              required
              autoFocus
              placeholder="https://github.com or notion.so"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full bg-app-deep border-2 border-line focus:border-accent px-2.5 py-2 text-caption text-ink outline-none"
            />
          </div>

          <div>
            <label htmlFor="bookmark-title" className="block text-label text-muted mb-1">
              TITLE (OPTIONAL - WILL AUTO-DETECT IF EMPTY)
            </label>
            <input
              id="bookmark-title"
              type="text"
              placeholder="e.g. GitHub Dashboard"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-app-deep border-2 border-line focus:border-accent px-2.5 py-2 text-caption text-ink outline-none"
            />
          </div>

          <div>
            <label htmlFor="bookmark-folder" className="block text-label text-muted mb-1">
              FOLDER CATEGORY
            </label>
            <select
              id="bookmark-folder"
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full bg-app-deep border-2 border-line focus:border-accent px-2.5 py-2 text-caption text-ink outline-none cursor-pointer"
            >
              {selectableFolders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bookmark-notes" className="block text-label text-muted mb-1">
              NOTES / DESCRIPTION (OPTIONAL)
            </label>
            <textarea
              id="bookmark-notes"
              rows={2}
              placeholder="Quick description or tags..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full bg-app-deep border-2 border-line focus:border-accent px-2.5 py-2 text-caption text-ink outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-3 py-2 border-2 border-line text-caption text-muted hover:text-ink"
            >
              CANCEL
            </button>
            <ActionButton
              type="submit"
              loading={isScraping}
              loadingLabel="SAVING…"
              disabled={!newUrl.trim()}
              className="px-4 py-2 bg-success text-on-accent-2 font-bold border-2 border-success text-caption hover:brightness-110 disabled:opacity-50"
            >
              SAVE BOOKMARK
            </ActionButton>
          </div>
        </form>
      </Dialog>

      {/* Add Folder Modal */}
      <Dialog
        isOpen={showAddFolderModal}
        onClose={() => setShowAddFolderModal(false)}
        labelledBy="folder-modal-title"
        panelClassName="bg-surface border-4 border-line pixel-border w-full max-w-sm p-4 space-y-4 font-pixel"
      >
        <div className="flex items-center justify-between gap-2 border-b-2 border-line pb-2">
          <h3 id="folder-modal-title" className="text-body text-accent flex items-center gap-1.5">
            <PixelIcon name="folder" size={14} />
            <span>NEW FOLDER</span>
          </h3>
          <button
            type="button"
            onClick={() => setShowAddFolderModal(false)}
            aria-label="Close new folder dialog"
            className="text-small text-muted hover:text-ink w-8 h-8 flex items-center justify-center shrink-0"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleAddFolder} className="space-y-3">
          <div>
            <label htmlFor="folder-name" className="block text-label text-muted mb-1">
              FOLDER NAME *
            </label>
            <input
              id="folder-name"
              type="text"
              required
              autoFocus
              placeholder="e.g. DOCS or DESIGN"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-app-deep border-2 border-line focus:border-accent px-2.5 py-2 text-caption text-ink outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setShowAddFolderModal(false)}
              className="px-3 py-2 border-2 border-line text-caption text-muted hover:text-ink"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!newFolderName.trim()}
              className="px-3 py-2 bg-accent text-on-accent font-bold border-2 border-accent-hot text-caption hover:brightness-110 disabled:opacity-50"
            >
              CREATE FOLDER
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Folder Confirmation — themed, focus-trapped, Escape-closable */}
      <Dialog
        isOpen={folderPendingDelete !== null}
        onClose={() => setFolderPendingDelete(null)}
        labelledBy="delete-folder-title"
        panelClassName="bg-surface border-4 border-line pixel-border w-full max-w-md p-4 space-y-4"
      >
        <h3 id="delete-folder-title" className="font-pixel text-body text-danger flex items-center gap-2">
          <PixelEmoji name="warning" size={16} />
          <span>DELETE FOLDER?</span>
        </h3>
        <p className="font-pixel text-caption text-muted leading-relaxed">
          {folders.find(f => f.id === folderPendingDelete)?.name || 'THIS FOLDER'} WILL BE REMOVED.
          ITS BOOKMARKS ARE MOVED TO WORK.
        </p>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setFolderPendingDelete(null)}
            className="font-pixel text-caption px-3 py-2 border-2 border-line text-muted hover:text-ink min-h-8"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={confirmDeleteFolder}
            className="font-pixel text-caption px-3 py-2 bg-danger text-on-danger border-2 border-danger font-bold min-h-8 hover:brightness-110"
          >
            DELETE
          </button>
        </div>
      </Dialog>
    </div>
  )
}
