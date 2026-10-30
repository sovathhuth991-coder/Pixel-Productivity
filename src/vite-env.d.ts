/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MSG_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID: string
  readonly VITE_OBSIDIAN_VAULT_PATH?: string
  /** reCAPTCHA v3 site key for Firebase App Check. Optional — see SECURITY.md. */
  readonly VITE_FIREBASE_APPCHECK_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
