/**
 * EnvMirror browser QA (Phase 3 + 4 + 5). Synthetic data only.
 * Serves dist/ on 4199 (expected to be running) and exercises the UI.
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:4200/'
const results = {}
const consoleErrors = []
const networkRequests = []
const SENTINEL = 'PRIVATE_TEST_SECRET_DO_NOT_EXPORT_2026'

const browser = await chromium.launch({ channel: 'chrome' }).catch(async () => {
  try {
    return await chromium.launch({ channel: 'msedge' })
  } catch {
    return chromium.launch()
  }
})
const context = await browser.newContext()
const page = await context.newPage()

page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push(String(e)))

// --- 4.1 Network inspection: capture every request + POST/PUT bodies ---
page.on('request', (req) => {
  networkRequests.push({
    url: req.url(),
    method: req.method(),
    body: ['POST', 'PUT', 'PATCH'].includes(req.method()) ? String(req.postData() ?? '') : null,
  })
})

await page.goto(BASE, { waitUntil: 'load' })

/** Run each phase inside a guard so one failure doesn't lose all evidence. */
async function phase(name, fn) {
  try {
    await fn()
  } catch (error) {
    results.phases = results.phases || {}
    results.phases[name] = `ERROR: ${String(error).split('\n')[0]}`
    // Dump current state to diagnose.
    try {
      results.phases[name + '_state'] = await page.evaluate(() => ({
        textareas: [...document.querySelectorAll('.env-card textarea')].map((t) => t.value.length),
        badges: [...document.querySelectorAll('.env-card .badge')].map((b) => b.textContent),
        matrixRows: document.querySelectorAll('.matrix__table tbody tr').length,
        emptyState: document.querySelectorAll('.empty-state').length,
        cards: document.querySelectorAll('.env-card').length,
      }))
    } catch { /* page may be unusable */ }
  }
}

await phase('theme-initial', async () => {
  results.initialTheme = await page.evaluate(() => document.documentElement.dataset.theme)
})

// --- Test A: sample data ---
await phase('A-sample', async () => {
  await page.getByRole('button', { name: 'Try with sample data' }).click()
  await page.waitForSelector('.matrix__table')
results.A = {
  cardsPopulated: await page.locator('.env-card textarea').count(),
  keyCounts: await page.locator('.env-card .badge').allTextContents(),
  summaryVisible: await page.locator('.summary').isVisible(),
  matrixVisible: await page.locator('.matrix').isVisible(),
  tagline: await page.locator('.header__tagline').textContent(),
  chip: (await page.locator('.privacy-chip').textContent()).trim(),
}
})

// --- Test B: shared filter ---
await phase('B-shared', async () => {
  await page.getByRole('button', { name: 'Shared', exact: true }).click()
results.B = {
  keys: (await page.locator('.matrix__key').allTextContents()).map((k) => k.replace(/×\d+/g, '').trim()),
  countLine: await page.locator('.matrix__count').textContent(),
}
})

// --- Test C: missing filter (Production baseline) ---
await phase('C-missing', async () => {
  await page.getByRole('button', { name: 'Missing', exact: true }).click()
  const missingRows = await page.locator('.matrix__table tbody tr').all()
  results.C = {}
  for (const row of missingRows) {
    const key = await row.locator('.matrix__key').textContent()
    results.C[key.replace(/×\d+/g, '').trim()] = (await row.textContent()).replace(/\s+/g, ' ').trim()
  }
  results.C.countLine = await page.locator('.matrix__count').textContent()
  results.C.summaryTiles = await page.locator('.summary-tile__value').allTextContents()
  results.C.summaryLabels = await page.locator('.summary-tile__label').allTextContents()
})

// --- Test D: extra filter ---
await phase('D-extra', async () => {
  await page.getByRole('button', { name: 'Extra', exact: true }).click()
results.D = {
  keys: (await page.locator('.matrix__key').allTextContents()).map((k) => k.replace(/×\d+/g, '').trim()),
  countLine: await page.locator('.matrix__count').textContent(),
}
})

// --- Test E: search ---
await phase('E-search', async () => {
  await page.getByRole('button', { name: 'All', exact: true }).click()
await page.getByLabel('Search variable names').fill('DATABASE_URL')
results.E = {
  rows: (await page.locator('.matrix__key').allTextContents()).map((k) => k.replace(/×\d+/g, '').trim()),
}
await page.getByLabel('Search variable names').fill('NO_SUCH_KEY_XYZ')
results.E.noMatchRows = await page.locator('.matrix__table tbody tr').count()
results.E.noMatchMessage = await page.locator('.matrix__empty').textContent().catch(() => null)
await page.getByLabel('Search variable names').fill('')
results.E.restoredCount = await page.locator('.matrix__table tbody tr').count()
})

// --- Test F: baseline switching ---
await phase('F-baselines', async () => {
results.F = {}
for (const baseline of ['Local', 'Staging', 'Production']) {
  await page.locator('.toolbar__baseline select').selectOption({ label: baseline })
  await page.waitForTimeout(100)
  const rows = await page.locator('.matrix__table tbody tr').all()
  const statuses = {}
  for (const row of rows) {
    const key = (await row.locator('.matrix__key').textContent()).replace(/×\d+/g, '').trim()
    const badges = await row.locator('td .badge').allTextContents()
    const statusBadge = await row.locator('td .badge').last().textContent()
    statuses[key] = { cells: badges.slice(0, 3), status: statusBadge }
  }
  results.F[baseline] = {
    rowCount: rows.length,
    totals: await page.locator('.summary-tile__value').allTextContents(),
    statuses,
  }
}
})

// --- Test H: export with sentinel value ---
await phase('H-export', async () => {
// Put a sentinel into the Production editor so we can prove values never reach export.
const prodTextarea = page.locator('.env-card textarea').nth(2)
await prodTextarea.fill(prodTextarea.inputValue() + `\nSENTINEL_KEY=${SENTINEL}`)
await page.locator('.toolbar__baseline select').selectOption({ label: 'Production' })

const downloadPromise = page.waitForEvent('download')
await page.getByRole('button', { name: 'Download .env.example' }).click()
const download = await downloadPromise
const exportPath = await download.path()
const { readFileSync } = await import('node:fs')
const exportContent = readFileSync(exportPath, 'utf8')
results.H = {
  suggestedFilename: download.suggestedFilename(),
  sentinelLeaked: exportContent.includes(SENTINEL),
  sentinelKeyLine: exportContent.split('\n').find((l) => l.startsWith('SENTINEL_KEY')) ?? null,
  duplicateLines: (() => {
    const keys = exportContent.split('\n').filter((l) => l && !l.startsWith('#'))
    return keys.length - new Set(keys).size
  })(),
  sorted: (() => {
    const keys = exportContent.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.replace(/=$/, ''))
    return JSON.stringify(keys) === JSON.stringify([...keys].sort((a, b) => a.localeCompare(b)))
  })(),
  preview: exportContent.split('\n').slice(0, 8),
}
})

// --- Test I: reset all ---
await phase('I-reset', async () => {
  await page.getByRole('button', { name: 'Reset all' }).click()
results.I = {
  emptyStateBack: await page.locator('.empty-state').count(),
  textareasEmpty: await page.evaluate(() => [...document.querySelectorAll('.env-card textarea')].every((t) => t.value === '')),
  exportDisabled: await page.getByRole('button', { name: 'Download .env.example' }).isDisabled(),
}
})

// --- Test G: file upload ---
await phase('G-upload', async () => {
const { writeFileSync, mkdtempSync } = await import('node:fs')
const { tmpdir } = await import('node:os')
const { join } = await import('node:path')
const tmp = mkdtempSync(join(tmpdir(), 'envmirror-qa-'))
writeFileSync(join(tmp, 'upload.env'), 'UPLOAD_KEY_A=1\r\nUPLOAD_KEY_B=2\r\nUPLOAD_KEY_A=3\r\nbad line here\r\n', { encoding: 'utf8' })
writeFileSync(join(tmp, 'empty.env'), '', { encoding: 'utf8' })
writeFileSync(join(tmp, 'unsupported.exe'), 'MZ binary-ish', { encoding: 'utf8' })

await page.locator('.env-card input[type="file"]').first().setInputFiles(join(tmp, 'upload.env'))
await page.waitForSelector('.matrix__table')
results.G = {
  keyCountBadge: (await page.locator('.badge--green').first().textContent()).trim(),
  fileNameChip: await page.locator('.chip--file').first().textContent(),
  duplicateChips: await page.locator('.chip--warn').allTextContents(),
  invalidChips: await page.locator('.chip--danger').allTextContents(),
  matrixRows: await page.locator('.matrix__table tbody tr').count(),
}
await page.locator('.env-card input[type="file"]').first().setInputFiles(join(tmp, 'empty.env'))
results.G.emptyFileKeys = (await page.locator('.badge--green').first().textContent()).trim()
await page.locator('.env-card input[type="file"]').first().setInputFiles(join(tmp, 'unsupported.exe'))
results.G.unsupportedError = await page.locator('.env-card__error').first().textContent().catch(() => null)

// Oversized file (512KB+)
writeFileSync(join(tmp, 'big.env'), ('BIG_%d=x\n'.repeat(1) + 'A'.repeat(600 * 1024)), { encoding: 'utf8' })
await page.locator('.env-card input[type="file"]').first().setInputFiles(join(tmp, 'big.env'))
results.G.oversizeError = await page.locator('.env-card__error').first().textContent().catch(() => null)

// Individual clear button
await page.locator('.env-card').first().getByRole('button', { name: 'Clear' }).click()
results.G.clearOne = await page.evaluate(() => document.querySelectorAll('.env-card textarea')[0].value === '')
})

// --- Test J: theme toggle + persistence check ---
await phase('J-theme', async () => {
const themeBefore = await page.evaluate(() => document.documentElement.dataset.theme)
await page.getByRole('button', { name: /Switch to/ }).click()
const themeAfter = await page.evaluate(() => document.documentElement.dataset.theme)
await page.reload({ waitUntil: 'load' })
const themeAfterReload = await page.evaluate(() => document.documentElement.dataset.theme)
results.J = { themeBefore, themeAfter, themeAfterReload }
})

// --- 4.2 Storage inspection ---
await phase('storage', async () => {
results.storage = await page.evaluate(() => {
  const ls = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    ls[k] = localStorage.getItem(k)
  }
  return {
    localStorage: ls,
    sessionStorageEntries: sessionStorage.length,
    cookieString: document.cookie,
    indexedDBDatabases: typeof indexedDB.databases === 'function' ? 'checked-at-runtime' : 'n/a',
  }
})
results.indexedDBDatabases = await page.evaluate(async () =>
  typeof indexedDB.databases === 'function' ? (await indexedDB.databases()).map((d) => d.name) : 'unsupported',
)
})

// --- 4.1 verdict: did any request carry env content? ---
const dataUrls = networkRequests.filter((r) => r.body && (r.body.includes('=') || r.body.includes('API_URL')))
results.network = {
  totalRequests: networkRequests.length,
  nonGet: networkRequests.filter((r) => r.method !== 'GET').map((r) => ({ url: r.url, method: r.method })),
  suspiciousBodies: dataUrls,
}

// --- 4.3 DOM/history exposure: values in DOM outside textareas? ---
// Re-fill Production with sentinel, then scan the DOM for the sentinel outside the textarea.
await page.locator('.env-card').nth(2).locator('textarea').fill(`SENTINEL_KEY=${SENTINEL}`)
results.domExposure = await page.evaluate((sentinel) => {
  const hits = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL)
  let node = walker.nextNode()
  while (node) {
    const isTextarea = node.nodeType === 1 && node.tagName === 'TEXTAREA'
    if (!isTextarea && node.textContent && node.textContent.includes(sentinel)) hits.push(node.nodeName)
    node = walker.nextNode()
  }
  return { outsideTextareaHits: hits, url: location.href, hash: location.hash }
}, SENTINEL)

// --- 4.5 build inspection (separate step outside browser) ---
results.consoleErrors = consoleErrors

// --- Accessibility: labels on controls ---
results.a11y = {
  unlabeledInputs: await page.evaluate(() =>
    [...document.querySelectorAll('input, select, textarea')]
      .filter((el) => !el.labels?.length && !el.getAttribute('aria-label'))
      .map((el) => el.tagName + (el.id ? '#' + el.id : '')),
  ),
  buttonsWithoutName: await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label'))
      .length,
  ),
}

// Console error summary
results.consoleErrors = consoleErrors

console.log(JSON.stringify(results, null, 1))
await browser.close()
