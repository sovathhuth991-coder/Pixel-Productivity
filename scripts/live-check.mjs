// Verify the DEPLOYED app at phone width using the Chrome DevTools Protocol.
//
// CDP's Emulation.setDeviceMetricsOverride gives a true 375px viewport with a
// device pixel ratio — no iframe workaround and no headless minimum-width
// clamp. This is the check that proves the deployed bundle behaves the same
// as the local build.
//
//   node scripts/live-check.mjs [https://dpomodoro-f7b6c.web.app]

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const base = process.argv[2] || 'https://dpomodoro-f7b6c.web.app'
const WIDTH = Number(process.env.VIEWPORT_WIDTH || 375)
const HEIGHT = Number(process.env.VIEWPORT_HEIGHT || 812)
const PORT = 9333 + (process.pid % 200)

const profile = mkdtempSync(join(tmpdir(), 'live-check-'))
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'ignore'] },
)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function fetchJson(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return await res.json()
    } catch {}
    await sleep(250)
  }
  throw new Error(`could not reach ${url}`)
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let id = 0
    const pending = new Map()
    ws.addEventListener('open', () =>
      resolve({
        send(method, params = {}) {
          const msgId = ++id
          return new Promise((res, rej) => {
            pending.set(msgId, { res, rej })
            ws.send(JSON.stringify({ id: msgId, method, params }))
          })
        },
        close: () => ws.close(),
      }),
    )
    ws.addEventListener('error', reject)
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id)
        pending.delete(msg.id)
        if (msg.error) rej(new Error(JSON.stringify(msg.error)))
        else res(msg.result)
      }
    })
  })
}

const PROBE = `(() => {
  const W = ${WIDTH};
  const nav = document.querySelector('nav.md\\\\:hidden');
  const items = nav
    ? [...nav.querySelectorAll('a,button')].map(a => (a.innerText || '').trim().split('\\n').pop())
    : [];
  const more = nav && nav.querySelector('[aria-haspopup="dialog"]');
  if (more) more.click();
  return new Promise(resolve => {
    setTimeout(() => {
      const sheet = document.querySelector('[role="dialog"]');
      const r = sheet && sheet.getBoundingClientRect();
      const over = [];
      document.querySelectorAll('body *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) return;
        if (b.right > W + 1) {
          over.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className || '').toString().slice(0, 70),
            right: Math.round(b.right),
          });
        }
      });
      resolve({
        htmlClass: document.documentElement.className,
        viewport: window.innerWidth,
        navItems: items,
        navWidth: nav ? Math.round(nav.getBoundingClientRect().width) : null,
        moreButton: !!more,
        sheetOpen: !!sheet,
        sheetRect: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width) } : null,
        sheetText: sheet ? (sheet.innerText || '').split('\\n').filter(Boolean).slice(0, 4) : null,
        dialogCount: document.querySelectorAll('[role="dialog"]').length,
        overflow: over.length,
        overflowSample: over.slice(0, 6),
        docScrollW: document.documentElement.scrollWidth,
      });
    }, 1500);
  });
})()`

const ROUTES = [
  ['tasks', '/'],
  ['board', '/board'],
  ['bookmarks', '/bookmarks'],
  ['focus', '/pomodoro'],
  ['weekly', '/weekly'],
  ['stats', '/stats'],
  ['settings', '/settings'],
]

const OVERFLOW_PROBE = `(() => {
  const W = ${WIDTH};
  const over = [];
  document.querySelectorAll('body *').forEach(el => {
    const b = el.getBoundingClientRect();
    if (b.width === 0 || b.height === 0) return;
    if (b.right > W + 1) {
      let p = el.parentElement, scrollable = false;
      while (p && p !== document.body) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll') { scrollable = true; break; }
        p = p.parentElement;
      }
      if (!scrollable) over.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 70),
        right: Math.round(b.right),
      });
    }
  });
  return {
    viewport: window.innerWidth,
    docScrollW: document.documentElement.scrollWidth,
    overflow: over.length,
    overflowSample: over.slice(0, 5),
    dialogCount: document.querySelectorAll('[role="dialog"]').length,
    htmlClass: document.documentElement.className,
  };
})()`

try {
  const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`)
  const page = targets.find(t => t.type === 'page')
  const cdp = await connect(page.webSocketDebuggerUrl)

  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 2,
    mobile: true,
  })

  console.log(`live check @ ${base} — ${WIDTH}x${HEIGHT}\n`)

  for (const [name, route] of ROUTES) {
    await cdp.send('Page.navigate', { url: `${base}/#${route}` })
    await sleep(4500)
    const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
      expression: OVERFLOW_PROBE,
      returnByValue: true,
    })
    if (exceptionDetails) {
      console.log(`  ${name.padEnd(10)} PROBE ERROR`)
      continue
    }
    const r = result.value
    const ok = r.overflow === 0 && r.docScrollW === WIDTH
    console.log(
      `  ${name.padEnd(10)} ${ok ? '✅' : '❌'} overflow=${r.overflow}  ` +
        `doc=${r.docScrollW}/${r.viewport}  dialogs=${r.dialogCount}  ${r.htmlClass}`,
    )
    if (!ok) console.log('      ' + JSON.stringify(r.overflowSample))
  }

  // The MORE sheet and the keyboard-shortcuts guide must each open exactly
  // one dialog — the shortcuts guide used to be mounted twice.
  await cdp.send('Page.navigate', { url: `${base}/#/` })
  await sleep(4500)
  const { result } = await cdp.send('Runtime.evaluate', {
    expression: PROBE,
    awaitPromise: true,
    returnByValue: true,
  })
  console.log('\n  MORE sheet:', JSON.stringify(result.value, null, 2).replace(/\n/g, '\n  '))

  // The shortcuts guide must open as exactly ONE dialog. It used to be
  // mounted by both the Sidebar and the Dashboard, so `?` stacked two
  // identical dialogs. Test it on a clean page (no sheet open) — the
  // shortcut handler deliberately refuses while a dialog owns the keyboard.
  // The cache-busting query forces a real reload; a hash-only change would
  // not, and the sheet from the previous step would still be open.
  await cdp.send('Page.navigate', { url: `${base}/?t=${Date.now()}#/` })
  await sleep(4500)
  await cdp.send('Runtime.evaluate', {
    expression: `document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '?', code: 'Slash', bubbles: true })); true`,
    returnByValue: true,
  })
  await sleep(1500)
  const shortcut = await cdp.send('Runtime.evaluate', {
    expression: `({ dialogs: document.querySelectorAll('[role="dialog"]').length, titles: [...document.querySelectorAll('[role="dialog"]')].map(d => (d.innerText||'').split('\\n')[0]) })`,
    returnByValue: true,
  })
  console.log('\n  shortcuts guide:', JSON.stringify(shortcut.result.value))

  cdp.close()
} finally {
  chrome.kill()
  try { rmSync(profile, { recursive: true, force: true }) } catch {}
}
