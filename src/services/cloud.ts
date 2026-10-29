// Lazy access to the Firestore SDK.
//
// `firebase/firestore` is ~150 KB gzipped and was in the first download for
// every visitor, including the local-only ones who never sign in. Importing
// it through this cache keeps it out of the shell chunk: the module is only
// fetched when a signed-in user actually reads or writes a document.

type FirestoreModule = typeof import('firebase/firestore')

let firestorePromise: Promise<FirestoreModule> | null = null

export function firestoreApi(): Promise<FirestoreModule> {
  if (!firestorePromise) {
    firestorePromise = import('firebase/firestore').catch((error) => {
      // Do not cache a failed load, or a transient network error would
      // disable cloud sync for the rest of the session.
      firestorePromise = null
      throw error
    })
  }
  return firestorePromise
}
