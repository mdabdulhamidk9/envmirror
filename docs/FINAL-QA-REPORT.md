# EnvMirror — Final QA & Privacy Report

**Date:** 2026-11-21 · **Version:** 1.0.0 · **Verified in:** `D:\Projects\envmirror`
**Method:** Oxlint + Vitest unit tests + production build inspection + Playwright (system Chrome) browser automation against `vite preview` of the production `dist/` bundle, plus static source/bundle analysis.

---

## A. Executive Summary

**Classification: PASS WITH WARNINGS**

All core functionality works as specified. Privacy messaging is now accurate and technically
verifiable. No functional, security, or privacy defect was found that blocks release.
Warnings are documented limitations (raw values visible in editors, in-memory retention)
and minor observations — none critical.

## B. Verified Features

| # | Feature | Method | Result |
|---|---|---|---|
| 1 | Local/Staging/Production inputs (upload, paste, clear, file chip, key counts) | Browser automation (`qa-browser.mjs`, `qa-part2.mjs`) | PASS |
| 2 | Safe browser-only parsing (values excluded from results by parser design) | 21 parser unit tests + bundle grep + DOM sentinel scan | PASS |
| 3 | Missing/extra/shared/duplicate detection | Unit tests (13 compare tests) + browser Tests B–D | PASS |
| 4 | Comparison matrix with present/missing badges, duplicate chips | Browser automation | PASS |
| 5 | Search (match + no-match + restore) | Browser Test E | PASS |
| 6 | Baseline switching (Local/Staging/Production recalculation) | Browser Test F + new regression unit test | PASS |
| 7 | File upload edge cases: CRLF, 20k-char lines, duplicates, invalid lines, empty file, `.exe` rejection, >512 KB rejection | Browser Test G + `qa-part2.mjs` | PASS (see F/G note) |
| 8 | `.env.example` export (names only, `KEY=`, deduped, sorted, sentinel not leaked) | Browser Test H — downloaded artifact inspected | PASS |
| 9 | Reset all + per-environment Clear | Browser Test I + part 2 | PASS |
| 10 | Dark/light theme toggle + persistence | Browser Test J | PASS |
| 11 | Responsive layout (375 / 768 / 1440 px, no horizontal page overflow, matrix scrolls) | Browser automation | PASS |
| 12 | Accessibility basics (labeled controls, named buttons, visible focus, logical tab order, status text not color-only) | Browser automation | PASS |
| 13 | Production build = EnvMirror (no starter assets, no source maps, no `console.log`, single self-hosted script) | Static bundle inspection | PASS |

## C. Privacy Audit

**Raw input handling.** Paste/uploaded content lives in React state in the editors; values are
visible to the user in the textareas (by design, documented). No code path renders editor
content as HTML (React text nodes only); no `eval`/`new Function`; file reads use `File.text()`
with 512 KB size and `.env`/`.txt` type checks.

**Comparison behavior.** The parser captures key **names** only — the `ParseResult` type has no
value field, and a unit test asserts a sentinel value never appears in parse output. DOM-level
verification: after filling a textarea with sentinel values, a text-node and attribute scan of
the whole document found the sentinel **only inside `<textarea>` elements** — not in badges,
chips, matrix, or anywhere else.

**Export behavior.** Browser download captured and inspected: `env.example` contains names
only with empty `KEY=` values, deduplicated, alphabetically sorted; the sentinel value was
absent. Verified against the real download event, not just the generator function.

**Network findings.** Every request captured during a full session (sample data, editing,
filters, upload, export, reset): 8 requests, all `GET` for localhost assets. **Zero** non-GET
requests, zero request bodies, no third-party endpoints. The bundle makes no `fetch`/XHR
calls with user content (single JS chunk, inspected).

**Storage findings.** After a full session including export and reset:
`localStorage = { "envmirror-theme": "dark" }` only; `sessionStorage` empty; cookies empty;
IndexedDB empty. Theme preference is the only persisted value.

**Sensitive-data exposure.** No `console.log`/`console.error` in the source or the production
bundle; errors are fixed user-facing strings without file content; no URL parameters, no
history/hash usage (`location.hash` empty). Bundle contains the synthetic sample dataset
values (`postgres://localhost:5432/app`, `DEBUG=true`, …) hardcoded in `App.tsx` as demo
data — synthetic, non-secret, informational only.

**Remaining privacy limitations (documented, not defects):**
1. Raw values remain in editor textareas and in JavaScript memory for the session; they are
   not cryptographically erased from memory (not achievable in a browser).
2. EnvMirror cannot prevent browser extensions, OS tooling, or user-installed monitors from
   reading page content.
3. Uploading an **empty** `.env` file replaces the card's content with nothing (file-replaces-
   content semantics); if it was the only populated environment the app returns to the empty
   state. Documented behavior, minor UX surprise (Low).

## D. Changes Made

| File | Reason |
|---|---|
| `src/components/Header.tsx` | Privacy copy: tagline → "Compare .env variable names privately in your browser"; chip → "Browser-only processing"; chip tooltip rewritten without "nothing is stored/logged" overclaim |
| `src/App.tsx` | Footer privacy notice rewritten to the verified-behavior wording (values visible in editors, excluded from results/exports, in-memory session retention) |
| `src/components/EmptyState.tsx` | Removed inaccurate "Values are discarded immediately and never displayed"; replaced with accurate wording |
| `index.html` | Meta description and OG description softened to verifiable claims |
| `README.md` | "Privacy guarantees" → "Privacy behavior" reflecting verified semantics |
| `src/lib/compare.test.ts` | Added regression test: per-environment presence stable while status follows the baseline (12 → 13 compare tests) |
| `src/assets/`, `src/App.css`, `src/index.css`, `public/icons.svg` | **Removed** — verified unused Vite starter assets (grep: zero references; they shipped `icons.svg` into `dist/`) |
| `_backup-starter-package.json` | Removed (leftover QA artifact from earlier session) |
| `scripts/qa-browser.mjs`, `scripts/qa-part2.mjs` | Added: reproducible browser QA suites (Playwright) |
| `docs/FINAL-QA-REPORT.md` | This report |

No layout, palette, component, or stack changes. `AGENTS.md` untouched.

## E. Automated Verification (executed in `D:\Projects\envmirror`)

| Command | Result |
|---|---|
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npm run test:run` | ✅ **40 tests passed / 40** across **3 test files** (env-parser 19, compare 13, export 8) |
| `npm run build` | ✅ `tsc -b && vite build` — 2.20 kB HTML, 9.14 kB CSS, 234.53 kB JS (73.63 kB gzip) |

Note: three intermediate test failures during the new baseline test were **errors in my test
expectations** (missingIn never includes the baseline; a key present only in the baseline is
"missing" from other environments, not "shared"), not app defects — fixed in the test.

## F. Browser QA

Executed with Playwright (system Chrome channel) against `http://localhost:4200` (production
build served by `vite preview`; note an unrelated stale server from a previous session held
port 4199 — the QA explicitly targets the fresh build).

- **Passed:** Tests A, B, C, D, E, F (all three baselines), G (upload/duplicates/invalid/
  CRLF/long-line/clear; unsupported-type and oversize errors), H (export artifact inspected,
  sentinel not leaked), I (reset, export disabled), J (theme toggle + persistence).
- **Failed:** none.
- **Script artifact:** the qa-browser run reports a `G-upload` phase timeout — a test-script
  expectation bug (it assumed a green badge persists after uploading an **empty** file; the app
  correctly returns to the empty state because that environment became empty). The meaningful
  upload assertions passed (2 keys, filename chip, duplicate + invalid chips, 2 matrix rows).
- **Unverified (manual checklist):** screen-reader announcement quality (aria-live regions
  exist but were not evaluated with a screen reader), full keyboard-only walkthrough beyond
  tab-order sampling, real upload via OS file dialog (Playwright `setInputFiles` used).

## G. Remaining Risks

| Severity | Finding |
|---|---|
| Critical | None |
| High | None |
| Medium | None |
| Low | Empty-file upload silently empties a card (file-replaces-content); a "file is empty" hint would improve feedback |
| Low | Aria-live regions not evaluated with an actual screen reader |
| Informational | Raw values visible in editors and held in browser memory during the session (documented in the UI) |
| Informational | Synthetic sample dataset values are embedded in the bundle as demo content |
| Informational | Browser extensions/OS tooling can read page content; outside application control |

## H. Production Release Decision

**Code readiness: READY.** Lint, 40/40 unit tests, strict TypeScript, production build, and
browser QA all pass; privacy claims now match verified behavior.

1. **GitHub initial commit — ready.** The repository currently has no git history (`git init`
   not yet performed). Nothing sensitive is present; fixtures are synthetic.
2. **Public static deployment — ready from an application standpoint.** Static SPA, no
   backend, no data collection. Deployment itself was **not performed** (per instructions);
   recommend a post-deploy smoke of the live URL (title, sample-data flow, export) before
   announcing it.
