// Verification harness for the weekly/daily reset rules.
// Run:  node scripts/verify-reset.mjs
// The pure helpers are bundled from src/utils/taskReset.ts with esbuild so the
// test exercises the shipped logic, not a copy of it.

import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { build } from 'esbuild'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const out = resolve(tmpdir(), 'pixel-reset-verify-bundle.mjs')
await build({
  entryPoints: [resolve(root, 'src/utils/taskReset.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  logLevel: 'silent',
})

const { getWeekKey, isStaleCompletion, clearStaleCompletions, taskCompletionDay } =
  await import(`file://${out.replace(/\\/g, '/')}`)

let failures = 0
function check(name, actual, expected) {
  const ok = actual === expected
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (expected ${expected}, got ${actual})`}`)
}

const now = new Date()
const today = (() => {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()
const weekStart = getWeekKey(now)
const lastWeek = (() => {
  const d = new Date(now)
  d.setDate(d.getDate() - 7)
  d.setHours(0, 0, 0, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()
const yesterday = (() => {
  const d = new Date(now)
  d.setDate(d.getDate() - 1)
  d.setHours(0, 0, 0, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

console.log(`today=${today}  weekStart=${weekStart}  lastWeek=${lastWeek}\n`)

// ── week key ──────────────────────────────────────────────────────────────
check('week key is a Sunday', new Date(`${weekStart}T00:00:00`).getDay(), 0)
check('week key is <= today', weekStart <= today, true)

// ── staleness rules ───────────────────────────────────────────────────────
const mk = (over) => ({
  id: 't1', title: 'T', description: '', frequency: 'weekly', completed: true,
  createdAt: '', streak: 0, lastCompletedDate: '', completedAt: '',
  reminder: { enabled: false, time: '09:00', date: '' }, ...over,
})

check('weekly task completed last week is stale',
  isStaleCompletion(mk({ frequency: 'weekly', lastCompletedDate: lastWeek }), today, weekStart), true)
check('weekly task completed this week is not stale',
  isStaleCompletion(mk({ frequency: 'weekly', lastCompletedDate: today }), today, weekStart), false)
check('daily task completed yesterday is stale',
  isStaleCompletion(mk({ frequency: 'daily', lastCompletedDate: yesterday }), today, weekStart), true)
check('daily task completed today is not stale',
  isStaleCompletion(mk({ frequency: 'daily', lastCompletedDate: today }), today, weekStart), false)
check('once task is never stale',
  isStaleCompletion(mk({ frequency: 'once', lastCompletedDate: lastWeek }), today, weekStart), false)
check('incomplete task is never stale',
  isStaleCompletion(mk({ frequency: 'weekly', completed: false, lastCompletedDate: lastWeek }), today, weekStart), false)
check('completed with no date is treated as a leftover',
  isStaleCompletion(mk({ frequency: 'weekly' }), today, weekStart), true)

// ── completedAt is timezone-proof ─────────────────────────────────────────
// 02:00 local on a UTC+7 machine is 19:00 UTC the previous day. A task
// completed then must still count as "completed today".
const earlyMorning = new Date(now)
earlyMorning.setHours(2, 0, 0, 0)
if (earlyMorning.getDate() !== now.getDate()) {
  earlyMorning.setDate(now.getDate())
}
check('completedAt at 02:00 local resolves to today',
  taskCompletionDay(mk({ completedAt: earlyMorning.toISOString() })), today)
check('a task completed at 02:00 local is not stale',
  isStaleCompletion(mk({ frequency: 'daily', completedAt: earlyMorning.toISOString() }), today, weekStart), false)

// ── clearStaleCompletions ─────────────────────────────────────────────────
const data = {
  categories: [
    {
      id: 'c1', name: 'Cat', color: '#000',
      tasks: [
        mk({ id: 'a', frequency: 'weekly', lastCompletedDate: lastWeek }),
        mk({ id: 'b', frequency: 'weekly', lastCompletedDate: today, completedAt: now.toISOString() }),
        mk({ id: 'c', frequency: 'daily', lastCompletedDate: yesterday }),
        mk({ id: 'd', frequency: 'daily', lastCompletedDate: today, completedAt: now.toISOString() }),
        mk({ id: 'e', frequency: 'once', lastCompletedDate: lastWeek }),
      ],
    },
  ],
}
const fixed = clearStaleCompletions(data)
const t = (id) => fixed.categories[0].tasks.find(x => x.id === id)
check('last week\'s weekly task is unchecked', t('a').completed, false)
check('this week\'s weekly task stays checked', t('b').completed, true)
check('yesterday\'s daily task is unchecked', t('c').completed, false)
check('today\'s daily task stays checked', t('d').completed, true)
check('a once task is left alone', t('e').completed, true)
check('clearing also wipes the stale completion stamp', t('a').completedAt, '')
check('clearing leaves today\'s stamp intact', t('b').completedAt !== '', true)

// No-op behaviour: the same object is returned so no write is issued.
const clean = {
  categories: [{ id: 'c1', name: 'Cat', color: '#000', tasks: [
    mk({ id: 'x', frequency: 'weekly', lastCompletedDate: today }),
    mk({ id: 'y', frequency: 'daily', lastCompletedDate: today }),
  ] }],
}
check('no stale tasks -> same object returned (no write)', clearStaleCompletions(clean) === clean, true)
check('stale tasks -> new object returned (write happens)', fixed !== data, true)

// Idempotence: running it twice changes nothing the second time.
const twice = clearStaleCompletions(fixed)
check('reset is idempotent', twice === fixed, true)

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)
