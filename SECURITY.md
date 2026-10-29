# Security runbook

This is a **personal, single-owner** deployment. It is not designed for public
sign-up or multi-tenant use.

## What is public (and what is not)

- `https://dpomodoro-f7b6c.web.app` and its login screen are public.
- The Firebase project ID and web API key are embedded in the client bundle.
  That is normal: a Firebase web API key identifies the project, it does not
  grant access. Firestore rules are the access control.
- Your Gmail password is never sent to this app. Google Sign-In uses OAuth; the
  app receives only an ID token with basic profile/email claims.
- Your tasks, bookmarks and history stay behind Firebase Auth + Firestore rules.
- Local browser storage is **not encrypted**. Anyone who can open your unlocked
  browser profile can read it, so use full-disk encryption and the
  **Sign out & clear device** button on shared machines.

## One-time setup: lock Firestore to your account

The rules in `firestore.rules` require **both** a matching Firebase UID and a
document at `owners/{uid}`. A random Google account that signs in cannot read
or write your data.

1. Deploy the current rules:

   ```bash
   npm run deploy
   ```

2. Open the app, sign in with Google, go to **Settings → Cloud Sync**, and copy
   the **ACCOUNT ID** shown under your email.

3. In the Firebase console → **Firestore Database** → **Start collection**:
   - Collection ID: `owners`
   - Document ID: paste your UID
   - Field: `enabled` (boolean) = `true`
   - Save.

4. Reload the app and confirm sync works. If you skip step 3, every Firestore
   read/write is denied — the app still works locally, but nothing syncs.

To revoke a device/account later, delete its `owners/{uid}` document. To add a
trusted second account, create a matching document for its UID.

### If sync shows an error after deploying

That is almost always the missing `owners/{uid}` document. Create it in the
console (console writes bypass the rules), then reload.

## Firebase console checklist

- **Authentication → Sign-in method**: enable Google only. Disable Email/Password.
- **Authentication → Settings → User actions**: enable **Email enumeration
  protection**.
- **Authentication → Settings → Authorized domains**: keep only
  `dpomodoro-f7b6c.web.app`, `dpomodoro-f7b6c.firebaseapp.com` and `localhost`
  (for development).
- **Firestore → Rules**: confirm the deployed rules match `firestore.rules`.
  Use the Rules Playground to verify an unauthenticated read is denied.
- **App Check** (optional but recommended): register the web app with
  reCAPTCHA v3, then enforce it for Firestore once you see healthy traffic.
- **Usage and billing**: set a budget alert so account/quota abuse cannot run
  up a bill silently.

## Google Cloud API key restrictions

In Google Cloud Console → APIs & Services → Credentials → the browser key:

- **Application restrictions**: HTTP referrers, limited to
  `https://dpomodoro-f7b6c.web.app/*` and
  `https://dpomodoro-f7b6c.firebaseapp.com/*` (add `http://localhost:3000/*`
  only while developing).
- **API restrictions**: Identity Toolkit API, Cloud Firestore API, Token
  Service API. Test Google sign-in after saving; an over-restricted key makes
  Auth fail.
- The API key is still not a secret. The restrictions reduce abuse from other
  origins; they do not replace rules.

## Google account

This is the most important control, because it protects everything:

- Enable 2-Step Verification or passkeys.
- Review **Security → Third-party access** and remove apps you no longer use.
- Use a unique password/passkey; never reuse the Gmail password elsewhere.
- If you also created a Firebase email/password account with the same address,
  remember Google 2FA does **not** protect that password. Prefer Google-only.

## What the code already enforces

- **Bookmark URLs**: only `http:`/`https:` are accepted on add, on backup
  import, and again at render time. `javascript:`/`data:` URLs are rejected
  (`src/utils/url.ts`).
- **Rendering**: external links use `rel="noopener noreferrer"`; bookmark
  text is rendered as text (React escaping), not HTML.
- **No third-party bookmark metadata**: title lookups no longer send URLs to
  Microlink, and favicons load from the bookmarked site rather than Google.
- **Account switching**: signing in with a different account clears the local
  cache before the app renders; sign-out-and-clear removes local data without
  deleting the cloud copy.
- **Hosting headers**: CSP (no inline script), HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  `X-Robots-Tag: noindex`, and no-store for `index.html`.
- **No source maps** in the production build.
- **No secrets in Git**: `.env`, service-account JSON and key files are ignored;
  the client only contains the public Firebase web config.

## Dependency hygiene

`npm audit` findings are mostly transitive packages inside Firebase's Node
tooling (`undici`, `@grpc/grpc-js`); the browser does not execute those Node
networking paths. Re-check after Firebase upgrades, and run:

```bash
npm audit --omit=dev
```

Remove unused packages rather than leaving them in the dependency tree. Keep
`package-lock.json` committed and review Dependabot PRs.

## What is not protected

- A compromised **device** or malicious browser extension can read local
  storage and the signed-in session. Sign out and clear the device if you lend
  it.
- A malicious **Firebase project collaborator** can change rules. Keep project
  access to yourself and enable 2FA on the Google account.
- A **phishing site** can imitate the login screen. Check the URL before
  signing in; Google OAuth will show the app name and scopes.
- Firestore data is encrypted at rest by Google, but it is not end-to-end
  encrypted: Google and anyone with your account can read it. Do not store
  secrets, recovery codes or passwords in tasks/bookmarks.
- Backups are plaintext JSON. Store them in an encrypted archive, not in a
  public cloud folder.

## Incident response

If you suspect the account or project was accessed:

1. Google Account → Security → sign out of all devices; change the password;
   revoke third-party access.
2. Firebase Console → Authentication → Users: remove unknown accounts.
3. Firestore → Rules: re-check the rules and the `owners` documents.
4. Firestore → Usage: look for unexpected reads/writes; check the billing alert.
5. Export a backup from Settings, inspect it, then rotate any credentials that
   were stored in task/bookmark text.
6. If a service-account key was ever committed or shared, delete it in Google
   Cloud and create a new one.
