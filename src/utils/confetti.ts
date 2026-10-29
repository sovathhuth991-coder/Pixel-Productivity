import confetti from 'canvas-confetti'
import type { DesignMode } from '../context/DesignModeContext'

/** Celebration colours per skin, so the burst belongs to the active theme. */
const CONFETTI_COLORS: Record<DesignMode, string[]> = {
  commander: ['#e94560', '#4ecdc4', '#ffeaa7', '#2ed573'],
  'pixel-center': ['#b53823', '#166b56', '#fde047', '#1f7a3d'],
}

interface CelebrationOptions {
  particleCount?: number
  spread?: number
  origin?: { x?: number; y?: number }
}

/**
 * Fire the celebration burst.
 *
 * canvas-confetti draws to a canvas from JS, so the `html.stop-animations`
 * CSS rule cannot suppress it — a user who asked for reduced motion still
 * got a full-screen particle burst on every task completion. This gate is
 * the only thing that actually honours the preference.
 */
export function fireCelebration(
  mode: DesignMode,
  animationsEnabled: boolean,
  options: CelebrationOptions = {},
): void {
  if (!animationsEnabled) return
  try {
    confetti({
      particleCount: options.particleCount ?? 25,
      spread: options.spread ?? 45,
      origin: options.origin ?? { y: 0.8 },
      colors: CONFETTI_COLORS[mode],
    })
  } catch {
    // A celebration is never worth breaking the app over.
  }
}
