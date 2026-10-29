import type { Bookmark, Folder } from '../types/tasks'

/**
 * Normalize a user-entered bookmark URL and reject anything that is not HTTP(S).
 *
 * This is the security boundary for bookmarks: a stored `javascript:` URL
 * would be rendered into an `<a href>` later, which turns a bookmark into
 * script execution in the app's origin. Only http/https survive.
 */
export function normalizeHttpUrl(input: string): string | null {
  let raw = input.trim()
  if (!raw) return null

  // Add https:// only when the input has no scheme at all. A string that
  // already starts with "javascript:" must be parsed as-is, then rejected —
  // blindly prefixing it would turn it into a harmless-looking https URL and
  // hide the intent instead of refusing it.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`

  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname || url.hostname.includes(' ')) return null
    // Never persist credentials embedded in the URL.
    url.username = ''
    url.password = ''
    return url.toString()
  } catch {
    return null
  }
}

/** Validate a URL that is already stored (cloud, backup, older build). */
export function safeHttpUrl(input: unknown): string | null {
  if (typeof input !== 'string' || !input) return null
  try {
    const url = new URL(input)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname) return null
    return url.toString()
  } catch {
    return null
  }
}

/** Favicons may be inline data: images; everything else must be HTTP(S). */
export function safeFaviconUrl(input: unknown): string | null {
  if (typeof input !== 'string' || !input) return null
  if (input.startsWith('data:image/')) return input
  return safeHttpUrl(input)
}

export function sanitizeBookmark(raw: unknown): Bookmark | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>

  const url = normalizeHttpUrl(typeof b.url === 'string' ? b.url : '')
  if (!url) return null
  if (typeof b.id !== 'string' || !b.id) return null

  return {
    id: b.id,
    title:
      typeof b.title === 'string' && b.title.trim()
        ? b.title.slice(0, 300)
        : new URL(url).hostname.replace(/^www\./, ''),
    url,
    categoryId: typeof b.categoryId === 'string' && b.categoryId ? b.categoryId : 'work',
    favicon: safeFaviconUrl(b.favicon) ?? '',
    description: typeof b.description === 'string' ? b.description.slice(0, 2000) : '',
    createdAt:
      typeof b.createdAt === 'number' && Number.isFinite(b.createdAt)
        ? b.createdAt
        : Date.now(),
    thumbnail: safeHttpUrl(b.thumbnail) ?? undefined,
  }
}

export function sanitizeBookmarks(raw: unknown): Bookmark[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => sanitizeBookmark(item))
    .filter((item): item is Bookmark => item !== null)
}

export function sanitizeFolder(raw: unknown): Folder | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Record<string, unknown>
  if (typeof f.id !== 'string' || !f.id) return null
  if (typeof f.name !== 'string' || !f.name.trim()) return null

  return {
    id: f.id,
    name: f.name.slice(0, 100),
    icon: typeof f.icon === 'string' ? f.icon : 'bookmark',
    color:
      typeof f.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(f.color)
        ? f.color
        : '#b53823',
    tasks: sanitizeBookmarks(f.tasks),
    description: typeof f.description === 'string' ? f.description.slice(0, 500) : '',
  }
}

export function sanitizeFolders(raw: unknown): Folder[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => sanitizeFolder(item))
    .filter((item): item is Folder => item !== null)
}
