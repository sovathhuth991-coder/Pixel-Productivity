// HTML5 Web Notifications utility.

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  try {
    const perm = await Notification.requestPermission()
    return perm === 'granted'
  } catch {
    return false
  }
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window
}

export function isNotificationGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Show a notification.
 *
 * Prefers the service-worker registration: a notification raised through the
 * worker survives the page being backgrounded and can carry the app icon and
 * badge, and it is the same path a real push message would take. Falls back
 * to the plain Notification constructor when there is no worker (the worker
 * registers in production only).
 */
export async function sendBrowserNotification(
  title: string,
  options?: NotificationOptions,
): Promise<Notification | null> {
  if (!isNotificationGranted()) return null

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          ...options,
        })
        return null
      }
    }
  } catch {
    /* fall through to the constructor */
  }

  try {
    return new Notification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      ...options,
    })
  } catch (err) {
    console.warn('Failed to send notification:', err)
    return null
  }
}
