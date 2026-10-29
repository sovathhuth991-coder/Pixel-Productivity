// Firebase client bootstrap.
//
// This app ships with a *safe* config: if no real API key is present in the
// environment, `isFirebaseConfigured()` returns false and every sync feature
// silently deactivates — the app behaves exactly as before (localStorage only).
// Flip in a real Web App config (from Firebase console > Project settings)
// and the cloud features come alive.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

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

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null
let initError: Error | null = null

export function isFirebaseConfigured(): boolean {
  // The app runs ungated (localStorage-only) until a real Web App API key is
  // provided in VITE_FIREBASE_API_KEY. Real Firebase web API keys start with
  // "AIzaSy" and are 39 chars; placeholders are left inert.
  const key = firebaseConfig.apiKey || ''
  return key.startsWith('AIzaSy') && key.length >= 39
}

export function getFirebase(): {
  app: FirebaseApp | null
  auth: Auth | null
  db: Firestore | null
  error: Error | null
} {
  if (app) return { app, auth: authInstance, db: dbInstance, error: null }
  if (typeof window === 'undefined') return { app: null, auth: null, db: null, error: null }
  try {
    app = getApps()[0] || initializeApp(firebaseConfig)
    if (!authInstance) authInstance = getAuth(app)
    if (!dbInstance) dbInstance = getFirestore(app)
  } catch (e) {
    initError = e as Error
    app = null
    authInstance = null
    dbInstance = null
  }
  return { app, auth: authInstance, db: dbInstance, error: initError }
}

export async function signInWithGoogle(auth: Auth): Promise<User> {
  const provider = new GoogleAuthProvider()
  // Restrict to selectable accounts so a shared account always picks the right one.
  provider.setCustomParameters({ prompt: 'select_account' })
  const res = await signInWithPopup(auth, provider)
  return res.user
}

export async function signInWithEmail(
  auth: Auth,
  email: string,
  password: string,
): Promise<User> {
  const res = await signInWithEmailAndPassword(auth, email, password)
  return res.user
}

export async function createAccount(
  auth: Auth,
  email: string,
  password: string,
): Promise<User> {
  const res = await createUserWithEmailAndPassword(auth, email, password)
  return res.user
}

export function signOutUser(auth: Auth): Promise<void> {
  return signOut(auth)
}

export type AuthUnsubscribe = () => void
export function onAuthChange(auth: Auth, cb: (user: User | null) => void): AuthUnsubscribe {
  return onAuthStateChanged(auth, cb)
}
