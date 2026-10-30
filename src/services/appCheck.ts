// Optional Firebase App Check.
//
// The Firebase **Web** API key is not a secret — it ships inside the JS
// bundle and anyone who opens the deployed app can read it. What keeps a
// stranger out of the project is the Firestore rules (which already require
// an entry in the console-only `/owners` collection), but the rules do not
// stop someone from *using* the project: with the public key they can call
// the Auth API directly, create accounts, and burn the project's quota.
//
// App Check closes that. The backend then requires a token that only a
// genuine instance of this app can obtain, so a script with the API key
// gets nothing.
//
// It is opt-in because it needs a reCAPTCHA v3 site key that is created in
// the Firebase console. With no key configured this module does nothing and
// the app behaves exactly as before.

import type { FirebaseApp } from 'firebase/app'

let initialized = false

/**
 * Turn on App Check if a site key is configured.
 *
 * Never throws: a broken or misconfigured App Check must not take the app
 * down with it. If the console has App Check *enforced* and the client
 * cannot obtain a token, the backend rejects the requests — that is the
 * console's decision to make, and SECURITY.md covers the rollout order.
 */
export async function initAppCheck(app: FirebaseApp): Promise<boolean> {
  if (initialized) return true

  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY
  if (!siteKey) return false

  try {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check')
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    })
    initialized = true
    return true
  } catch (error) {
    console.warn('App Check could not be initialised; continuing without it:', error)
    return false
  }
}
