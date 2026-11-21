import { chromium } from 'playwright'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SENTINEL = 'PRIVATE_TEST_SECRET_DO_NOT_EXPORT_2026'
const out = {}
const consoleErrors = []
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch({ channel: 'msedge' }))
const context = await browser.newContext()
const page = await context.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(String(e)))
await page.goto('http://localhost:4200/', { waitUntil: 'load' })

const tmp = mkdtempSync(join(tmpdir(), 'envq2-'))
writeFileSync(join(tmp, 'unsupported.exe'), 'MZ binary-ish')
writeFileSync(join(tmp, 'big.env'), 'K1=v\n' + 'A'.repeat(600 * 1024))
writeFileSync(join(tmp, 'crlf.env'), 'A=1\r\nB=2\r\n')
writeFileSync(join(tmp, 'long.env'), 'LONG_ONE=' + 'x'.repeat(20000) + '\nNORMAL=1\n')

// Load sample data so the app is in matrix state
await page.getByRole('button', { name: 'Try with sample data' }).click()
await page.waitForSelector('.matrix__table')

// Upload edge cases on the Local card
await page.locator('.env-card input[type="file"]').first().setInputFiles(join(tmp, 'crlf.env'))
await page.waitForTimeout(300)
out.crlfKeys = (await page.locator('.env-card').first().locator('.badge').first().textContent()).trim()

await page.locator('.env-card input[type="file"]').first().setInputFiles(join(tmp, 'long.env'))
await page.waitForTimeout(300)
out.longLineKeys = (await page.locator('.env-card').first().locator('.badge').first().textContent()).trim()

await page.locator('.env-card input[type="file"]').first().setInputFiles(join(tmp, 'unsupported.exe'))
await page.waitForTimeout(300)
out.unsupportedError = (await page.locator('.env-card__error').first().textContent().catch(() => null))

await page.locator('.env-card input[type="file"]').first().setInputFiles(join(tmp, 'big.env'))
await page.waitForTimeout(300)
out.oversizeError = (await page.locator('.env-card__error').first().textContent().catch(() => null))

// Individual clear
await page.locator('.env-card').first().getByRole('button', { name: 'Clear' }).click()
await page.waitForTimeout(200)
out.clearOneTextareasEmpty = await page.evaluate(() =>
  [...document.querySelectorAll('.env-card textarea')].map((t) => t.value.length),
)

// Refined DOM sentinel scan: text nodes outside textarea subtrees
await page.locator('.env-card').nth(2).locator('textarea').fill(`SENTINEL_KEY=${SENTINEL}\nSECRET_TOKEN=${SENTINEL}`)
await page.waitForTimeout(300)
out.domExposure = await page.evaluate((sentinel) => {
  const hits = []
  for (const node of document.querySelectorAll('body *')) {
    if (node.tagName === 'TEXTAREA') continue
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.includes(sentinel)) {
        hits.push(node.tagName + '.' + (node.className || ''))
      }
    }
  }
  // Also attributes
  const attrHits = []
  for (const el of document.querySelectorAll('body *')) {
    for (const attr of el.attributes || []) {
      if (attr.value.includes(sentinel)) attrHits.push(el.tagName + '[' + attr.name + ']')
    }
  }
  return { textNodeHits: hits, attrHits, url: location.href, historyLength: history.length }
}, SENTINEL)
// Clear production again to leave a clean state
await page.locator('.env-card').nth(2).locator('textarea').fill('')

// Viewport responsiveness: 375 / 768 / 1440
out.viewports = {}
for (const [name, width, height] of [['mobile', 375, 812], ['tablet', 768, 1024], ['desktop', 1440, 900]]) {
  await page.setViewportSize({ width, height })
  await page.waitForTimeout(250)
  out.viewports[name] = await page.evaluate(() => {
    const doc = document.documentElement
    const horizontalOverflow = doc.scrollWidth > doc.clientWidth + 1
    const matrix = document.querySelector('.matrix__scroll')
    return {
      horizontalOverflow,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      cardsVisible: [...document.querySelectorAll('.env-card')].every((c) => c.offsetParent !== null),
      matrixScrollable: matrix ? matrix.scrollWidth >= matrix.clientWidth : null,
      bodyOverflowX: getComputedStyle(document.body).overflowX,
    }
  })
}

// Keyboard navigation: focus visible & order
await page.setViewportSize({ width: 1440, height: 900 })
out.keyboard = await page.evaluate(async () => {
  const focusables = []
  const root = document.querySelector('#root')
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let n = walker.nextNode()
  while (n) {
    if (n.matches('button, input, select, textarea, [tabindex]')) focusables.push(n)
    n = walker.nextNode()
  }
  // Focus the first button and check focus outline is visible per CSS
  const first = focusables[0]
  first.focus()
  const style = getComputedStyle(first)
  const outline = style.outlineStyle !== 'none' || first.matches(':focus-visible')
  // Tab through 5 elements
  const tabOrder = []
  let active = document.activeElement
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 30))
    // simulate via focus traversal
    const all = focusables
    const idx = all.indexOf(active)
    active = all[idx + 1] || all[0]
    active.focus()
    tabOrder.push(active.tagName + (active.className ? '.' + String(active.className).split(' ')[0] : ''))
  }
  return { focusablesCount: focusables.length, focusOutlineOnFirst: outline, tabOrderSample: tabOrder }
})

out.consoleErrors = consoleErrors
console.log(JSON.stringify(out, null, 1))
await browser.close()
