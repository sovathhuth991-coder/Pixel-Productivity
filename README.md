# Pixel-Productivity

Pixel-art Pomodoro timer + daily task manager + Kanban + bookmarks, built with React + Vite and deployed to Firebase Hosting.

## Links
- Live app: https://dpomodoro-f7b6c.web.app
- Firebase project: `dpomodoro-f7b6c`

## Developing
```bash
npm install
npm run dev
npm run build        # production build
npx firebase deploy
```
Deploy (hosting + Firestore rules):
```bash
npx firebase deploy --only hosting,firestore
```

## Cloud sync (opt-in, non-breaking)
A per-user key/value store in Firestore at `users/{uid}/kv/{key}`. The keys that
live in the cloud are listed in `src/services/syncKeys.ts` (`SYNC_KEYS`):

| Key | What it holds |
|---|---|
| `taskmanager_tasks` | Categories and tasks |
| `taskmanager_streak` | Current / best streak |
| `taskmanager_activity` | The activity feed (last 50 entries) |
| `taskmanager_completion_history` | Completions per day |
| `pixel_report_buffer` | Every task / pomodoro event, per day |
| `pixel_pomodoro_daily` | Pomodoros per day (Stats hub) |
| `pixel_weekly_report_settings` | When the weekly save window opens |
| `pixel_bookmarks` | Saved bookmarks |
| `pixel_bookmark_folders` | Bookmark folders |

Device-local prefs (never synced): `pixel_pomodoro_settings`,
`pixel_obsidian_settings`, `design-mode`, `pixel_animations_enabled`,
`pixel_weekly_report_last_saved`, `taskmanager_freq_notif_*`, and the
per-category notes/activity written by the floating category windows.

- Safe gate: `isFirebaseConfigured()` checks for a real `AIzaSy...` key in
  `VITE_FIREBASE_API_KEY`. With no real config the app runs localStorage-only
  (no sign-in screen).
- Sign in with Google or email (`src/components/SyncAuthCard.tsx`); an account
  can also be created from the same card. On the first sign-in, local data
  that has no cloud document yet is uploaded automatically
  (`migrateLocalToCloud`), so a browser that was in use before signing in
  keeps its history. Copy `.env.example` -> `.env`, paste the real key from
  Firebase console -> Project settings -> web apps, then
  `npm run build && npx firebase deploy`.
- Firestore rules: `users/{uid}/kv/{key}` read, write if `request.auth.uid == uid`
  (see `firestore.rules`).
- Conflict model: last-write-wins by server `updatedAt`. `useSyncedStorage`
  streams cloud->local via `onSnapshot` and suppresses own writes via a nonce;
  snapshots older than the last applied one are dropped.
- Two exceptions to last-write-wins, because these are sets rather than values:
  the report buffer is a **union** of both sides, and the pomodoro history
  takes the larger count per day. The task list is last-write-wins, except on
  the very first contact with an account: a browser that held a real task list
  before signing in keeps it, instead of adopting a document another device
  created first.

### iOS notes
- Install from Safari only (Brave/Chrome iOS can't add to Home Screen).
- A PWA only receives Firestore pushes while in the **foreground**; a backgrounded
  phone won't update until reopened (Firestore cache then delivers the doc).

## Weekly report
- Save window: Sunday 22:00 -> Monday 00:00 by default (`weeklySaveDay` /
  `weeklySaveTime` in Settings -> Weekly Report). The save button is **locked**
  until the window opens. Filenames: `DD.MM.YYYY.md`, Sunday-start week.
- Reminder: a browser notification fires when the save window opens and last
  week's report hasn't been saved; an in-app banner shows while the window is open.
- The **event buffer** behind the report is synced (`pixel_report_buffer`), so
  the `.md` can be produced from any signed-in device. The **file itself** is
  written locally via the File System Access API to the Obsidian vault folder
  you pick once (handle persisted in IndexedDB) — the vault itself is not in
  the cloud.
- The buffer keeps the last 16 weeks. It is rewritten and re-uploaded in full
  on every event, so it has to stay bounded: past that it would outgrow the
  1 MiB Firestore document limit, and then the localStorage quota, and the
  report would stop recording without saying so.

## Task weekly reset
Tasks reset on a **Sunday-start** week (aligned with the weekly report), not ISO Monday:
- `frequency === 'daily'` tasks reset each new day.
- `frequency === 'weekly'` tasks reset each new Sunday.
Reset runs on app open, every 60s, and on tab focus/visibility change so a week
boundary crossed while the app was backgrounded is caught on return.

## Statistics (`/stats`)
The Stats hub shows productivity trends in 8-bit pixel-styled Recharts views. Add a
`STATS` entry (icon: chart) to the sidebar + mobile nav.
- **Daily activity (30d)** — task completions/day and pomodoros/day (dual bar chart).
- **Weekly completion % (6w)** — `(weekly completions / (daily-task count × 7))`,
  capped at 100%, bucketed on Sunday-start weeks (matches the task reset).
- **Category breakdown** — completed/total per category (progress bars + donut).
- **Streak card** — current / best streak from `useTaskManager`.

Data sources:
- `taskmanager_completion_history` (synced) for daily + weekly completions.
- `pixel_pomodoro_daily` (synced) — a `Record<YYYY-MM-DD, count>` incremented on
  each pomodoro finish in `PomodoroContext` and pruned to the last 90 days. The
  cloud copy is pruned too, and the sign-in merge prunes its result, so the
  retention window holds.
- Task/category/frequency data from `useTaskContext`.

## Streaks
Two different things, both called a streak:
- **Global** (`taskmanager_streak`) — days on which at least one task was
  completed. Breaks when a whole day passes with nothing completed.
- **Per task** — the flame badge on a task counts *consecutive* periods: days
  for a `daily` task, weeks for a `weekly` task. Completing on Monday, skipping
  Tuesday and completing on Wednesday shows `1d`, not `3d`. The chain is
  derived from the task's last completion date, which survives the daily /
  weekly reset.

## Pixel art integration
CC0 2D art from Kenney's "Pixel UI pack" (OpenGameArt, CC0) ships as 9-slice sprite
window frames. Sprites live in `public/pixel-ui/` (served at `/pixel-ui/`, 48×48
9-slice panels, 8-bit RGBA) with full source + audit in `graphify-out/`.
- `.pixel-frame` renders the frame via CSS `border-image` from the 9-slice panel,
  stacked with `.pixel-border` for the inner pixel inset bevel. `image-rendering:
  pixelated` is global, so sprite borders stay crisp.
- Variant tiles: `panel-frame.png` (neutral grey), `panel-frame-light.png`, and
  `panel-frame-red.png` (accent via `.pixel-frame-red`).
- Surfaces skinned with sprite frames (live at `/`, `/stats`, `/weekly`):
  Dashboard floating windows (`CategoryWindow` shells), `WeeklyCompletionChart`,
  `HeatmapGrid`, `ActivityFeed`; Stats hub chart cards; `PomodoroPage` CRT housing,
  Active Target Task Bar, and Lower Control Deck; `WeeklyReport` Save section +
  Live Preview panels. Thin header/strip borders keep the CSS `border-b`/`border-b-2`.
- Sprite buttons: `PomodoroPage` START (red frame), RESET/SKIP (grey frame), and both
  `WeeklyReport` Save buttons use `pixel-btn` / `pixel-btn-red` (9-slice panel frames).
  Secondary controls (mode toggles, presets, select inputs) keep their CSS sets.
- Action buttons (START/RESET/SKIP and both Save buttons) now use 9-slice sprite
  frames via `pixel-btn` / `pixel-btn-red`; secondary toggles and inputs keep their
  CSS sets. The close `✕` glyph and check icons are the next pass.

## Backup & restore
`Settings -> Setup -> Backup & local storage` exports a JSON snapshot. It
carries the task list, the streaks, the bookmarks and their folders, the
activity feed, the completion history, the report buffer and the pomodoro
history — everything the app keeps, so the weekly report can still be
generated from a restored backup. The import restores all of it, not just the
task list.

`Clear all data` removes the synced keys from **both** this browser and
Firestore, so nothing comes back from the cloud on the next load.

## Troubleshooting
See the `pixel-productivity-sync-pwa` skill for sync / PWA-install / stale-data notes.

### The git repository lives inside OneDrive
OneDrive syncs `.git` like any other folder, and it can drop or corrupt the
loose objects and the pack while it does. The symptom is `git diff` or
`git fsck` failing with `bad object` / `missing blob`, and deleted files that
cannot be restored. If that happens: `git add -A` re-hashes everything from the
working copy and rebuilds the index, `git commit` then gives you a valid HEAD
(the old commit's missing blobs cannot be recovered, but the working tree is
the source of truth), and `git fetch origin --refetch` re-downloads anything
the remote still has. Keeping the checkout outside a synced folder avoids the
problem entirely.
