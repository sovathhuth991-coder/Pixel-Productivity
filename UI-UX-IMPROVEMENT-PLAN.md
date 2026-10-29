# UI / UX Improvement Plan — Pixel Productivity V3.1

> **Implementation status — Wave 0 (P0), Wave 1 (P1), Wave 4 (mobile), Wave 5 (type scale) and
> Wave 6 (accessibility & consistency) complete.**
> All 15 P0 findings, all 18 P1 findings, all 11 mobile findings, all 30 P2 findings and all 4 P3
> findings are fixed. Pixel Center is the default skin, every page fits a 375px phone with zero
> horizontal overflow, the smallest text in the app is 7px, and every control in it has a name.
>
> **Wave 0 (P0)** changed: `src/index.css`, `src/context/DesignModeContext.tsx`, `index.html`, `public/manifest.json`,
> `src/components/ui/PixelEmoji.tsx`, `src/components/Sidebar.tsx`, `src/components/SyncAuthCard.tsx`,
> `src/components/tasks/{CategoryCard,CategoryWindow,WeeklyCompletionChart}.tsx`,
> `src/pages/{BoardPage,BookmarksPage,DashboardPage,PomodoroPage,SettingsPage,StatsPage,WeeklyReportPage}.tsx`.
>
> **Wave 1 (P1)** added two shared primitives and reworked the interactions they replace:
> `src/components/ui/Dialog.tsx` (new — the one dialog primitive: `role="dialog"`, `aria-modal`, `aria-labelledby`,
> focus trap, focus restore, Escape, body scroll lock) and `src/components/ui/ActionButton.tsx` (new — a button that
> can show that it is working: pixel spinner + `aria-busy`).
> Also changed: `src/components/ui/Modal.tsx` (now renders the shared `Dialog`),
> `src/components/tasks/{CategoryCard,CategoryWindow,TaskItem,TaskModal}.tsx`,
> `src/components/{Sidebar,SyncAuthCard}.tsx`, `src/components/ui/Toast.tsx`,
> `src/context/{DesignModeContext,SyncContext}.tsx`, `src/hooks/{useTaskManager,useKeyboardShortcuts}.tsx`,
> `src/utils/{confetti,taskModalRequests}.ts` (new),
> `src/pages/{BoardPage,BookmarksPage,DashboardPage,SettingsPage,WeeklyReportPage}.tsx`.
>
> **Wave 4 (mobile)** fixed the layout defects that made the app unusable on a phone: the `min-w-0`
> root cause that clipped every page, the floating theme toggle that covered every page title, the
> seven-item bottom bar (now four items + a MORE sheet), the overflowing Bookmarks collection row,
> the clipped quick-add button, the toast colliding with the bottom nav, `100vh` arithmetic, and the
> charting library sitting in the first download. Added
> `src/components/MobileMoreSheet.tsx` (new) and `scripts/mobile-audit.mjs` (new — the 375px audit
> harness); changed `src/components/Layout.tsx`, `src/components/ui/{Dialog,PixelIcon}.tsx`,
> `src/components/tasks/RetroWindowDock.tsx`, `src/components/ui/Toast.tsx`, `src/App.tsx`,
> `src/pages/{DashboardPage,PomodoroPage,BookmarksPage,StatsPage,WeeklyReportPage}.tsx`,
> `vite.config.js`.
>
> Typecheck and production build pass. **Every finding in this document is now closed.**
>
> **One infrastructure change worth knowing about:** the service worker in `public/sw.js` is cache-first for every
> GET request, so in development the browser kept serving **stale Vite modules** and hot reload silently stopped
> reflecting source changes. The worker is now registered in **production only** (`index.html`), which leaves
> `public/sw.js` untouched and makes the dev loop reflect the source again. Offline support in production is
> unaffected.

**Scope:** interface and interaction quality across the whole app.
**Audited:** `src/` (25 components, 7 pages, 5 contexts, 5 hooks) + `index.html` + `public/manifest.json` + `index.css` + all 10 rendered screens (Tasks, Board, Bookmarks, Focus ×2, Weekly ×3, Stats ×2, Setup).
**Method:** full source read of every screen and shared primitive; a production build (`vite build`) whose emitted CSS was inspected directly to confirm which utilities actually exist; sampled the Kenney sprite PNGs to get their true pixel colours; computed WCAG contrast ratios for every token pair on its own surface in both themes; and reviewed every supplied screenshot against the code that renders it.
**Stack:** React 18 · TypeScript · Vite 6 · Tailwind v4 · Firebase · framer-motion · recharts · @dnd-kit · lucide-react.

---

## How to read this

Every recommendation carries a severity and an effort estimate.

| Severity | Meaning |
|---|---|
| **P0** | The user cannot see, read, or operate core UI. A visible feature is silently broken. |
| **P1** | Core flows work but are lossy, destructive, or inaccessible to keyboard / assistive-tech users. |
| **P2** | Consistency and polish debt. The app looks and behaves differently from screen to screen. |
| **P3** | Refinement and performance. |

Effort: **S** ≤ 2h · **M** ≤ 1 day · **L** > 1 day.

**Two skins, one default.** The app has two complete themes:

| | Pixel Center | Commander |
|---|---|---|
| Role | **Default skin** — the vintage parchment "studio" | Opt-in secondary skin — the dark "arcade" |
| Surface | `#ffffff` panels on `#f6f1e7` parchment | `#16213e` panels on `#1a1a2e` navy |
| Accent | terracotta `#e0533c` | coral `#e94560` |

Because Pixel Center is the default, **every finding is assessed against it first**. A contrast ratio quoted below is against the surface that element actually sits on in the default theme unless stated otherwise. Commander-specific issues are still listed — they matter to the people who opt in — but they no longer outrank a defect that every new user hits on load.

---

## Executive summary

The app has a genuinely good idea — a two-skin pixel-art productivity tool with a coherent token layer. It does not yet have a *system*.

**Pixel Center (the parchment "vintage studio" skin) is the product default.** That single decision reframes everything below: a defect that only appears in Pixel Center is now a *first-load* defect for every new user, while a defect that only appears in Commander only affects users who opt into the secondary skin. Findings are ordered accordingly.

Six things dominate everything else:

1. **The app does not actually open in Pixel Center.** `DesignModeContext.tsx:26-29` falls back to `'commander'`, so every new user gets the dark skin. And because the theme class is applied in a `useEffect` with no pre-paint bootstrap in `index.html`, every first load **paints navy, then flips to parchment** — a visible flash, made worse by render-blocking Google Fonts. The browser chrome (`theme-color #1a1a2e`) and the PWA splash (`background_color #1a1a2e`) are navy too. See **P0-1**.
2. **Sprite-rendered buttons cannot respond to the theme, and their labels fail contrast.** `.pixel-btn` paints a Kenney PNG sprite as the button background and then draws themed text on top. The label colours were chosen for a dark surface, but the sprite is light:

   | Button | Label | Sprite | **Pixel Center (default)** | Commander |
   |---|---|---|---|---|
   | **PAUSE** (running) | `--warn` `#d97706` | orange `#E86A17` | **1.01 — invisible** | 1.81 fail |
   | START FOCUS | `--on-accent` `#fff` | orange `#E86A17` | **3.23 — fail** | 3.23 fail |
   | RESET / SKIP | `--muted` | silver `#EEEEEE` | 5.97 ✓ | **2.22 fail** |
   | Weekly "SAVE_*.md" | inherited `--ink` | silver `#EEEEEE` | 15.27 ✓ | **1.16 invisible** |

   **PAUSE is the worst case in the app** — `--warn` on the orange sprite is a 1.01:1 ratio, i.e. the label is the same colour as its background. See **P0-2**.
3. **The silver panel frame disappears on parchment.** `.pixel-frame` uses `panel-frame.png` (`#EEEEEE`); on Pixel Center's `#f6f1e7` that is **1.03:1** — every Stats, Weekly Report and Focus panel loses its outline. Note `panel-frame-light.png` (`#E5E5E5`, 1.12:1) would *not* fix it; Pixel Center needs a genuinely **dark** frame. See **P0-3**.
4. **Two Tailwind classes in active use do not exist.** `text-on-dark` and `text-foreground` are absent from the built CSS. In Settings, that makes the TEST BEEP / TEST FANFARE labels near-black on near-black — invisible in the default theme. See **P0-4**.
5. **There is no keyboard path to the theme or animation preferences.** The radio inputs are decorative — `onChange={() => {}}` inside non-focusable `<div onClick>` cards. See **P1-1**.
6. **Almost no loading or pending state exists, and typography is unmanaged.** Exactly one component (`SyncAuthCard`) has a pending indicator, so every other mutation snaps instantly with no undo. Separately, 344 arbitrary `text-[Npx]` declarations across 11 sizes — 28 at 5px, 115 at 6px — mean nothing in the app reaches a readable size. See **P1-15** and **P2-1**.

**The good news:** the token foundation is sound. Most of P0 and P1 is a small number of CSS rules, one new sprite asset, and targeted component fixes — not a rewrite.

The good news: the token foundation is sound. Most of P0 and P1 is a small number of CSS rules and targeted component fixes, not a rewrite.

---

# Wave 0 — P0: broken and invisible UI

*Do these before anything else. **Ordered by impact in the default theme (Pixel Center)** — since Pixel Center is the product default, a defect there hits every new user on first load, while the same defect in Commander only affects users who opt into the secondary skin.*

### P0-1 · The app does not open in its own default theme
**Where:** `src/context/DesignModeContext.tsx:26-29` (fallback), `:14` (context default), `:40-44` (theme class applied in `useEffect`); `index.html:2` (`<html lang="en">` — no class), `index.html:11` (`<meta name="theme-color" content="#1a1a2e">`); `public/manifest.json` (`background_color: "#1a1a2e"`)
**Why it hurts:** Pixel Center is the intended default, but the code defaults to Commander in two places:
```ts
const saved = localStorage.getItem('design-mode')
return (saved === 'pixel-center' ? 'pixel-center' : 'commander') as DesignMode
```
Any first-time visitor — and any visitor whose `localStorage` has no `design-mode` key — gets the **dark** skin. Worse, the theme class is applied inside a `useEffect` (`DesignModeContext.tsx:40-44`), i.e. **after first paint**, and `index.html` ships no pre-paint bootstrap script. So every first load **paints Commander navy, then flips to parchment** — a visible flash of the wrong theme, made worse by Google Fonts being render-blocking (the dark frame is what the user stares at while fonts download). The browser chrome is navy (`theme-color #1a1a2e`) and the installed PWA's splash screen is navy (`background_color #1a1a2e`) — both wrong for a parchment app.
**Fix (all four):**
1. `DesignModeContext.tsx:26-29` → `saved === 'commander' ? 'commander' : 'pixel-center'`; `:14` → `'pixel-center'`. Commander becomes opt-in.
2. Add a pre-paint bootstrap in `index.html`, **before** the stylesheet link:
   ```html
   <script>
     document.documentElement.classList.add(
       localStorage.getItem('design-mode') === 'commander' ? 'mode-commander' : 'mode-pixel-center'
     )
   </script>
   ```
   This also removes the flash for returning users.
3. `index.html` `theme-color` → `#f6f1e7`, and update it from JS on theme change (see P2-15).
4. `public/manifest.json` `background_color` → `#f6f1e7`.
**Effort:** S · **Verify:** clear localStorage, hard-reload — the first painted frame is parchment, no flash.

### P0-2 · The PAUSE label is invisible in the default theme
**Where:** `src/index.css:198-215` (`.pixel-btn`, `.pixel-btn-red`) → `src/pages/PomodoroPage.tsx:305-312` (START/PAUSE), `:319` (RESET), `:330` (SKIP); `src/pages/WeeklyReportPage.tsx:379`, `:399` (SAVE)
**Why it hurts:** `.pixel-btn` is `background: transparent` with `border-image: url(/pixel-ui/panel-frame.png)`. The sprite is painted into the border box and the themed label is drawn **on top of it**. The sprite is light (`#EEEEEE`) or saturated orange (`#E86A17`) — but the label colours were picked for a dark surface. Measured against the actual sprite pixels:

| Button | Label | Sprite | **Pixel Center (default)** | Commander |
|---|---|---|---|---|
| **PAUSE** (timer running) | `--warn` `#d97706` | orange `#E86A17` | **1.01 — invisible** | 1.81 fail |
| START FOCUS | `--on-accent` `#fff` | orange `#E86A17` | **3.23 — fail** | 3.23 fail |
| RESET / SKIP | `--muted` | silver `#EEEEEE` | 5.97 ✓ | **2.22 fail** |
| Weekly "SAVE_*.md" | inherited `--ink` | silver `#EEEEEE` | 15.27 ✓ | **1.16 invisible** |

**PAUSE is the worst case in the app**: `--warn` `#d97706` on the orange sprite `#E86A17` is a contrast ratio of **1.01** — the label is the same colour as its background. Whenever the timer is running, the primary control on the Focus screen has no readable label.
**Why the theme can't fix it:** the button's appearance comes from a PNG, not a token. Toggling the theme swaps the label colour but leaves the sprite identical.
**Fix (choose one):**
- *Tokenise the button:* drop the PNG background, give `.pixel-btn` a real `background: var(--btn-fill)` + `border: 2px solid var(--btn-border)`, and keep the sprite only as optional decorative framing. This restores full theme control and fixes both skins at once.
- *Keep the sprite, fix the labels:* give `.pixel-btn` an explicit dark label (`#1a1625` reads 5.97:1 on silver, and `#E86A17` takes dark text far better than white). Then the orange sprite and the terracotta `--accent` finally agree.
**Effort:** M (tokenise) / S (labels) · **Verify:** every `.pixel-btn` label ≥ 4.5:1 against its sprite pixel in **both** themes.

### P0-3 · The silver panel frame is invisible on parchment
**Where:** `src/index.css:177-186` (`.pixel-frame`, `.pixel-frame-light`); used by `src/pages/StatsPage.tsx`, `src/pages/WeeklyReportPage.tsx`, `src/pages/PomodoroPage.tsx:226`
**Measured:** `panel-frame.png` interior `#EEEEEE` on parchment `#f6f1e7` = **1.03:1**; on white `#ffffff` = **1.16:1**. In Commander the same sprite on navy `#16213e` = 13.7:1, which is why it looks great in your screenshots — and why nobody caught it. In the **default** theme every framed panel on Stats, Weekly Report and Focus loses its outline.
**The trap:** `panel-frame-light.png` is `#E5E5E5` — marginally *darker*, still 1.12:1 on parchment. **Shipping it does not fix this.** Pixel Center needs a genuinely **dark** frame: the `--line` token (`#231f32`) already gives 14.2:1.
**Fix:** author a dark 9-slice from the same Kenney pack (CC0, already vendored in `public/pixel-ui/`) and add `html.mode-pixel-center .pixel-frame { border-image-source: url(/pixel-ui/panel-frame-dark.png); }`. Same for `.pixel-btn` and `.pixel-btn-red`.
**Effort:** S (asset) + S (CSS) · **Verify:** every framed panel has a visible edge in Pixel Center.

### P0-4 · `text-on-dark` and `text-foreground` are no-op classes
**Where:** `src/pages/SettingsPage.tsx:414`, `:421`; `src/components/SyncAuthCard.tsx:176`, `:183`
**Why it hurts:** Tailwind v4 only generates utilities from the `--color-*` namespace. `@theme` (`src/index.css:95-115`) declares `--color-on-accent` and `--color-on-accent-2` but **not** `--color-on-dark` or `--color-foreground`. Confirmed absent from the production CSS. So `text-on-dark` resolves to nothing and the element inherits `--ink`.
**Impact:** In Settings, TEST BEEP and TEST FANFARE are `bg-line` (`#231f32`, near-black in Pixel Center) with inherited `--ink` (`#1a1625`, near-black) → **1.03:1 — invisible in the default theme**. `text-foreground` in `SyncAuthCard` is a silent no-op that happens to work by accident.
**Fix:** add `--color-on-dark: var(--on-dark)` to `@theme`, and define `--on-dark` in `:root` too — it currently exists only under `html.mode-pixel-center` (`src/index.css:71`). Define `--color-foreground` or delete the class.
**Effort:** S · **Verify:** `grep -c 'text-on-dark' dist/assets/*.css` returns non-zero after rebuild.

### P0-5 · Hover states invert to near-black on near-black in the default theme
**Where:** `src/pages/BoardPage.tsx:286`; `src/pages/PomodoroPage.tsx:394`, `:400`, `:406`; `src/pages/BookmarksPage.tsx:187`, `:352`
**Why it hurts:** the pattern `hover:bg-line` + `text-ink` / `text-muted` / `text-accent`. In Pixel Center `--line: #231f32` while the text stays dark → the button vanishes *on hover*, which reads as a rendering glitch rather than feedback.
**Fix:** introduce a semantic hover token pair (`--hover-fill` / `--hover-ink`) and use them instead of `hover:bg-line` + fixed text colour.
**Effort:** S

### P0-6 · `--dim` and `--warn` fail contrast on parchment
**Where:** `src/index.css` tokens; `--dim` is used for subtitles, footers and metadata at 5–7px throughout (e.g. `src/components/Sidebar.tsx:162`, visible bottom-left in every screenshot as "DATA: LOCAL"); `--warn` for warnings and small labels
**Measured on parchment `#f6f1e7`:** `--dim` `#8d869e` = **3.09:1** (fails AA at small sizes) · `--warn` `#d97706` = **2.83:1 (fail)**
**Measured on navy `#16213e` (Commander):** `--dim` `#555555` = **2.13:1 (fail)**
**Fix:** raise both to ≥ 4.5:1 on their own surface — roughly `--dim: #6b6478` / `--warn: #a15c07` on parchment, `--dim: #8a8a9c` on navy. Since `--dim` is used at 5–6px, consider retiring it for anything but decorative marks.
**Effort:** S

### P0-7 · The primary button and page headings are marginal on parchment
**Where:** every `bg-accent` + `text-on-accent` button — "+ NEW TASK", "+ CATEGORY", "CHANGE FOLDER", "EXPORT/IMPORT" — and every page `<h1 class="... text-accent ...">`
**Measured on the default theme:** white on `--accent` `#e0533c` = **3.84:1** (AA-large only); `--accent` on parchment = **3.41:1** (AA-large only)
**Why it hurts:** the app's single most important action is 8px white text on terracotta at 3.84:1. It reads fine on navy and fails on parchment.
**Fix:** darken `--accent` for Pixel Center so white text clears 4.5:1 — `#c9452f` gives ≈ 4.9:1 on white — or switch the primary button to `--on-accent` = near-black ink on terracotta. Pair this with P0-2's label decision so `--accent` and the orange sprite agree.
**Effort:** S

### P0-8 · Stats charts hardcode the dark palette and fail on the default surface
**Where:** `src/pages/StatsPage.tsx` — `MUTE = '#94a3b8'`, tooltip `#0f172a`, pie cell stroke `#0f172a`, series `#4ecdc4` / `#e94560` / `#f59e0b` / `#22c55e`
**Measured on `#ffffff`:** axis `#94a3b8` **2.56:1 fail** · teal **1.93:1 fail** · amber **2.15:1 fail** · green **2.28:1 fail** · coral 3.83:1
**Why it hurts:** in the default theme the axis labels and three of four series are near-invisible, and the tooltip stays dark navy on a parchment page.
**Fix:** drive every chart colour from the theme tokens via a `useDesignMode()`-aware palette map; give the tooltip `var(--surface)` / `var(--ink)` / `var(--line)`; swap the pie stroke to `var(--surface)`.
**Effort:** M

### P0-9 · PixelEmoji sprites ignore the theme entirely
**Where:** `src/components/ui/PixelEmoji.tsx` — 40+ hardcoded slate hexes (`#0f172a`, `#475569`, `#94a3b8`, `#334155`…); `useDesignMode()` is read at `:994` only for `animationsEnabled`
**Why it hurts:** every emoji badge in the app draws with the same dark-slate palette — on navy that reads fine, on parchment it reads as mud. These are the little ⏳/🔥/💎 chips on every task row in your screenshots.
**Fix:** move the palette to CSS custom properties per theme (or per-emoji token pairs) so the sprites inherit the active skin.
**Effort:** M

### P0-10 · Commander (secondary skin) never declares `color-scheme: dark`
**Where:** `src/index.css:36-63` (`:root` / commander) vs `:477-479` (Pixel Center only)
**Why it hurts:** the UA keeps the light scheme, so native widgets render light inside the dark UI — the `<select>` dropdowns and the **time picker** on Weekly Report (`WeeklyReportPage.tsx:273`, `:288`, visibly native and unstyled in your screenshot), number-input spinners (`SettingsPage.tsx:241`, `:259`, `:277`, `:295`), scrollbars, and Chrome's yellow autofill.
**Priority note:** Commander is now the secondary skin, so this is no longer a first-load defect — but it is still the most visible inconsistency in that skin, and the fix is one line.
**Fix:** `color-scheme: dark` on `:root`; `color-scheme: light` already exists for Pixel Center. Also add a `:-webkit-autofill` override — the Pixel Center `input { background-color: #fbf8f0 }` rule cannot beat Chrome's autofill background.
**Effort:** S

### P0-11 · The light sprite treatment exists but is never applied
**Where:** `src/index.css:177-189` defines `.pixel-frame-light` and `panel-frame-light.png` exists in `public/pixel-ui/`; `src/index.css:488-517` is the only `mode-pixel-center` override block and covers `.pixel-border`, `.retro-btn*`, `.retro-window-header`, `.retro-crt` and inputs — **not** `.pixel-frame`, `.pixel-btn`, `.pixel-btn-red` or `.pixel-close`
**Verified:** the built CSS contains **zero** rules combining `mode-pixel-center` with `pixel-frame`/`pixel-btn`.
**Fix:** covered by P0-2 and P0-3 — but note the correct Pixel Center treatment is a **dark** frame, not the existing `panel-frame-light.png`.
**Effort:** S

### P0-12 · The CRT scanline overlay is not re-toned for the default theme
**Where:** `src/index.css:589` — `.retro-crt` paints `rgba(0,0,0,0.25)` banding; `src/index.css:509-511` overrides only its `box-shadow` in Pixel Center
**Why it hurts:** 25% black banding over the parchment timer panel reads as dirty grey, not vintage glass — and the Focus screen is a default-theme screen.
**Fix:** add a `mode-pixel-center` variant using a warm low-alpha tone (`rgba(120,100,80,0.12)`).
**Effort:** S

### P0-13 · Settings uses raw Tailwind reds instead of `--danger`
**Where:** `src/pages/SettingsPage.tsx:474-475` — `bg-red-600`, `border-red-400`, `bg-red-500/10`, `border-red-500/40`, `text-red-400`
**Measured:** `text-red-400` (`#f87171`) on white ≈ **2.56:1** — the FACTORY RESET label is unreadable in the default theme. (The Commander screenshot shows it as a red-outlined button, which reads fine, so this is default-theme only.)
**Fix:** replace with `bg-danger`, `border-danger`, `text-danger`. Note `--danger` `#dc2626` is 4.29:1 on parchment — slightly under AA for small text; darken to ~`#c81e1e` (≈ 5.1:1) at the same time.
**Effort:** S

### P0-14 · Pixel Center flattens the input "well" affordance
**Where:** `src/index.css:513-517` — `html.mode-pixel-center input { background-color: #fbf8f0 }` (specificity 0-1-1) overrides `bg-surface` on **every** input
**Why it hurts:** Settings' `bg-app-deep/80` wells and `bg-surface` fields collapse to the same cream, so field boundaries disappear in the default theme.
**Fix:** set the fill on a token (`--input-fill`) and let components choose; keep the well distinct.
**Effort:** S

### P0-15 · Body typeface changes between themes
**Where:** `src/pages/WeeklyReportPage.tsx:203`, `:227` use `text-[6px]` **without** `font-pixel`
**Why it hurts:** `--font-body` is `'Press Start 2P'` in Commander and `'DM Sans'` in Pixel Center, so these two lines switch typeface entirely when the theme changes — the only place in the app where a theme toggle visibly reflows text. Now that Pixel Center is the default, most users see the DM Sans rendering; the Commander rendering becomes the odd one out.
**Fix:** add `font-pixel` to both, or route them through a semantic class.
**Effort:** S

---

# Wave 1 — P1: data loss, keyboard access, feedback

### P1-1 · The theme and animation preferences cannot be changed by keyboard
**Where:** `src/pages/SettingsPage.tsx:571-581`, `:595-601`, `:645-651`, `:734-740`, `:794-800`
**Why it hurts:** the option cards are `<div onClick>` (not focusable, no `role`), and the `<input type="radio">` inside them has `onChange={() => {}}` — a controlled input with a no-op handler. Arrow keys focus the radio but nothing happens. A keyboard or screen-reader user cannot switch theme or turn off animations at all.
**Fix:** make the radio the real control (`checked` + `onChange` that sets state, wrapped in a `<label>`), or make the card a `<button role="radio" aria-checked>`.
**Effort:** M · **Verify:** tab to the theme cards and change the theme with arrow keys.

### P1-2 · The primary task-edit affordance is mouse-only
**Where:** `src/pages/BoardPage.tsx:392-399` — the task title is an `<h3 onClick>`
**Why it hurts:** not focusable, no `role`, no key handler. The main way to edit a task is unreachable by keyboard.
**Fix:** render a real `<button>` styled as the title, or add `tabIndex`, `role="button"`, and an Enter/Space handler.
**Effort:** S

### P1-3 · The global shortcut handler breaks Space, Ctrl+R, Ctrl+S and Ctrl+N
**Where:** `src/hooks/useKeyboardShortcuts.tsx:44`, `:49-50`, `:60-61`, `:66-67`, `:96-97`
**Why it hurts:** the guard at `:44` excludes only `INPUT`, `TEXTAREA`, `SELECT` — not `<button>`, not modals, not `contenteditable`. Consequences:
- `e.preventDefault()` on **Space** means a focused button can no longer be activated with Space.
- `preventDefault()` on `KeyR` / `KeyS` / `KeyN` kills **Ctrl+R** (reload), **Ctrl+S** (save) and **Ctrl+N**, and **ArrowRight** can no longer scroll the Dashboard carousel (`DashboardPage.tsx:479`).
- The handler stays live while modals are open, so Space inside the Bookmarks overlays starts the timer.
**Fix:** skip when `e.metaKey || e.ctrlKey || e.altKey`; skip when the target is a button/link/`contenteditable` or inside a `[role="dialog"]`; scope Escape handling to open modals (the comment at `:115-116` already admits it doesn't).
**Effort:** M

### P1-4 · "N = New Task" doesn't create a task
**Where:** `src/hooks/useKeyboardShortcuts.tsx:33-37` only calls `navigate('/')`, while `src/components/ui/KeyboardShortcutsModal.tsx:13` and `src/pages/SettingsPage.tsx:512-514` promise it opens the Task modal
**Fix:** raise the task-modal open state into a context the shortcut can reach, and open it.
**Effort:** M

### P1-5 · There is no focus indicator on any button
**Where:** the only `focus-visible` rule in the entire codebase is `src/index.css:254` (`.pixel-close`). Roughly 90+ buttons rely on the UA default ring; inputs use `outline-none` plus a border-colour swap.
**Why it hurts:** keyboard users get no consistent focus feedback, and on the red/blue sprite frames the UA ring is hard to see.
**Fix:** add a global `button:focus-visible, a:focus-visible, [role="button"]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` and one shared input-focus treatment (a single hue — see P2-6).
**Effort:** S

### P1-6 · Modals are not dialogs
**Where:** `src/components/ui/Modal.tsx:31-49` — no `role="dialog"`, no `aria-modal`, no `aria-labelledby`, **no focus trap**, **no focus restore**, no body scroll lock; close ✕ is 24×24 with no label (`:53-58`). The two hand-rolled overlays in `src/pages/BookmarksPage.tsx:367-461` and `:464-515` add no ESC handling and sit at `z-50` against Modal's `z-40`.
**Why it hurts:** Tab escapes behind the overlay; screen readers announce nothing; stacked overlays fight over z-order.
**Fix:** build one `Dialog` primitive with focus trap, focus restore, ESC, scroll lock, `role="dialog"` + `aria-modal`, and migrate both hand-rolled overlays to it.
**Effort:** L

### P1-7 · Deleting a task has no confirmation and no undo
**Where:** `src/components/tasks/TaskItem.tsx` (delete button) vs `src/components/tasks/CategoryCard.tsx:133`, which *does* confirm
**Why it hurts:** one misclick destroys a task permanently, and the only feedback is a neutral toast. The asymmetry with category deletion is confusing.
**Fix:** toast with an **UNDO** action (preferred — no extra clicks on the happy path), and keep confirm only for category deletion.
**Effort:** M

### P1-8 · Deleting a bookmark has no confirmation and no undo
**Where:** `src/pages/BookmarksPage.tsx:117-120` (delete) and `:311-317` (the button)
**Fix:** same undo-toast pattern as P1-7.
**Effort:** S

### P1-9 · Editing a task wipes the form mid-typing
**Where:** `src/components/tasks/TaskModal.tsx:44` — the reset effect's dependency array includes `data.categories`
**Why it hurts:** `data.categories` gets a new array identity on every task mutation, so completing *any* task anywhere in the app re-runs the effect and resets the form the user is currently editing — title and notes silently cleared. This is the most damaging bug in the app because it destroys unsaved work with no prompt.
**Fix:** depend on `taskToEdit?.id` and `defaultCategoryId` only; guard the reset behind an `isOpen` transition.
**Effort:** S · **Verify:** open the edit modal, type a title, complete a task in another category, confirm the text survives.

### P1-10 · The edit button in the task window does nothing
**Where:** `src/components/tasks/CategoryWindow.tsx:494` — `onEdit={() => {}}`
**Why it hurts:** the pencil icon on every task in the pop-out window is inert. Users click it and get no response at all.
**Fix:** wire it to the same `TaskModal` edit flow the Board uses.
**Effort:** S

### P1-11 · The sidebar always says "DATA: LOCAL"
**Where:** `src/components/Sidebar.tsx:162`
**Why it hurts:** the string is hardcoded. `SyncContext` already exposes `isSignedIn` / `authReady`, but nothing outside `SyncAuthCard` reads them — so a user who is signed in and syncing to Firestore is still told their data is local only. The footer is at `text-[5px] text-dim`, which is 2.13:1 — barely legible even when correct.
**Fix:** render `LOCAL` / `SYNCING` / `SYNCED` from `useSyncContext()`; fix the contrast while you're there.
**Effort:** S

### P1-12 · The sync layer has no user-visible status
**Where:** `src/hooks/useSyncedStorage.ts` — errors are swallowed (`.catch(() => { /* stay on localStorage */ })`), remote writes are applied silently, the initial cloud seed is silent
**Why it hurts:** when sync fails the app looks identical to a successful sync. Combined with P1-11 the user has no way to know where their data lives.
**Fix:** expose a `syncStatus: 'local' | 'syncing' | 'synced' | 'error'` from the sync layer and surface it in the sidebar; show a toast on write failure.
**Effort:** M

### P1-13 · Confetti ignores the "stop animations" preference
**Where:** `src/components/tasks/TaskItem.tsx:22`, `src/components/tasks/CategoryWindow.tsx:179`
**Why it hurts:** confetti is drawn on a canvas by JS, so the `html.stop-animations` CSS rule cannot suppress it. A user who explicitly asked for reduced motion still gets a full-screen particle burst on every task completion.
**Fix:** gate the `confetti()` calls on the animation preference (and on `prefers-reduced-motion` — see P2-9).
**Effort:** S

### P1-14 · Toasts have no warning state, and errors are styled as accent
**Where:** `src/components/ui/Toast.tsx:7` (`info | success | error` only), `:37` maps `error` → `border-accent text-accent`
**Why it hurts:** destructive outcomes announce as neutral info — `src/pages/BoardPage.tsx:135` ("Task deleted") and `src/pages/BookmarksPage.tsx:119` ("Bookmark deleted") both read as calm, and coral is also the brand's primary accent, so errors don't stand out.
**Fix:** add a `warn` type mapped to `--danger`; reserve `--accent` for informational emphasis.
**Effort:** S

### P1-15 · Only one component in the app has a pending state
**Where:** `src/components/SyncAuthCard.tsx:132`, `:158`, `:191` use `loading ? '…' : 'label'`. Everything else — board mutations (`BoardPage.tsx:133-136`, `:310-373`), Pomodoro reset/skip (`PomodoroPage.tsx:314-334`), presets (`:392-409`), Settings reset/import (`SettingsPage.tsx:310-318`, `:459-468`), bookmark deletes — has **no** pending indicator.
**Why it hurts:** the UI looks identical before and after the click, so there is no confirmation that a destructive or slow action registered.
**Fix:** a shared `<ActionButton>` that takes `loading` and renders a pixel spinner + label swap, applied to all mutations. (Weekly Report's `saving` state at `:376-382` is the one good existing pattern — copy it.)
**Effort:** M

### P1-16 · "Copy URL" reports success even when it fails
**Where:** `src/pages/BookmarksPage.tsx:122-125`
**Why it hurts:** `navigator.clipboard.writeText` is neither awaited nor `.catch()`-ed, yet "URL copied to clipboard! 📋" is shown unconditionally — a false success on non-secure origins.
**Fix:** `await` it and show the success toast only on resolve; show an error toast on reject.
**Effort:** S

### P1-17 · Clicking a category title pops out a floating window
**Where:** `src/components/tasks/CategoryCard.tsx` — the card header's `onClick={() => onWindowToggle(category)}`
**Why it hurts:** clicking a title is the universally expected gesture for renaming or opening. Popping out a floating window instead is surprising, and the header is a `<div>` so it is also keyboard-inaccessible.
**Fix:** make the title a button that opens the category for editing; move the window toggle to an explicit affordance (e.g. a dedicated corner icon).
**Effort:** M

### P1-18 · The folder-delete confirmation message is factually wrong
**Where:** `src/pages/BookmarksPage.tsx:150` says bookmarks will be "kept in general list", but `:152` reassigns them to the **`work`** folder
**Fix:** correct the copy — a wrong confirmation is worse than none.
**Effort:** S

---

# Wave 2 — P2: consistency, hierarchy, typography

### P2-1 · There is no type scale
**Evidence:** **344** raw `text-[Npx]` declarations across **25 files**, spanning **11** values — 28× 5px, 115× 6px, 118× 7px, 43× 8px, 27× 9px, 11× 10px, 2× 12px.
**Why it hurts:** Press Start 2P glyphs are roughly one square em wide, so 5–6px renders as near-noise. Nothing in the app reaches a comfortable reading size, and there is no ladder to design against.
**Fix:** define a scale as tokens — e.g. `--text-label: 8px`, `--text-body: 10px`, `--text-title: 12px`, `--text-heading: 16px` — exposed via `@theme` as `text-label` / `text-body` / etc. Then migrate mechanically. Treat 5px as a bug and delete it.
**Effort:** L · **Do this after Wave 0/1** — it touches every file.

### P2-1b · The app already contains the answer to its own type problem
**Where:** the BACKUP & LOCAL STORAGE description on the Setup screen (`src/pages/SettingsPage.tsx:~300`) is written in the **body font at body size**, and it is the only comfortably readable paragraph in the entire app. Compare it with every other explanatory string, which is pixel-font at 5–7px.
**Why it matters:** this proves the problem is the *type scale*, not the pixel aesthetic. Explanatory copy does not need to be pixel art.
**Fix:** split content into two typographic roles — **UI chrome** (pixel font, small, labels, buttons) and **content** (body font, ≥ 12px, headings of sections, descriptive paragraphs, task titles). Task titles in particular should be content, not chrome: at `text-[8px]` pixel font, "Dailies" and "Weeklys" are the hardest thing to read on the Tasks screen.
**Effort:** S for the principle, included in P2-1's migration

### P2-2 · Page shells don't match each other
**Measured across the seven pages:**

| Page | Max width | Section rhythm | Bottom padding | Header pattern | H1 size |
|---|---|---|---|---|---|
| Dashboard | `max-w-7xl` | `space-y-6` | `pb-20` | `border-b-4 pb-4` | `text-base md:text-xl` |
| Board | `max-w-7xl` | `mb-6` / `gap-6` | `pb-20` | `border-b-4 pb-4` | `text-base md:text-xl` |
| Stats | `max-w-6xl` | `space-y-6` | `pb-24` | `border-b-4 pb-3` | `text-xl` |
| Weekly Report | `max-w-6xl` | `space-y-5` | `pb-20` | `border-b-4 pb-3` | `text-base md:text-xl` |
| Settings | `max-w-4xl` | `space-y-6` | *(none)* | `border-b-4 pb-4` | `text-base md:text-xl` |
| Pomodoro | `max-w-xl` | `space-y-4` | `pb-20` | *boxed `bg-surface/80 pixel-border`* | `text-xs md:text-sm` |
| Bookmarks | *(none — full bleed)* | *(none)* | *(none)* | *full-bleed `bg-app-deep` bar* | `text-xs md:text-sm` |

**Fix:** pick one shell — `max-w-7xl px-4 md:px-8 space-y-6 pb-24` — and a single header component used by all seven pages. Pomodoro and Bookmarks deviate most; the narrow Pomodoro canvas is defensible but should be a deliberate inner constraint, not a different page shell.
**Effort:** M

### P2-3 · ~50 ad-hoc buttons duplicate five CSS variants
**Evidence:** the stylesheet provides `.retro-btn`, `.retro-btn-accent`, `.retro-btn-teal`, `.pixel-btn`, `.pixel-btn-red`, `.pixel-close`. Against those, roughly **50** buttons hand-roll `bg-* border-* text-* hover:*` in raw Tailwind — e.g. `BoardPage.tsx:236`, `:248`, `:286`, `:310`, `:362`, `:369`, `:381`, `:434`, `:443`, `:454`, `:464`, `:474`; `SettingsPage.tsx:214`, `:220`, `:226`, `:315`, `:335`, `:383`, `:403`, `:414`, `:421`, `:428`, `:453`, `:459`, `:472`, `:482`; `BookmarksPage.tsx:187`, `:194`, `:268`, `:270`, `:313`, `:352`, `:375`, `:446`, `:453`, `:472`, `:497`, `:504`.
**Why it hurts:** only **one** button in the whole app has a pressed state (`BookmarksPage.tsx:194` `active:scale-95`); the `.retro-*` family has a real press (`index.css:540`, `:556`, `:573`); every raw button has none. That is why "button feedback" feels inconsistent.
**Fix:** extend the CSS variants (add a `--ghost` and a `--danger` button), then migrate the raw Tailwind buttons to them.
**Effort:** M

### P2-4 · Sibling sections use different hues, so no section reads as primary
**Evidence:** `src/pages/SettingsPage.tsx:207`, `:325`, `:396`, `:442`, `:494`, `:549`, `:692` — seven `<h2>`s across **six** hues (accent, purple, accent-2, warn, muted, accent, accent). `src/pages/WeeklyReportPage.tsx:262`, `:321`, `:359`, `:413`, `:458` — five `<h2>`s across four hues.
**Confirmed visually:** the Setup screen shows AUDIO & BROWSER ALERTS in teal, BACKUP & LOCAL STORAGE in amber, KEYBOARD CONTROLS in muted white, and ANIMATION SETUP in coral — four sibling sections, four identities. The Bookmarks screen likewise runs indigo / amber / emerald / blue / violet / teal swatches.
**Why it hurts:** every section looks equally important, so nothing does.
**Fix:** one heading colour across the app (`--heading`), reserving accent hues for interactive elements only.
**Effort:** S

### P2-4b · Two competing primary buttons on the Tasks screen
**Where:** `src/pages/DashboardPage.tsx` — "+ NEW TASK" (coral, solid) and "+ CATEGORY" (teal, solid) sit side by side in the header
**Why it hurts:** two equally saturated, equally solid buttons read as two primaries. (The Board screen gets this right — it has exactly one, "+ NEW TASK".)
**Fix:** keep NEW TASK solid; make "+ CATEGORY" a secondary/ghost button.
**Effort:** S

### P2-5 · Five saturated colours compete in the stat row
**Where:** `src/components/tasks/StatsCards.tsx` — five cards in accent-2 / success / warn / accent / **danger**, each with a 4px saturated border
**Why it hurts:** a rainbow of equal-weight cards with no primary metric. Worse, **STREAK is rendered in `--danger` (red)** — a positive metric wearing the colour the app uses for destructive actions.
**Fix:** one accent for the primary metric, `--success`/`--warn` only where they carry meaning, and `--accent-2` (not `--danger`) for streak.
**Effort:** S

### P2-6 · Form focus uses four different hues
**Where:** inputs focus via `focus:border-accent` / `focus:border-accent-2` / `focus:border-purple` / `focus:border-warn` across `SettingsPage.tsx:250`, `:268`, `:286`, `:304`, `:361`, `:375`; `BookmarksPage.tsx:395`, `:408`, `:419`, `:438`, `:492`; `BoardPage.tsx:228`, `:305`; `WeeklyReportPage.tsx:279`, `:295`
**Fix:** one focus hue and one focus treatment app-wide (see P1-5).
**Effort:** S

### P2-7 · Bookmarks introduces an off-palette colour system
**Where:** `src/pages/BookmarksPage.tsx:10-14`, `:132`, `:167` — `#6366f1`, `#f59e0b`, `#10b981`, `#3b82f6`, `#8b5cf6`, `#ec4899`, `#4ecdc4`, `#ff7669`, applied inline at `:232` and `:299-301`
**Why it hurts:** these are Tailwind-500 defaults that belong to neither theme — Pixel Center's palette is terracotta `#e0533c` / jade `#1f8a70` / violet `#7c3aed`. On white, `#f59e0b` and `#10b981` sit around 2.2–2.9:1 at 5–6px.
**Fix:** move folder colours onto the theme token set.
**Effort:** S

### P2-7b · The Stats bar chart's legend doesn't describe its bars
**Where:** `src/pages/StatsPage.tsx` — legend swatches are coral "TODAY" and teal "PAST DAYS", but the rendered bars are **teal and purple**
**Why it hurts:** the "TODAY" x-axis label is highlighted coral while today has no bar at all, and purple appears in the chart with no legend entry. A reader cannot decode the chart.
**Fix:** one accent per series, legend generated from the same palette object the bars use.
**Effort:** S

### P2-7c · Weekly Report runs two different colour systems
**Where:** `src/pages/WeeklyReportPage.tsx` — "WEEKLY COMPLETION % (6 WEEKS)" draws every bar in a single amber; "CATEGORY BREAKDOWN" below it draws four bars in teal / coral / purple / green
**Why it hurts:** two chart systems stacked on one page, and neither matches the app's accent semantics (amber is `--warn`, used for warnings).
**Fix:** one categorical palette shared by every chart on the page; reserve `--warn` for warning states.
**Effort:** S

### P2-7d · The donut chart is off-centre with a large dead zone
**Where:** `src/pages/WeeklyReportPage.tsx` — the pie sits right-of-centre in a wide panel with roughly 40% empty space to its left
**Fix:** centre it and either enlarge it or give the freed space to a legend/label.
**Effort:** S

### P2-7e · The Pomodoro status line splits one fact across three colours
**Where:** `src/pages/PomodoroPage.tsx` — "● STATUS: PAUSED" (amber), "⏱ FOCUS SESSION" (teal), "SET: 25m / 5m" (muted)
**Why it hurts:** three colours on a single 40px line reads as three unrelated facts and competes with the coral timer.
**Fix:** one status colour driven by state (idle / running / paused), everything else muted.
**Effort:** S

### P2-8 · 375px layouts overflow in three places
- `src/pages/PomodoroPage.tsx:105-136` — the header row is `flex items-center justify-between` with **no wrap**; "PIXEL FOCUS TERMINAL" (Press Start 2P @12px ≈ 230px) plus CRT and AUDIO buttons ≈ 380px > 343px available. The page is `overflow-y-auto`, so it clips.
- `src/pages/WeeklyReportPage.tsx:203-208` — the task-title `<span>` has no `min-w-0`/`truncate`, so a long title widens the day cell (`:464-467`).
- `src/pages/BookmarksPage.tsx:171` — root is `overflow-hidden` + `h-full`, so content is **clipped** rather than scrolled on short viewports.
**Fix:** `flex-wrap` on the Pomodoro header; `min-w-0 truncate` on the report title; scrollable root on Bookmarks.
**Effort:** S

### P2-9 · Reduced motion is ignored (but system *theme* should stay ignored too)
**Where:** no `prefers-reduced-motion` anywhere in `src/`; there is also no `prefers-color-scheme`
**Two different recommendations, deliberately:**
- **Do** honour `prefers-reduced-motion: reduce` as an implicit "stop animations". The app already has a manual animations toggle, so this is a one-line addition and it is the accessibility baseline.
- **Do not** auto-select the theme from `prefers-color-scheme`. Pixel Center is the deliberate product default — a vintage parchment studio, not "the light option". Auto-flipping to Commander on OS-dark machines would override the intended first impression. The OS preference should only ever *offer* Commander, never select it.

**Fix:** read `window.matchMedia('(prefers-reduced-motion: reduce)')` on mount and OR it with the manual toggle; leave theme selection entirely to the explicit toggle.
**Effort:** S

### P2-10 · Hit targets are far below 32px
**Evidence:** `src/pages/BoardPage.tsx:434`, `:443`, `:454`, `:464`, `:474` — `text-[5px] px-1.5 py-1` ≈ **13px** tall with 5px type; `BoardPage.tsx:360-373` — `p-0.5 text-[8px]` ≈ 16px; `:379-389` — the completion checkbox is `w-4 h-4` = 16px; `:284-290` — the "+" button is `w-6 h-6` = 24px. `src/components/ui/Modal.tsx:53-58` — close ✕ 24×24. `src/components/SyncAuthCard.tsx:171-184` — inputs ≈ 14px tall. `src/pages/SettingsPage.tsx:215`, `:221`, `:227` — ≈ 14px.
**Fix:** raise interactive elements to ≥ 32×32 (a larger hit area via padding is fine even if the visual stays pixel-small).
**Effort:** M

### P2-11 · Form labels aren't associated with their fields
**Where:** no `htmlFor`/`id` pairing in `SettingsPage.tsx:238`, `:256`, `:274`, `:292`, `:353`, `:367`; `BookmarksPage.tsx:385`, `:400`, `:413`, `:430`, `:482`; `WeeklyReportPage.tsx:272`, `:287`. The Pomodoro task `<select>` (`PomodoroPage.tsx:194-210`) has **no label at all**, only a `-- Switch Task --` placeholder. Board search and quick-add are placeholder-only (`:223-229`, `:298-306`).
**Fix:** add `id` + `htmlFor` everywhere; mark the Obsidian vault path as required (it's functionally required at `SettingsPage.tsx:48-51` but looks optional).
**Effort:** M

### P2-12 · Icon-only buttons have no accessible name
**Where:** `src/pages/BookmarksPage.tsx:311-317` and `:472-477` have **no `title` at all**; `Modal.tsx:53-58` (close ✕) and `BoardPage.tsx:284-290`, `:360-366`, `:367-373` have `title` only, which is unreliable for screen readers and invisible on touch. `BookmarksPage.tsx:241-250` hides the delete button at `opacity-0 group-hover:opacity-100`, so keyboard users never see it.
**Fix:** add `aria-label` to every icon button; replace hover-reveal with a always-visible low-opacity state that strengthens on hover/focus.
**Effort:** S

### P2-13 · Toast and the window dock collide on mobile
**Where:** the toast is `fixed bottom-4 right-4 z-50`; `src/components/tasks/RetroWindowDock.tsx:13` is `fixed bottom-14 md:bottom-3 right-3 z-40`
**Why it hurts:** on mobile both are right-anchored and vertically 16px vs 56px — a toast lands on top of the dock.
**Fix:** raise the toast to `bottom-20 md:bottom-4` on small screens.
**Effort:** S

### P2-14 · Text selection is inconsistent
**Where:** `select-none` on the app root (`src/components/Layout.tsx`), with `select-text` applied only to category cards
**Why it hurts:** users can select category names but not task titles, stats, or report text — the opposite of the useful behaviour.
**Fix:** drop `select-none` from the root; apply it only to chrome (nav, buttons).
**Effort:** S

### P2-15 · The PWA manifest and meta tag disagree on theme colour
**Where:** `public/manifest.json` has `theme_color: "#e94560"` and `background_color: "#1a1a2e"`; `index.html` has `<meta name="theme-color" content="#1a1a2e">`
**Why it hurts:** all three values are Commander-era. The browser chrome is navy and the installed app's splash screen is navy — on a parchment app that is the first thing a new user sees before the UI even paints. The manifest's `theme_color` (`#e94560`) doesn't match the meta tag (`#1a1a2e`) either, so Android and browser chrome disagree with each other.
**Fix:** set `theme_color` and `background_color` to the parchment values (`#f6f1e7` / `#e0533c`), and drive `meta[name="theme-color"]` from the active theme in JS so it tracks the toggle.
**Effort:** S

### P2-16 · Google Fonts are loaded twice
**Where:** `index.html` has a `<link>` to `fonts.googleapis.com` **and** `src/index.css` has an `@import` of the same URL
**Why it hurts:** duplicate requests, plus a render-blocking third-party dependency that breaks the offline PWA the `sw.js` service worker is presumably there to provide.
**Fix:** keep one. Prefer self-hosting the four families (Press Start 2P, VT323, Pixelify Sans, DM Sans) — they're small and it removes the render-blocking third-party request.
**Effort:** M

### P2-17 · The same action is styled three different ways on Bookmarks
**Where:** `src/pages/BookmarksPage.tsx:185-191` (`+ FOLDER`, accent-2), `:192-198` (`ADD BOOKMARK`, `bg-accent`), `:268-273` (the same "add bookmark" action again, in accent-2)
**Fix:** one primary button component, one accent.
**Effort:** S

### P2-18 · User-chosen category colours bypass contrast rules
**Where:** `src/components/tasks/CategoryCard.tsx` applies the category colour raw as `borderTop: 4px solid <color>`; `BookmarksPage.tsx:232`, `:299-301` do the same for folders
**Why it hurts:** a light custom colour disappears against a light surface. Nothing validates the pick.
**Fix:** constrain the palette to theme tokens (the Settings swatches at `:748-752`, `:808-812` already define a good set) rather than a free colour picker.
**Effort:** M

### P2-19 · Progress bars show a fake minimum
**Where:** `src/components/tasks/CategoryCard.tsx` — `width: ${Math.max(percent, 3)}%`
**Why it hurts:** a category with zero completed tasks still renders 3% filled, implying progress that doesn't exist.
**Fix:** render 0% as 0%; keep the track visible instead.
**Effort:** S

### P2-20 · `transition: all` on every button
**Where:** `src/index.css:462-465` — `button { transition: all 0.1s ease; }`
**Why it hurts:** `all` animates layout properties (width, height, padding), which causes avoidable reflow and fights the sprite `border-image` scaling. It also makes hover transitions feel mushy at 100ms.
**Fix:** transition only `background-color`, `border-color`, `color`, `opacity`, `transform`.
**Effort:** S

### P2-21 · The `--shadow` token is defined but never used
**Where:** `src/index.css:25`, `:54`, `:84` define `--shadow`; `BoardPage.tsx:270` (`:shadow-lg`) and `:334` (`:shadow-xs`) use raw Tailwind shadows instead
**Fix:** consume the token, or delete it.
**Effort:** S

### P2-22 · Native `confirm()` breaks the theme and blocks the UI
**Where:** `src/pages/BookmarksPage.tsx:150`, `src/components/tasks/CategoryCard.tsx:133`
**Fix:** replace with the retro-styled dialog from P1-6.
**Effort:** S (once P1-6 lands)

### P2-23 · The weekly-report reminder has no in-app presence
**Where:** `src/components/WeeklyReportReminder.tsx:5-8` renders `null`; `src/hooks/useWeeklyReportReminder.ts:22-70` only fires a desktop notification, and only if permission was already granted
**Why it hurts:** there's no banner, badge, or in-app prompt telling a user their report is ready — and no way to grant permission from the UI.
**Fix:** surface a dismissible banner on the Dashboard, with a "Enable reminders" action.
**Effort:** M

### P2-24 · PomodoroPage hardcodes a viewport offset
**Where:** `src/pages/PomodoroPage.tsx` — `min-h-[calc(100vh-60px)]`
**Why it hurts:** 60px is a guess at the header height; it drifts on mobile where the nav is 56px and the header wraps.
**Fix:** use flexbox to fill the viewport instead of arithmetic.
**Effort:** S

---

# Wave 3 — P3: refinement and performance

### P3-1 · The main bundle is 1.37 MB (368 KB gzipped)
`npm run build` warns that chunks exceed 500 kB. `recharts` and `framer-motion` dominate. **Fix:** route-level `React.lazy` for Stats / Weekly Report / Bookmarks, and lazy-load `recharts` only on the Stats route. **Effort:** M · **Impact:** meaningful on mobile and poor connections.
**Status:** ✅ **Done** — see *Wave 3 — what changed*.

### P3-2 · The theme toggle's label is cryptic
`src/components/ModeToggle.tsx:35` renders "THEME: CENTER" / "THEME: CMD" at `text-[6px]`. The `title` attribute explains it, but the visible label needs decoding. **Fix:** "PIXEL CENTER" / "COMMANDER", or a sun/moon pair with a tooltip. **Effort:** S

### P3-3 · Seven items in a 56px mobile bar
`src/components/Layout.tsx` — the mobile bottom nav renders all seven destinations in `h-14`, with labels at `text-[6px]`. **Fix:** four primary items + a "more" sheet, or drop labels and rely on icons with a larger tap area. **Effort:** M
**Status:** ✅ **Done** — the bar now carries four destinations plus MORE.

### P3-4 · Mode-specific body font switching
`--font-body` is Press Start 2P in Commander and DM Sans in Pixel Center, so any unstyled text changes typeface with the theme. **Fix:** keep body copy on one font across both themes and use the pixel font strictly for chrome. **Effort:** S

---

# Wave 4 — Mobile: the app did not fit a phone

> **Implementation status — Wave 4 complete.** All seven pages verified at 375px and 320px with
> `scripts/mobile-audit.mjs`; zero horizontal overflow on every page.

The app was built for a desktop viewport and simply did not fit on a phone. This wave is the mobile
pass: it fixes the layout defects, replaces the cramped seven-item bottom bar, and takes the
charting library out of the first download.

### M-1 · The root cause: a flex item that refused to shrink
`src/components/Layout.tsx` — the main content column was `flex-1` **without `min-w-0`**. A flex item
defaults to `min-width: auto`, so the widest card in any page forced the column wider than the phone
viewport, and the root's `overflow-hidden` silently **clipped** the overflow instead of letting the
page scroll. Every page was affected; the clipping was simply invisible in code review.

**Fix:** `min-w-0` on the content wrapper and on `<main>`, the root changed from `w-screen` to `w-full`,
and `overflow-x-hidden` on `<main>` so a stray wide child can never widen the page again.
**Effort:** S · **Impact:** the single largest mobile defect in the app.

### M-2 · The floating theme toggle sat on top of every page title
`src/components/Layout.tsx` — a `md:hidden fixed top-2 right-2` `ModeToggle` overlapped the `<h1>` on
Tasks, Board, Bookmarks and Settings.

**Fix:** removed. The theme toggle now lives in the MORE sheet, where it has room to be labelled.
**Effort:** S

### M-3 · Seven destinations in a 375px bar — the last one was cut off
Seven items at `px-3` measured **378px** inside a 375px viewport, so the seventh was clipped by 3px on
every page, and the labels at `text-[6px]` were unreadably cramped.

**Fix:** the bar now carries **TASKS · BOARD · FOCUS · STATS · MORE**. The four primary items get a
full 75px-wide tap target (well above the 44px minimum), and MORE opens a bottom sheet holding
*TABS & BOOKMARKS*, *WEEKLY REPORT*, *SETUP*, the sound toggle, the theme toggle, the keyboard
shortcuts reference and the sync status. The sheet reuses the shared `Dialog` primitive with a new
`align="bottom"` mode, so it inherits the focus trap, focus restore, Escape and scroll lock.
**Files:** `src/components/Layout.tsx`, `src/components/MobileMoreSheet.tsx` (new),
`src/components/ui/Dialog.tsx`, `src/components/ui/PixelIcon.tsx` (new `menu` icon).
**Effort:** M

### M-4 · The Bookmarks collection row ran off the right edge
`src/pages/BookmarksPage.tsx` — the folder list was a single horizontal strip with `shrink-0` rows, so a
folder named "READING AND RESEARCH MATERIALS" measured `right=496` on a 375px screen.

**Fix:** on mobile the collection list wraps into a two-up grid with truncated names; desktop keeps the
vertical sidebar. **Effort:** S

### M-5 · The Tasks quick-add "+ ADD" button was cut off
`src/pages/DashboardPage.tsx` — the quick-add row held two fixed-width `<select>`s plus the submit
button in a non-wrapping flex row.

**Fix:** the row wraps, both selects are `flex-1 min-w-0`, and the button is `shrink-0`.
**Files:** `src/pages/DashboardPage.tsx`. **Effort:** S

### M-6 · The toast was rendered underneath the bottom nav and the window dock
`src/components/ui/Toast.tsx` — the toast was `fixed bottom-4 right-4 z-50`, the same place as the
56px bottom bar and the `RetroWindowDock` (`fixed bottom-14`). On a phone the toast — including its
UNDO button — was unreachable.

**Fix:** on mobile the toast sits at `bottom-24`, full width, and the dock scrolls sideways in a single
row instead of wrapping. **Files:** `src/components/ui/Toast.tsx`, `src/components/tasks/RetroWindowDock.tsx`.
**Effort:** S

### M-7 · `100vh` counted the browser chrome the user could not see
`src/pages/PomodoroPage.tsx:98` used `min-h-[calc(100vh-60px)]` — a hardcoded guess that drifts, and on
mobile `vh` includes the browser UI that is not actually visible.

**Fix:** `min-h-[calc(100dvh-60px)]`. **Effort:** S

### M-8 · Long headers and titles could not wrap
The Pomodoro terminal header and the Weekly Report `<h1>` were fixed-width flex rows with no
`min-w-0`, so a long title forced the row wider than the screen.

**Fix:** `min-w-0` + `break-words` on the text, `shrink-0` on the controls, `flex-wrap` on the icon row.
**Files:** `src/pages/PomodoroPage.tsx`, `src/pages/WeeklyReportPage.tsx`, `src/pages/BookmarksPage.tsx`.
**Effort:** S

### M-9 · The "stop animations" preference did not reach framer-motion or recharts
`src/context/DesignModeContext.tsx` applied `stop-animations`, which only mutes **CSS** animations.
The `Dialog` sheet and every **recharts** bar still animated in, so a user who asked for reduced motion
still got a moving UI — and the bars grew in from zero height.

**Fix:** `Dialog` takes its enter/exit transform from `animationsEnabled`, and every `Bar`/`Pie` sets
`isAnimationActive={animationsEnabled}`. **Files:** `src/components/ui/Dialog.tsx`,
`src/pages/StatsPage.tsx`, `src/components/tasks/WeeklyCompletionChart.tsx`. **Effort:** S

### M-10 · The Stats x-axis labels overlapped each other
Thirty days of "Wed, Sep 23" labels collided on a 375px screen.

**Fix:** the axis shows a short `Sep 23`; the full weekday + date moved into the tooltip.
**Files:** `src/pages/StatsPage.tsx`. **Effort:** S

### M-11 · The charting library was in the first download
`recharts` (410 KB / 111 KB gzipped) was pulled into the initial bundle because the Dashboard renders
`WeeklyCompletionChart` — so a phone downloaded 111 KB of charting code to display a to-do list.

**Fix:** every route is `React.lazy`; the chart component is lazy inside the Dashboard; and
`vite.config.js` splits `charts`, `firebase`, `motion` and `react` into their own long-cached chunks.

| | Before | After |
|---|---|---|
| Main bundle | **1,382 KB** (372 KB gzip) | **106 KB** (31 KB gzip) |
| First download (Tasks route) | 1,382 KB | **106 + 143 + 114 + 56 KB** (react, motion, dashboard) |
| Charts chunk | in the main bundle | **410 KB**, loaded only with a chart |
| Firebase chunk | in the main bundle | **445 KB**, its own cacheable chunk |

**Files:** `src/App.tsx`, `src/pages/DashboardPage.tsx`, `vite.config.js`. **Effort:** M

### Wave 3 — what changed

| Finding | Closed by | File |
|---|---|---|
| P3-1 | Every route is `React.lazy`; `WeeklyCompletionChart` is lazy inside the Dashboard; `charts` / `firebase` / `motion` / `react` are split into their own chunks | `src/App.tsx`, `src/pages/DashboardPage.tsx`, `vite.config.js` |
| P3-3 | Four primary items + a MORE bottom sheet built on the shared `Dialog` with `align="bottom"` | `src/components/Layout.tsx`, `src/components/MobileMoreSheet.tsx` |
| M-1 | `min-w-0` on the content column and `<main>`; root `w-screen` → `w-full` | `src/components/Layout.tsx` |
| M-2 | The floating toggle is gone; the theme toggle moved into the MORE sheet | `src/components/Layout.tsx` |
| M-4 | Collection list wraps into a two-up grid on mobile, names truncate | `src/pages/BookmarksPage.tsx` |
| M-5 | Quick-add row wraps; both selects are `flex-1 min-w-0` | `src/pages/DashboardPage.tsx` |
| M-6 | Toast sits above the nav and dock on mobile; the dock scrolls sideways | `src/components/ui/Toast.tsx`, `src/components/tasks/RetroWindowDock.tsx` |
| M-7 | `100vh` → `100dvh` | `src/pages/PomodoroPage.tsx` |
| M-8 | `min-w-0` + `break-words` on long headers | `src/pages/{PomodoroPage,WeeklyReportPage,BookmarksPage}.tsx` |
| M-9 | `Dialog` and every `Bar`/`Pie` honour the animation preference | `src/components/ui/Dialog.tsx`, `src/pages/StatsPage.tsx`, `src/components/tasks/WeeklyCompletionChart.tsx` |
| M-10 | Short axis labels, full date in the tooltip | `src/pages/StatsPage.tsx` |
| M-11 | Route-level code splitting + vendor chunking | `src/App.tsx`, `vite.config.js` |

> **The mobile audit harness** (`scripts/mobile-audit.mjs`) renders every route inside a **375px
> iframe** rather than screenshotting a 375px window: headless Chrome clamps the window to a minimum
> width, so a direct screenshot is a crop of a wider layout, not a phone layout. Each run uses a fresh
> Chrome profile, because the HTTP cache otherwise serves the previous run's Vite modules.
>
> ```
> node scripts/mobile-audit.mjs --out "$env:TEMP\mobile-shots" --width 375
> ```
>
> Result at 375px: **7/7 pages with zero horizontal overflow**, including the MORE sheet.

---

# Wave 5 — Type scale: the app had no readable size

*Closed **P2-1** (no type scale), **P2-16** (fonts loaded twice) and **P3-4** (the body font swapped with
the theme). Direction chosen by the product owner: **keep the pixel font** — raise the sizes rather than
introduce a second, non-pixel typeface for content.*

### T-1 · 360 raw `text-[Npx]` declarations, 11 sizes, 5px as the floor
**Evidence:** before this wave, **360** raw arbitrary font sizes across **27 files** — `5px` ×30,
`6px` ×121, `7px` ×124, `8px` ×45, `9px` ×28, `10px` ×11, `12px` ×2. Press Start 2P is roughly one square
em per glyph, so 5–6px is not "small type", it is noise. **115 of the 360** declarations were at 5–6px.

**Fix:** one ladder of seven integer sizes in `@theme` (`src/index.css`), and every declaration migrated
onto it:

| Token | Size | Role | Replaces |
|---|---|---|---|
| `text-micro` | 7px | badges, axis labels, marks | `text-[5px]` |
| `text-label` | 8px | button and field labels | `text-[6px]` |
| `text-caption` | 9px | metadata, helper text | `text-[7px]` |
| `text-small` | 10px | list rows, chips, table cells | `text-[8px]` |
| `text-body` | 11px | default body copy | `text-[9px]` |
| `text-lead` | 12px | lead paragraphs | `text-[10px]` |
| `text-title` | 14px | in-panel headings | `text-[12px]` |

The mapping is a uniform **+2px**, which keeps the ladder monotonic (relative hierarchy is unchanged) and
keeps every step an integer, so the pixel font still rasterises cleanly under `image-rendering: pixelated`.
The `recharts` SVG labels — which take a numeric `fontSize`, not a class — were moved from 8/9px to
10/11px to match.

**Verification:** the audit harness now reports a **font-size histogram and a font-family census** for
every page, and fails the run if any visible text is below **7px**. Current state: the smallest text in
the app is 7px, and there is no sub-7px text on any route.

### T-2 · The body font changed typeface when the theme was toggled
**Where:** `src/index.css` — `--font-body` was `'DM Sans'` in Pixel Center and `'Press Start 2P'` in
Commander. The one element that inherited it rather than opting in with `font-pixel` — the sync card's
description paragraph — was therefore *the only paragraph in the app*, and it changed typeface and
reflowed on every theme toggle. (This is **P3-4**, and the app was not the same app in the two skins.)

**Fix:** `--font-body` is now the pixel font in **both** skins, so every character in the app is
`Press Start 2P` and nothing reflows when the theme changes. Measured on the live DOM: **0 elements**
resolve to any non-pixel family. This also closes the "everything is pixel art" side of **P2-1b**: the
app no longer mixes a proportional paragraph into a pixel interface.

### T-3 · Google Fonts were requested twice, and one of them blocked rendering
**Where:** `index.html:40` had a `<link>` to `fonts.googleapis.com` **and** `src/index.css:2` had an
`@import` of the same URL. The stylesheet therefore fetched the same CSS twice and had to wait on a
render-blocking third-party stylesheet — which is also what broke the offline PWA the service worker is
there to provide.

**Fix:** the `@import` is gone; the document `<link>` (with its two `preconnect`s) is the single
request. `DM Sans` was dropped from the family list entirely — after T-2 nothing uses it, and an unused
`@font-face` is still a wasted request. **Files:** `index.html`, `src/index.css`. **Effort:** S

### T-4 · The build was reading the project documentation as source
**Where:** Tailwind's automatic source detection scans the whole project, so any utility-looking string
in a markdown file became a real CSS rule — the improvement plan quotes `text-[5px]`, `bg-red-600` and
`text-on-dark` as evidence, and the production stylesheet was shipping those rules.

**Fix:** `@import "tailwindcss" source(none);` + `@source ".";` — the stylesheet now scans `src/` only.
**Files:** `src/index.css`. **Effort:** S

### Wave 5 — what changed

| Finding | Closed by | File |
|---|---|---|
| P2-1 | Seven-step integer type scale in `@theme`; all 361 raw `text-[Npx]` migrated (+2px); recharts SVG labels realigned | `src/index.css` + 27 source files |
| P2-1b | `--font-body` is the pixel font in both skins — no proportional content role, no mixed typography | `src/index.css` |
| P2-16 | One font request (document `<link>` only); the duplicate `@import` and the unused `DM Sans` family are gone | `index.html`, `src/index.css` |
| P3-4 | Both skins share one body font — a theme toggle no longer reflows text | `src/index.css` |
| — | Tailwind source detection scoped to `src/`; document text no longer becomes CSS | `src/index.css` |
| — | The audit harness now reports a font-size histogram, a font-family census, and fails on sub-7px text | `scripts/mobile-audit.mjs` |

> **Result:** 375px — 7/7 pages + the MORE sheet, zero horizontal overflow, smallest text 7px.
> 320px — 8/8, zero overflow. 1280px — 8/8, zero overflow.

---

# Wave 6 — Accessibility and consistency

*The two remaining halves of Wave 2. Everything here was verified in the browser, not just by reading
the diff: the confirm dialogs were opened, focused and dismissed with a real CDP session.*

## A — Accessibility

### A-1 · The form labels were not associated with their fields
**Evidence:** in every form, the `<label>` was a **sibling** of the input, not a wrapper, and carried no
`htmlFor` — so the control had no accessible name at all. Settings had six such fields, Bookmarks six,
the task and category modals six, the Weekly Report two. The Pomodoro task `<select>` had **no label
whatsoever**, only a `-- Switch Task --` placeholder.

**Fix:** every field now has an `id` and a matching `htmlFor`. The Obsidian vault path is marked
required (it has always been functionally required) and the category colour swatches became a labelled
group (`role="group"` + `aria-labelledby`) with `aria-label` and `aria-pressed` on each swatch.
**Files:** `src/pages/{SettingsPage,BookmarksPage,WeeklyReportPage,PomodoroPage}.tsx`,
`src/components/tasks/{TaskModal,CategoryModal}.tsx`. **Effort:** M

### A-2 · 33 icon-only buttons had no accessible name
`title` is not an accessible name (it is unreliable for screen readers and invisible on touch). Every
icon-only button now carries an `aria-label`, including the ones that had no `title` at all. The
Bookmarks folder-delete button was additionally `opacity-0 group-hover:opacity-100` — keyboard and
touch users never saw it; it is now always visible at low opacity and strengthens on hover/focus.
**Effort:** S

### A-3 · Hit targets were well under 32px
The task checkbox was a 16px box, the Board column `+` was 24px, the row edit/delete glyphs were about
20px, and the small action chips were ~18px tall. On the phone these were the hardest things in the app
to hit.

**Fix:** the *hit area* was raised to 32×32 without changing the pixel artwork — the checkboxes are now
a 32px button wrapping the original 16/20px box, and the icon buttons are 32px with the glyph centred.
**Files:** `src/pages/BoardPage.tsx`, `src/components/tasks/{TaskItem,CategoryCard,CategoryWindow,RetroWindowDock}.tsx`,
`src/pages/BookmarksPage.tsx`. **Effort:** M

### A-4 · Two native `confirm()` calls broke the theme and blocked the UI
`CategoryCard` (delete category) and `BookmarksPage` (delete folder) called the browser's own
`confirm()`. Those are unstyled, block the whole UI, announce nothing useful, and cannot be themed.

**Fix:** both now open the app's own `Dialog` — themed, focus-trapped, Escape-closable, with the
destructive action in `--danger`. **Files:** `src/components/tasks/CategoryCard.tsx`,
`src/pages/BookmarksPage.tsx`. **Effort:** S

### A-5 · The dialog was trapped inside transformed containers
`position: fixed` does not escape an ancestor that creates a containing block, and plenty of things in
this app are transformed (the category carousel slides, the panels animate). A dialog rendered inside
one of those would have been clipped and mis-positioned.

**Fix:** the shared `Dialog` now renders through `createPortal` into `<body>`, so it is full-screen
wherever it is declared. **Files:** `src/components/ui/Dialog.tsx`. **Effort:** S

### A-6 · Text could not be selected anywhere
`select-none` sat on the app root, so users could select category names but not task titles, stats or
report text — the opposite of the useful behaviour.

**Fix:** selection is now suppressed on chrome only (`button`, the nav) and everything that is content
is selectable. **Files:** `src/components/Layout.tsx`, `src/index.css`. **Effort:** S

## B — Consistency

### B-1 · Six sibling sections in six different hues
Setup showed AUDIO in teal, BACKUP in amber, KEYBOARD CONTROLS in muted white and ANIMATION in coral;
the Weekly Report ran four hues across five headings; the Board columns were coral/teal/purple.
Nothing read as primary, because nothing was.

**Fix:** one `--heading` token for every sibling section heading, and the accent hues are reserved for
interactive elements. **Files:** `src/index.css`, `src/pages/{SettingsPage,WeeklyReportPage}.tsx`,
`src/components/tasks/CategoryWindow.tsx`. **Effort:** S

### B-2 · Field labels and focus rings changed hue from field to field
Four different label hues and four different focus-border hues — no two fields in the same form looked
like they belonged together.

**Fix:** one label colour (`--muted`) and one focus colour (the accent) across every form.
**Files:** `src/pages/{SettingsPage,BookmarksPage,BoardPage,WeeklyReportPage,DashboardPage}.tsx`,
`src/components/tasks/{TaskModal,CategoryModal,CategoryCard,CategoryWindow}.tsx`. **Effort:** S

### B-3 · Two competing primary buttons on the Tasks screen
"+ NEW TASK" (solid coral) and "+ CATEGORY" (solid teal) sat side by side. The Board screen already had
exactly one primary.

**Fix:** NEW TASK stays solid; "+ CATEGORY" is now the secondary `retro-btn`. **Files:**
`src/pages/DashboardPage.tsx`. **Effort:** S

### B-4 · Five saturated stat cards, and STREAK wearing the destructive red
The row was a rainbow of equal-weight cards with no primary metric — and STREAK, a positive metric, was
painted in `--danger`, the same red the app uses for destructive actions.

**Fix:** TOTAL is neutral, COMPLETED is success, PENDING is warn, **PROGRESS is the single primary**
(accent), STREAK is `--accent-2`. **Files:** `src/components/tasks/StatsCards.tsx`. **Effort:** S

### B-5 · The Bookmarks screen had its own colour system
Eight Tailwind-500 hexes (`#6366f1`, `#f59e0b`, `#10b981` …) that belong to neither skin — on parchment
two of them sat under 3:1. The same list was the default category colours in the task manager.

**Fix:** every swatch — bookmark folders, new folders, category presets, and the defaults — now uses
the app's own Pixel Center token values. **Files:** `src/pages/BookmarksPage.tsx`,
`src/components/tasks/CategoryModal.tsx`, `src/hooks/useTaskManager.ts`,
`src/components/tasks/CategoryCard.tsx`, `src/pages/DashboardPage.tsx`. **Effort:** S

### B-6 · The Pomodoro status line split one fact across three colours
"● STATUS: PAUSED" (amber), "⏱ FOCUS SESSION" (teal), "SET: 25m / 5m" (muted) — three colours on a
40px line, competing with the timer.

**Fix:** the state colour belongs to the status (success when running, warn when paused) and everything
else on the line is muted. **Files:** `src/pages/PomodoroPage.tsx`. **Effort:** S

### B-7 · A weekly chart was painted in the warning colour
The "WEEKLY COMPLETION %" bars were `--warn` (amber) while the chart below used a categorical palette —
two colour systems on one screen, one of them borrowing the warning hue.

**Fix:** the weekly chart uses the accent, like every other primary series. **Files:**
`src/pages/StatsPage.tsx`. **Effort:** S

### B-8 · The same action was styled three different ways on Bookmarks
"+ ADD FIRST BOOKMARK" was teal, "ADD BOOKMARK" was coral, and "CREATE FOLDER" was teal again.

**Fix:** one accent for the primary action on that screen. **Files:** `src/pages/BookmarksPage.tsx`.
**Effort:** S

### B-9 · A progress bar showed a fake minimum
`width: Math.max(percent, 3)%` — a category with nothing completed still rendered 3% filled, implying
progress that did not exist.

**Fix:** 0% renders as 0%; the track stays visible. **Files:** `src/components/tasks/CategoryCard.tsx`.
**Effort:** S

### B-10 · `transition: all` animated layout properties
Every button animated `width`, `height` and `padding` as well as colour — an avoidable reflow on each
hover, and it fought the sprite border-image scaling.

**Fix:** only the properties that actually change are transitioned.
**Files:** `src/index.css`. **Effort:** S

### B-11 · The `--shadow` token was defined and never used
The hard pixel shadow was hard-coded in the stylesheet while the code used Tailwind's soft shadows.

**Fix:** the token is now the single source of the pixel shadow (`--shadow: 3px 3px 0 var(--line)`) and
`.pixel-border` consumes it. **Files:** `src/index.css`. **Effort:** S

### B-12 · The theme toggle's label needed decoding
"THEME: CENTER" / "THEME: CMD" at 6px.

**Fix:** "PIXEL CENTER" / "COMMANDER". **Files:** `src/components/ModeToggle.tsx`. **Effort:** S

### B-13 · The weekly-report reminder had no in-app presence
`WeeklyReportReminder` rendered `null`, and the hook asked for notification permission on page load —
which browsers refuse without a gesture — so the reminder could never fire for a new user, and nothing
in the app said a report was ready.

**Fix:** the reminder is now a real in-app banner on the Tasks screen ("WEEKLY REPORT READY TO SAVE",
with an OPEN REPORT action and an ENABLE REMINDERS button that grants permission from a user gesture),
and the permission is never requested on load. The schedule is a singleton, so the app shell and the
banner cannot fire two notifications for the same window.
**Files:** `src/hooks/useWeeklyReportReminder.ts`, `src/components/WeeklyReportReminder.tsx`,
`src/components/WeeklyReportBanner.tsx` (new), `src/pages/DashboardPage.tsx`. **Effort:** M

### Wave 6 — what changed

| Finding | Closed by | File |
|---|---|---|
| P2-4, P2-4b | One `--heading` token; one primary button on Tasks | `src/index.css`, `src/pages/{SettingsPage,WeeklyReportPage,DashboardPage}.tsx` |
| P2-5 | PROGRESS is the primary stat; STREAK is `--accent-2` | `src/components/tasks/StatsCards.tsx` |
| P2-6 | One label colour, one focus colour | 8 source files |
| P2-7, P2-18 | Every swatch uses the app's own tokens | `src/pages/BookmarksPage.tsx`, `src/components/tasks/CategoryModal.tsx`, `src/hooks/useTaskManager.ts` |
| P2-7c, P2-7e | Weekly chart in the accent; one status colour on the Focus HUD | `src/pages/{StatsPage,PomodoroPage}.tsx` |
| P2-10 | 32×32 hit targets | 5 source files |
| P2-11 | `id` + `htmlFor` on every field; labelled colour group | 6 source files |
| P2-12 | 33 `aria-label`s; the hover-only delete button is always visible | 10 source files |
| P2-14 | `select-none` moved from the root to chrome only | `src/components/Layout.tsx`, `src/index.css` |
| P2-17, P2-20, P2-21 | One accent per action; explicit transitions; the `--shadow` token consumed | `src/pages/BookmarksPage.tsx`, `src/index.css` |
| P2-22 | Native `confirm()` → the app's own `Dialog` | `src/components/tasks/CategoryCard.tsx`, `src/pages/BookmarksPage.tsx` |
| P2-23 | The weekly-report banner, and permission asked from a gesture | `src/hooks/useWeeklyReportReminder.ts`, `src/components/WeeklyReportBanner.tsx` |
| P3-2 | "PIXEL CENTER" / "COMMANDER" | `src/components/ModeToggle.tsx` |

> **Verified in a live browser session** (CDP): the category-delete dialog opens as exactly one
> `role="dialog"` with `aria-modal="true"`, a correct `aria-labelledby`, focus moved to CANCEL, and
> Escape closes it; the folder-delete dialog behaves the same and cancelling leaves every folder in
> place; the shortcuts guide still opens as exactly one dialog; the weekly banner appears when the
> save window is open, causes no overflow at 375px, and dismisses.
>
> **Audits:** 375px — 8/8 zero overflow · 320px — 8/8 zero overflow · 1280px — 8/8 zero overflow.

---

# Wave 7 — Weekly report automation, sync gaps and sprite uniqueness

*Three questions from the product owner: can the Sunday save be automatic? is the data actually
synced? and is any of the pixel art drawn twice?*

## 1 · The weekly report could be automatic — and now is

**Where it stood:** the save window opens on the configured day (Sunday 22:00 by default) and closes
Monday 00:00. The `.md` was written **only** when someone clicked SAVE on the Weekly Report page, and
the first save had to pick a vault folder by hand. The only nudge was a desktop notification that
fired *only if* the browser already had notification permission — and nothing in the app ever asked
for it, so in practice it never fired for a new user.

**Why it can be automatic:** the picked folder handle is persisted in IndexedDB, and once the browser
has granted write permission for it, `queryPermission()` keeps returning `granted` across sessions.
Writing the file then needs no user gesture at all.

**Fix:**
- **AUTO-SAVE WEEKLY REPORT** toggle on the Weekly Report page (off by default — it writes a file
  into the user's vault without being asked). When the window opens, the app writes last week's
  report by itself, marks the week saved and tells the user.
- The permission check used by the auto-save **never prompts** (`hasVaultPermission()`), so a
  revoked permission means the auto-save quietly does nothing instead of throwing a dialog.
- **SEND TEST NOTIFICATION** on the same screen: asks for permission from a real user gesture and
  immediately proves the reminder works, so the Sunday nudge is not a surprise.
- Notifications are raised through the **service-worker registration** when there is one, so they
  survive the page being backgrounded and carry the app icon; the plain `Notification` constructor
  is the fallback.
- The in-app banner is **sticky**: dismissing it hides it until the *next* report is pending, so a
  week cannot slip past silently.

**Files:** `src/hooks/useWeeklyReportReminder.ts`, `src/components/WeeklyReportBanner.tsx`,
`src/pages/WeeklyReportPage.tsx`, `src/utils/{obsidian-archive,notifications}.ts`.

## 2 · No, it was not syncing properly — now it is

**What was mirrored to Firestore:** tasks, streak, activity and the completion history. **What was
not:** bookmarks and folders, the weekly-report buffer (the thing the `.md` is generated from), the
pomodoro daily history (the Stats chart), the save schedule and the last-saved marker. The report
buffer being local-only is exactly why the `.md` could only ever be produced on the device that
recorded the activity.

**Fix:**
- Bookmarks and folders now use `useSyncedStorage`, so they stream between devices like the tasks do.
- The report buffer became **one map** (`pixel_report_buffer`) instead of one localStorage key per
  day, and it is mirrored to Firestore. Legacy per-day keys are merged in on read, so nothing is
  lost.
- The pomodoro history and the save schedule are mirrored the same way.
- The plain-function storage utilities cannot call `useSyncContext()` (they run from context
  callbacks, not components), so a small **cloud bridge** (`src/utils/cloudBridge.ts`) hands them the
  same writer the hooks use.
- On sign-in the provider **pulls and merges**: the report buffer is a union (every device
  contributes the days it recorded), the pomodoro history takes the larger count per day, and the
  save schedule is last-write-wins with the cloud copy winning.

**Files:** `src/utils/cloudBridge.ts` (new), `src/utils/weekly-report.ts`,
`src/context/SyncContext.tsx`, `src/services/syncKeys.ts`, `src/pages/BookmarksPage.tsx`.

## 3 · Eleven sprites were drawn twice

**Measured, not guessed:** every sprite in both libraries was parsed and compared pixel by pixel.

| | Before | After |
|---|---|---|
| Emoji library | 30 sprites | 30 sprites |
| Icon library | 24 sprites | **13 sprites** |
| Concepts drawn in **both** libraries | 11 | **0** |
| Identical art anywhere in the app | 11 | **0** |
| Silhouettes reused for different concepts | 0 | **0** |

The eleven — clipboard, board, bookmark, tomato, gear, flame, target, hourglass, trophy, floppy and
bell — were byte-identical in shape but had **different palettes**: the emoji library used theme
slots (`$ink`, `$dark`, `$mid`), the icon library used hard-coded hexes. So the same "gear" looked
different in the sidebar than on the Setup screen, and the two copies could silently drift apart.

**Fix:** the icon library now imports the canonical definitions from the emoji library, and both
render through one shared theme resolver (`src/components/ui/spriteTheme.ts`). The remaining
icon-only sprites keep their art but their outline now follows the theme (`$ink`) instead of a
hard-coded navy. One concept, one drawing, one palette.

*Checked and left alone:* the near-identical silhouettes inside the emoji library (a `bookmark` and
a `calendar` are both 85% rectangle) are not duplicates — printed side by side they are clearly
different objects. The seven PNG frames in `public/pixel-ui/` are all distinct by hash.

---

## Recommended execution order


| Step | Work | Effort | Why now |
|---|---|---|---|
| **1** | **P0-1** (default theme + FOUC + splash) | ~1h | One product decision, four small edits. Do it first — it changes what "correct" means for everything below, and it removes a visible flash on every first load. |
| **2** | P0-2 … P0-15 (default-theme defects) | ~2–3 days | Mostly CSS, but P0-2 needs a decision: tokenise `.pixel-btn` or fix its label colours, and P0-3 needs one new sprite asset. Do them together — they touch the same tokens. |
| **3** | P1-9 (task form reset), P1-10 (dead edit button), P1-11 (sync label), P1-16 (false toast) | ~2h | Tiny, unambiguous bugs with no design decisions. |
| **4** | P1-1 … P1-6 (keyboard & dialog) | ~2 days | One pass over focus handling, one shared `Dialog` primitive. |
| **5** | P1-7, P1-8, P1-14, P1-15 (feedback & toasts) | ~1 day | Shared `ActionButton` + undo-toast pattern. |
| **6** | P2-1 + P2-1b (type scale, split chrome vs content) + P2-2 (page shell) | ~3 days | The two largest refactors. Doing them after 1–5 means you're not re-fixing the same files twice. |
| **7** | P2-3 … P2-24 | ~3 days | Consistency sweep. |
| **8** | P3-1 … P3-4 | ~1 day | Performance and polish. |

**The one architectural decision that pays for itself:** before Wave 2, extract three shared primitives — a `Button` (variants + focus + active + loading), a `Dialog` (focus trap + ESC + restore), and a type-scale token set. Roughly 150 of the findings above collapse into "use the primitive" once those exist.

> **All three are now in place:** `Dialog` (P1-6), `ActionButton` (P1-15) and the type-scale token set (Wave 5).
> The type scale went in before the remaining P2 work on purpose: the accessibility and consistency fixes
> (hit targets, one heading hue, one primary button) all change how much room a label needs, and doing them
> on top of the final ladder means they are sized once rather than twice.

### Wave status

| Wave | Findings | Status | Notes |
|---|---|---|---|
| **0 — P0** | 15 | ✅ **Done** | Default theme is Pixel Center with no flash of the wrong skin. All contrast fixes verified in-browser at 375px and 1280px. |
| **1 — P1** | 18 | ✅ **Done** | Two shared primitives landed: `Dialog` (focus trap, focus restore, Escape, scroll lock, dialog semantics) and `ActionButton` (pending state). Undo-toasts for task and bookmark deletes, real radio controls for theme and animations, a global focus ring, a guarded shortcut handler, and a working `N` shortcut. |
| **2 — P2** | 30 | ✅ **Done** | The type scale (**P2-1**), the font loading (**P2-16**) and the body font (**P2-1b**) landed in Wave 5; the accessibility and consistency findings landed in Wave 6. Every P2 finding in this document is now closed. |
| **3 — P3** | 4 | ✅ **Done** | Code-splitting (**P3-1**) and the mobile nav (**P3-3**) in the mobile wave; the body font (**P3-4**) in Wave 5; the theme-toggle label (**P3-2**) in Wave 6. |
| **4 — mobile** | 11 | ✅ **Done** | Every page fits a 375px phone with zero horizontal overflow. New bottom nav + MORE sheet, the `min-w-0` root cause fixed, the charting library out of the first download. |
| **5 — type scale** | 5 | ✅ **Done** | 361 raw `text-[Npx]` declarations replaced by a seven-step integer ladder; the smallest text in the app is now 7px instead of 5px; the whole app renders in one pixel font; one font request instead of two. |
| **6 — a11y & consistency** | 19 | ✅ **Done** | Every field labelled, 33 icon buttons named, 32px hit targets, native `confirm()` replaced by the app's dialog, one heading colour, one primary button, one accent per action, and the weekly-report reminder finally visible in the app. |
| **7 — automation, sync, art** | 3 | ✅ **Done** | The weekly `.md` can now be written automatically when the save window opens; the report buffer, pomodoro history, save schedule and bookmarks all sync to Firestore; eleven sprites that were drawn in both libraries now have one definition and one palette. |

**One knock-on change to note:** Commander's `--on-accent` moved from `#ffffff` to `#1a1625`. White on the coral fill was only 3.83:1; near-black on coral is 4.63:1, and it keeps the brand coral untouched. Dark labels on saturated fills are also consistent with the sprite buttons, whose Kenney art is light.

**Wave 1 — how each P1 finding was closed:**

| Finding | Closed by | File |
|---|---|---|
| P1-1 | Theme and animation cards are real `<label for>` + `<input type="radio">` pairs with live `onChange` | `src/pages/SettingsPage.tsx` |
| P1-2 | Board task title is a real `<button>` inside the `<h3>` | `src/pages/BoardPage.tsx` |
| P1-3 | Shortcut handler ignores typing targets, modifier combos, open dialogs and activatable targets | `src/hooks/useKeyboardShortcuts.tsx` |
| P1-4 | `N` now opens the new-task dialog via a request bus the Dashboard listens on | `src/utils/taskModalRequests.ts`, `src/pages/DashboardPage.tsx` |
| P1-5 | Global `button:focus-visible` ring in `--accent`; inputs keep their border-swap treatment | `src/index.css` |
| P1-6 | One `Dialog` primitive: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, focus restore, Escape, scroll lock | `src/components/ui/Dialog.tsx` |
| P1-7 | Task delete shows a 7s UNDO toast; `restoreTask` keeps the original id and index | `src/components/tasks/TaskItem.tsx`, `src/hooks/useTaskManager.ts` |
| P1-8 | Bookmark and folder delete both show an UNDO toast | `src/pages/BookmarksPage.tsx` |
| P1-9 | Task form resets on `editingTaskId` change, not on any task mutation | `src/components/tasks/TaskModal.tsx` |
| P1-10 | Category window edit button opens a real `TaskModal` | `src/components/tasks/CategoryWindow.tsx` |
| P1-11 | Sync label distinguishes local / syncing / synced / offline | `src/components/Sidebar.tsx`, `src/context/SyncContext.tsx` |
| P1-12 | Sidebar footer shows the data location with a status dot and tooltip | `src/components/Sidebar.tsx` |
| P1-13 | Confetti is gated on the animation preference | `src/utils/confetti.ts` |
| P1-14 | Toasts gained a `warn` state; errors use `--danger` | `src/components/ui/Toast.tsx` |
| P1-15 | Shared `ActionButton` with a pixel spinner and `aria-busy`, applied to every async mutation | `src/components/ui/ActionButton.tsx` |
| P1-16 | Clipboard write is awaited; failure shows an error toast | `src/pages/BookmarksPage.tsx` |
| P1-17 | Category title is a button that renames; the window toggle is a separate explicit control | `src/components/tasks/CategoryCard.tsx` |
| P1-18 | Folder-delete confirmation now says the bookmarks move to WORK | `src/pages/BookmarksPage.tsx` |

---

## Verification checklist

After each wave, confirm:

- [ ] **Clear localStorage and hard-reload: the first painted frame is parchment — no dark flash** (P0-1)
- [ ] **Start the timer and read the button: the PAUSE label is legible** (P0-2)
- [ ] Toggle to Pixel Center on every page: no invisible buttons, no near-black-on-near-black text, no lost panel outlines
- [ ] Toggle to Commander (secondary skin): native selects, spinners, time picker and scrollbars are dark
- [ ] **Sample every `.pixel-btn` label against its actual sprite pixel** (START/PAUSE/RESET/SKIP on Focus, both SAVE buttons on Weekly Report) — ≥ 4.5:1 in both themes
- [ ] **Confirm every `.pixel-frame` panel still has a visible edge** on parchment — the silver sprite is 1.03:1 there
- [ ] Tab through every page: a visible focus ring on every interactive element, no traps, order is logical
- [ ] Open every modal: focus moves in, ESC closes, focus returns to the trigger, background doesn't scroll
- [ ] Toggle "Stop animations": no confetti, no bouncing, no CRT animation anywhere
- [ ] Complete a task while editing another: the edit form keeps its content
- [ ] Run axe DevTools on all seven pages: zero critical violations
- [ ] Check every token pair at 4.5:1 (body) / 3:1 (large text) in **Pixel Center** (the default) and in Commander
- [ ] Resize to 375px: no horizontal overflow on any page
- [ ] **Read every screen at 1×: no text is smaller than 7px, and every character is in the pixel font** (Wave 5 — the audit harness fails the run on either)
- [ ] Delete a task, a bookmark, and a category: each is recoverable or clearly confirmed
- [ ] Read every chart: the legend describes the bars that are actually drawn
- [ ] Press `N` on any page: the new-task dialog opens (P1-4)
- [ ] Press `Space` while a button is focused: the button activates, the timer does not start (P1-3)
- [ ] Click a theme card with the mouse, then with the keyboard: both switch skins (P1-1)
- [ ] Trigger a slow action (save a bookmark, test the Obsidian gateway): the button shows a spinner and is disabled until it finishes (P1-15)
- [ ] Delete a task: the toast offers UNDO, and undoing restores the task in its original position (P1-7)
- [ ] Complete a task while another task's edit form is open: the form keeps its content (P1-9)

### Wave 1 — what was verified, and how

| Behaviour | Evidence |
|---|---|
| Pixel Center is the default skin | First painted frame is parchment on a clean origin; `html.mode-pixel-center` |
| Theme cards are real radio controls | `#theme-pixel-center` / `#theme-commander` are `<input type="radio" name="designTheme">`; clicking `#theme-commander` set `html.mode-commander`, and the card `<label for="theme-commander">` switched back |
| `Dialog` is a real dialog | Accessibility tree reports `role="dialog"`, `tabindex="-1"`, a labelled close button (`aria-label="Close save bookmark dialog"`) and the title as the accessible name |
| Focus moves into the dialog | The URL field is focused on open, keeping the form's own `autoFocus` |
| Focus is trapped | Tabbing past the last control wrapped back to the close button instead of escaping to the page behind |
| Escape closes | The dialog was gone from the accessibility tree immediately after `Escape` |
| Task title is a real button | `<h3><button type="button" title="Edit task">…</button></h3>` |
| Category title is a real button | `<h2 class="min-w-0"><button type="button" title="Rename category">…</button></h2>` |
| Theme card is a real label | `<label for="theme-commander">` wrapping the radio |
| Pending state ships | `aria-busy` and the `.pixel-spinner` rules are present in the built CSS and bundle |

> **Not confirmed interactively:** focus returning to the trigger when a dialog closes, the spinner during a live
> pending action, and the undo-toast — the in-app browser stopped delivering mouse and keyboard events part-way
> through this pass. Their DOM structure and shipped bundle contents are confirmed; the behaviour itself should be
> eyeballed once in a working browser.

---

## Appendix — evidence index

| Area | Key evidence |
|---|---|
| Theme tokens | `src/index.css:36-63` (commander), `:65-93` (pixel-center), `:95-115` (`@theme`), `:477-517` (mode overrides) |
| **Default theme** | `src/context/DesignModeContext.tsx` (default = `'pixel-center'`, `DesignMode` type exported); `index.html:2` (`class="mode-pixel-center"`), `:15-26` (pre-paint bootstrap from `localStorage['design-mode']`), `:11` (`theme-color #f6f1e7`); `public/manifest.json` (`background_color #f6f1e7`, `theme_color #b53823`); `src/index.css:19-58` (`:root` = Pixel Center, `html.mode-commander` overrides it) |
| Sprite buttons | `src/index.css:177-227` (`.pixel-frame`, `.pixel-btn`), `:230-257` (`.pixel-close`) |
| Sprite true colours | sampled from `public/pixel-ui/*.png` — `panel-frame` `#EEEEEE`, `panel-frame-red` `#E86A17`, `panel-frame-light` `#E5E5E5`, `close` `#1EA7E1` accent |
| Global button rules | `src/index.css:462-469` (`transition: all`, `active: scale(0.95)`) |
| Chart theming | `src/pages/StatsPage.tsx` — `MUTE`, `tipStyle`, `stroke`, series hexes |
| Emoji theming | `src/components/ui/PixelEmoji.tsx` — hardcoded slate palette; `useDesignMode()` at `:994` |
| Focus handling | `src/index.css` (global `button:focus-visible` ring in `--accent`); `src/hooks/useKeyboardShortcuts.tsx` (guards for typing targets, modifier combos, open dialogs, activatable targets) |
| Dialogs | `src/components/ui/Dialog.tsx` (the single primitive — `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, focus restore, Escape, scroll lock); `src/components/ui/Modal.tsx` (renders it); `src/pages/BookmarksPage.tsx` (both overlays migrated) |
| Pending state | `src/components/ui/ActionButton.tsx` (spinner + `aria-busy`); `src/index.css` (`.pixel-spinner` + `prefers-reduced-motion` guard) |
| Sync state | `src/context/SyncContext.tsx` (`isSignedIn`, `authReady`, `syncStatus`); `src/hooks/useSyncedStorage.ts` (silent catch); `src/components/Sidebar.tsx` (data-location footer) |
| Type scale | 344 × `text-[Npx]` across 25 files, 11 distinct sizes |
| Button variants | `src/index.css` (5 variants) vs ~50 raw Tailwind buttons |
| No-op classes | `text-on-dark`, `text-foreground` — absent from `dist/assets/index-BnMYKai-.css` (verified post-build) |
| Contrast | computed WCAG ratios for every token pair on its own surface, in both themes, with Pixel Center treated as the default |
| Dev caching | `public/sw.js:53-70` (cache-first for every GET, including Vite dev modules) — worked around by registering the worker in production only (`index.html:45-56`) |

---

## Appendix — what the screenshots added

Code reading alone would have missed these; each was confirmed against the rendered UI.

| Screen | Observed | Refines |
|---|---|---|
| **All (first load)** | The app opens navy, then flips to parchment | Confirmed **P0-1** — the code defaults to `'commander'` and applies the class post-paint |
| **Focus** | START FOCUS is a saturated orange block; the timer reads "PAUSED" | Confirmed **P0-2** — the sprite is `#E86A17`; the running-state PAUSE label measures **1.01:1** |
| **Focus** | RESET and SKIP are pale grey blocks with unreadable labels | **P0-2** — `--muted` on the silver sprite = 2.22:1 in Commander (passes in Pixel Center) |
| **Focus** | The CRT panel has a bright silver frame | Confirmed **P0-3** — that silver is 1.03:1 on parchment |
| **Focus** | "PIXEL FOCUS TERMINAL" sits in a boxed panel, unlike every other page header | Confirmed P2-2 — the header pattern is different on this screen |
| **Focus** | STATUS amber, FOCUS SESSION teal, SET grey — on one line | New — P2-7e |
| **Weekly Report** | "SAVE_17.10.2026.md" renders as a pale rectangle with unreadable text | Confirmed **P0-2** — white `#fff` on the silver sprite = **1.16:1** in Commander; it declares *no* text colour at all (`WeeklyReportPage.tsx:399`) |
| **Weekly Report** | The "🔒 LOCKED" button is a muddy brown | `disabled:opacity-40` over the orange sprite — the disabled state needs its own treatment, not just opacity |
| **Weekly Report** | Category headings teal, day headings coral | Confirmed P2-4 — multi-hue sibling hierarchy |
| **Weekly Report** | Top bar chart is all-amber; the breakdown below it is 4 colours | New — P2-7c, two chart systems on one page |
| **Weekly Report** | Donut chart pushed right, ~40% dead space | New — P2-7d |
| **Setup** | Four sibling sections in teal / amber / muted / coral | Confirmed P2-4 |
| **Setup** | Keyboard-controls rows have effectively invisible separators | `border-ink/5` — 5% alpha is invisible on both themes |
| **Setup** | The BACKUP description paragraph is the only readable text in the app | New — P2-1b, the type-scale answer is already in the codebase |
| **Setup** | OPTION 1 card is amber-bordered, OPTION 2 teal-bordered | Raw `bg-amber-500/10 border-amber-600` bypasses the token system (P2-6 family) |
| **Setup** | The DAY dropdown and TIME picker are raw native controls | Confirmed **P0-10** — Commander never sets `color-scheme: dark` |
| **Tasks** | "+ NEW TASK" and "+ CATEGORY" are both solid, both saturated | New — P2-4b, two competing primaries |
| **Tasks** | Five stat cards in teal / green / amber / coral / red, STREAK in red | Confirmed P2-5 — and `--danger` on a positive metric |
| **Stats** | Legend says coral = TODAY / teal = PAST DAYS; the bars are teal and purple | New — P2-7b, the legend does not describe the chart |
| **Stats** | Heatmap's darkest green cells are very low contrast | Confirmed P0-8/P0-9 — the hardcoded green scale |
| **Stats** | Chart tooltip is a dark navy box in monospace | Confirmed P0-8 — hardcoded `#0f172a` + VT323, not themed |
| **Bookmarks** | Folder swatches in indigo / amber / emerald / blue / violet / teal | Confirmed P2-7 — a palette that exists in neither theme |
| **Bookmarks** | Every LAUNCH button is a dim coral outline | Low-contrast secondary action; also `text-ink` on coral, which inverts between themes (P0-5 family) |
| **Board** | Column headings coral / teal / purple | Confirmed P2-4 |
| **Board** | The IN PROGRESS empty state is well designed | Worth keeping — it is the app's best empty state and a good template for the others |
| **All** | "DATA: LOCAL" is barely legible bottom-left | Confirmed P1-11 + P0-6 — hardcoded *and* 3.09:1 at 5px on parchment |
