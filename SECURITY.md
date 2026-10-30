# Security

How this app is protected, what is actually left to you, and what to do in
the Firebase console.

## The short version

**Your task data is not reachable by anyone who finds the URL.** The Firestore
rules do not trust "signed in" — they require the account to also have a
document in a console-only `/owners` collection. A stranger who signs in with
their own Google account gets an empty app and cannot read or write a single
byte of yours.

**Your Gmail address is never exposed to the app.** The app only offers
"Continue with Google" (a Firebase popup). There is no password field
anywhere in the codebase, so there is no password for a phisher to steal and
no credential to leak from a breach of this app.

**The API key in `.env` is not a secret.** Firebase Web API keys ship inside
the JavaScript bundle by design — anyone who opens the app can read it. The
key is not what protects your data; the rules are. What an unrestricted key
*does* let a stranger do is use your Firebase project (create accounts, burn
quota), which is what App Check and API key restrictions close.

## Already in place

| Control | Where |
|---|---|
| Owner allowlist — a UID needs a `/owners/{uid}` document to read or write anything | `firestore.rules` |
| `/owners` is console-only (`allow read, write: if false`) | `firestore.rules` |
| Write key allowlist — only 9 known keys can be written | `firestore.rules` |
| Envelope validation — only `{value, updatedAt, nonce}`, `updatedAt` must be a timestamp | `firestore.rules` |
| Google sign-in only, no password path | `src/services/firebase.ts` |
| Strict CSP: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, no `unsafe-eval` | `firebase.json` |
| HSTS (preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (camera/mic/geo/payment off), `Cross-Origin-Opener-Policy` | `firebase.json` |
| `X-Robots-Tag: noindex, nofollow` — search engines will not index the site | `firebase.json` |
| Bookmark URLs restricted to http/https; `javascript:` and `data:` rejected; credentials stripped from stored URLs | `src/utils/url.ts` |
| Vault folder handle never destroyed by a failed permission check | `src/utils/obsidian-archive.ts` |
| App shell is not painted with another account's cached data | `src/components/SyncGate.tsx` |
| `.env` is gitignored | `.gitignore` |

## What you still have to do in the console

These cannot be done from code. Each one is a few clicks.

### 1. Restrict the API key (do this first)

Google Cloud console → **APIs & Services → Credentials** → your *Browser API
Key* → **Edit**:

- **Application restrictions** → *HTTP referrers (web sites)* → add
  `dpomodoro-f7b6c.web.app/*`, `https://dpomodoro-f7b6c.firebaseapp.com/*`,
  and `http://localhost:3000/*` for local development.
- **API restrictions** → *Restrict key* → add **Identity Toolkit API** (for
  sign-in) and **Cloud Firestore API**. Remove the rest.

With referrers restricted, a copy of your key used from another site is
rejected by Google before it ever reaches your project.

### 2. Turn on App Check

App Check is what stops a *script* from using the project even with the key.
The code support is already in `src/services/appCheck.ts` and is inert until
a site key is present.

> **Before anything else:** `firebase/app-check` ships inside the `firebase`
> package, but the subpath only exists after a *complete* install. If the
> build fails with `Failed to resolve import "firebase/app-check"`, or
> `npm run lint` reports `Cannot find module 'firebase/app-check'`, your
> `node_modules` is incomplete — run `npm install` (ideally with the project
> outside OneDrive; see below). The Vite config keeps the subpath external
> when no site key is set, so the *build* survives either way, but the
> type check does not.

1. Firebase console → **App Check** → register the web app → choose
   **reCAPTCHA v3** → create the key → copy the **site key**.
2. Put it in `.env`: `VITE_FIREBASE_APPCHECK_SITE_KEY=<site key>` (and in
   `.env.example` as a placeholder).
3. Deploy and confirm sign-in and sync still work.
4. Only then, in App Check → **Enforce**.

For local development, App Check needs a debug token: run the app with
`?appCheckDebugToken=<token>` in the URL, or set the token in localStorage as
`firebase.appCheck.debugToken`, with the token printed by the App Check
console.

The existing CSP already allows reCAPTCHA v3 (`www.google.com` and
`www.gstatic.com` are in `script-src`).

### 3. Check the authorized domains

Firebase console → **Authentication → Settings → Authorized domains**. It
should contain only `dpomodoro-f7b6c.web.app`, `dpomodoro-f7b6c.firebaseapp.com`,
and `localhost`. Remove anything else — this list is what stops a phishing
site from opening a Google popup that looks like yours.

### 4. Turn off the email/password provider

The app only signs in with Google. In **Authentication → Sign-in method**,
if *Email/Password* is enabled, **disable it**. An unused provider is an
unused way in: with it on, anyone could register an account using your email
address, and the app would then show "email already in use" when you tried to
sign in with a password.

### 5. Confirm the owner document exists

Firestore → the `owners` collection → a document whose ID is your account
UID (`Settings → Cloud Sync → ACCOUNT ID → COPY`) with `enabled = true`.
Without it, *nothing* syncs — that is the intended fail-closed behaviour,
but it is worth checking that the sync is actually working.

### 6. The public GitHub repo reveals the URL

`github.com/sovathhuth991-coder/Pixel-Productivity` is **public**, and it
contains the project id, from which the `web.app` URL follows. The repo holds
no secrets (`.env` is ignored and the tracked `.env.example` is a
placeholder), but if you would rather the URL were not derivable, make the
repository private or drop the live URL from the README.

## Do not keep the checkout inside OneDrive

This is the one environment issue that turned into real damage.

OneDrive syncs `.git` and `node_modules` like any other folder, and it can
drop files while it does. It has already happened here:

- `.git` lost 16 blobs and 3 tree objects, so `git diff` and `git restore`
  failed outright and a deleted tracked file could not be brought back.
- `node_modules` is missing files: `@firebase/app-check` has only its
  `package.json`, and `firebase/app-check/` is empty. Several other
  `@firebase/*` packages are in the same state.

A half-synced `node_modules` is the more dangerous of the two: the build can
fail with a module that "does not exist" even though it is in `package.json`.

**Move the project out of OneDrive** (a plain folder on `C:\` is fine), then:

```
rm -rf node_modules
npm install
```

`package-lock.json` is intact, so a clean install restores exactly the
versions this project was built against. `node_modules/` and `.git/` should
also be excluded from any further file-sync service.

## The local Obsidian gateway
The gateway (`http://localhost:5789` by default) is an HTTP server on your
own machine that writes into your Obsidian vault. Two things to get right on
*that* side — the app can only send the credential, it cannot enforce it:

1. **Bind to `127.0.0.1`, not `0.0.0.0`.** On `0.0.0.0` anyone on the same
   Wi-Fi can reach it.
2. **Require the shared secret.** The app sends it in the
   `X-Pixel-Gateway-Token` header (paste it into *Settings → Obsidian
   Integration → Gateway Token*). Without this, *any* website you visit can
   POST to your gateway and write files into your vault — the page cannot
   read the token out of this app, so the secret is what stops it.
3. **Validate the `Origin` header** as well, for defence in depth.

The gateway URL is in the CSP's `connect-src` so the feature works from the
deployed site. Note that `upgrade-insecure-requests` does not touch
`localhost` (it is a potentially-trustworthy origin), so the plain `http://`
call still works.

## If you find a vulnerability

This is a personal, single-account project, so there is no disclosure
process to speak of. If something looks wrong, treat it as a bug: open an
issue on the repository, or — since the repository is public and you own it —
just fix it.
