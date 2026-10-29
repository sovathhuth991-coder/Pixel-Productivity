import type { DesignMode } from '../../context/DesignModeContext'

/**
 * The neutral ramp of the sprite palette. Each skin gets its own ramp so the
 * greyscale detail pixels keep their ordering and stay legible against the
 * background: dark skin needs a dark ramp, parchment skin needs a mid ramp.
 * Saturated hues in the palettes are left alone — they read on both.
 *
 * Shared by both sprite libraries (`PixelEmoji` and `PixelIcon`) so that a
 * concept that appears in both — the clipboard, the gear, the tomato — is
 * drawn in the same colours wherever it is used.
 */
export const SPRITE_THEME: Record<DesignMode, Record<string, string>> = {
  commander: {
    ink: '#0f172a',
    dark: '#334155',
    mid: '#64748b',
    light: '#cbd5e1',
    hi: '#ffffff',
  },
  'pixel-center': {
    ink: '#231f32',
    dark: '#3a3450',
    mid: '#5d5670',
    light: '#837b96',
    hi: '#ffffff',
  },
}

/**
 * Resolve a sprite palette against the active theme.
 *
 * A palette entry that starts with `$` is a theme slot (`$ink`, `$dark`,
 * `$mid`, `$light`, `$hi`); everything else is a literal colour.
 */
export function resolveSpritePalette(
  palette: Record<string, string>,
  mode: DesignMode,
): Record<string, string> {
  const theme = SPRITE_THEME[mode]
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(palette)) {
    out[key] = value.charCodeAt(0) === 36 ? (theme[value.slice(1)] ?? value) : value
  }
  return out
}
