// Simple audio utility using Web Audio API for retro sound effects
// Handles AudioContext gesture unlock for mobile Safari/Chrome

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const Ctor = (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext
    audioContext = new Ctor()
  }
  return audioContext
}

const MUTE_STORAGE_KEY = 'pixel_sound_muted'

export function isAudioMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setAudioMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? 'true' : 'false')
  } catch {
    // Ignore storage errors
  }
}

export function toggleAudioMuted(): boolean {
  const next = !isAudioMuted()
  setAudioMuted(next)
  return next
}

// Handle AudioContext resume - needed for mobile gesture unlock
function ensureAudioContextUnlocked(): Promise<AudioContext> {
  return new Promise((resolve) => {
    const ctx = getAudioContext()
    
    // If context is suspended (awaiting user gesture), resume it
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => resolve(ctx))
    } else {
      resolve(ctx)
    }
  })
}

function isPixelCenterMode(): boolean {
  try {
    return localStorage.getItem('design-mode') === 'pixel-center'
  } catch {
    return false
  }
}

export async function playBeep() {
  if (isAudioMuted()) return
  
  try {
    const ctx = await ensureAudioContextUnlocked()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    const center = isPixelCenterMode()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    oscillator.type = center ? 'triangle' : 'square'
    oscillator.frequency.setValueAtTime(center ? 660 : 440, ctx.currentTime)
    oscillator.frequency.setValueAtTime(center ? 880 : 660, ctx.currentTime + (center ? 0.03 : 0.05))
    
    gainNode.gain.setValueAtTime(center ? 0.06 : 0.1, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (center ? 0.1 : 0.15))
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + (center ? 0.1 : 0.15))
  } catch (e) {
    // Audio not available or gesture required
  }
}

export async function playComplete() {
  if (isAudioMuted()) return
  
  try {
    const ctx = await ensureAudioContextUnlocked()
    
    const center = isPixelCenterMode()
    const notes = center
      ? [659.25, 783.99, 987.77] // E5, G5, B5
      : [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    const step = center ? 0.08 : 0.12
    const wave: OscillatorType = center ? 'sine' : 'square'
    
    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.type = wave
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * step)
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime + i * step)
      gainNode.gain.linearRampToValueAtTime(center ? 0.05 : 0.08, ctx.currentTime + i * step + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * step + (center ? 0.14 : 0.2))
      
      oscillator.start(ctx.currentTime + i * step)
      oscillator.stop(ctx.currentTime + i * step + (center ? 0.14 : 0.2))
    })
  } catch (e) {
    // Audio not available or gesture required
  }
}

export async function playModeSwitch() {
  if (isAudioMuted()) return
  
  try {
    const ctx = await ensureAudioContextUnlocked()
    
    const notes = isPixelCenterMode()
      ? [659.25, 523.25, 440, 329.63]
      : [329.63, 440, 523.25, 659.25]
    
    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.type = isPixelCenterMode() ? 'triangle' : 'sawtooth'
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08)
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.08)
      gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.08 + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.15)
      
      oscillator.start(ctx.currentTime + i * 0.08)
      oscillator.stop(ctx.currentTime + i * 0.08 + 0.15)
    })
  } catch (e) {
    // Audio not available or gesture required
  }
}

export async function playCoin() {
  if (isAudioMuted()) return
  try {
    const ctx = await ensureAudioContextUnlocked()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = isPixelCenterMode() ? 'sine' : 'square'
    osc.frequency.setValueAtTime(987.77, ctx.currentTime) // B5
    osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08) // E6
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch (e) {}
}

export async function playStart() {
  if (isAudioMuted()) return
  try {
    const ctx = await ensureAudioContextUnlocked()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = isPixelCenterMode() ? 'triangle' : 'square'
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch (e) {}
}

export async function playClick() {
  if (isAudioMuted()) return
  try {
    const ctx = await ensureAudioContextUnlocked()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    gain.gain.setValueAtTime(0.04, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.04)
  } catch (e) {}
}

// Expose context creation for explicit user gesture handling
export function unlockAudioContext(): AudioContext {
  return getAudioContext()
}