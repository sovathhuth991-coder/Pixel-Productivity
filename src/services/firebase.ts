// Firebase client bootstrap — lazily loaded.
//
// This module deliberately contains no static `firebase/*` runtime imports.
// The shell imports `SyncProvider`, which imports this file, so a static
// import here would put ~150 KB of Auth + Firestore in the first paint for
// every visitor — including the local-only ones who never sign in. The SDK
// is fetched by `loadFirebase()` only when a real config is present.
//
// The safe gate is unchanged: with no real API key in the environment,
// `isFirebaseConfigured()` returns false and the app behaves exactly as
// before (localStorage only).

import type { FirebaseApp } from 'firebase/app'
import type { Auth, User } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { firestoreApi } from './cloud'
import { initAppCheck } from './appCheck'

export interface FirebaseConfigShape {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
}

export const firebaseConfig: FirebaseConfigShape = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'dpomodoro-f7b6c.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'dpomodoro-f7b6c',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'dpomodoro-f7b6c.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MSG_SENDER_ID ?? '363730407667',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:363730407667:web:5861c1bcdf6fcb6a1c2786',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-J1Y8Z38HMC',
}

export function isFirebaseConfigured(): boolean {
  // The app runs ungated (localStorage-only) until a real Web App API key is
  // provided in VITE_FIREBASE_API_KEY. Real Firebase web API keys start with
  // "AIzaSy" and are 39 chars; placeholders are left inert.
  const key = firebaseConfig.apiKey || ''
  return key.startsWith('AIzaSy') && key.length >= 39
}

export interface FirebaseRuntime {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let runtimePromise: Promise<FirebaseRuntime> | null = null

/**
 * Load and initialize the SDK once.
 *
 * Rejects when no real config is present, so callers never accidentally
 * initialize Firebase against a placeholder key.
 */
export function loadFirebase(): Promise<FirebaseRuntime> {
  if (!isFirebaseConfigured()) {
    return Promise.reject(new Error('Firebase is not configured'))
  }
  if (!runtimePromise) {
    runtimePromise = Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      firestoreApi(),
    ])
      .then(([appApi, authApi, firestore]) => {
        const app = appApi.getApps()[0] || appApi.initializeApp(firebaseConfig)
        return {
          app,
          auth: authApi.getAuth(app),
          db: firestore.getFirestore(app),
        }
      })
      .then((runtime) => {
        // App Check attaches to the app and makes the backend require a token
        // that only a genuine instance of this app can produce — without it,
        // the public Web API key is enough to use the project from a script.
        // It is opt-in (no site key = no-op) and never blocks startup.
        void initAppCheck(runtime.app)
        return runtime
      })
      .catch((error) => {
        // A transient chunk/network failure must be retryable on the next
        // sign-in attempt rather than cached forever.
        runtimePromise = null
        throw error
      })
  }
  return runtimePromise
}

/** Subscribe to auth state, loading the auth SDK only when needed. */
export async function subscribeAuth(
  auth: Auth,
  cb: (user: User | null) => void,
): Promise<() => void> {
  const { onAuthStateChanged } = await import('firebase/auth')
  return onAuthStateChanged(auth, cb)
}

export async function signInWithGoogle(auth: Auth): Promise<User> {
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
  const provider = new GoogleAuthProvider()
  // Restrict to selectable accounts so a shared account always picks the right one.
  provider.setCustomParameters({ prompt: 'select_account' })
  const res = await signInWithPopup(auth, provider)
  return res.user
}

export function signOutUser(auth: Auth): Promise<void> {
  return import('firebase/auth').then(({ signOut }) => signOut(auth))
}
