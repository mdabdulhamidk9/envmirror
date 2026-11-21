# EnvMirror

EnvMirror is a privacy-focused developer tool for comparing environment variable
configurations across **Local**, **Staging**, and **Production** environments directly in
your browser.

**Compare .env configurations privately in your browser.**

## Overview

EnvMirror parses the variable **names** from up to three `.env` files and shows you, in a
single comparison matrix, which variables are shared, missing, extra, or duplicated across
your environments — with a selectable baseline and a safe `.env.example` generator.

## Features

- Three environment cards (Local / Staging / Production), each with `.env` upload, paste
  input, clear button, file-name indicator, and live key count.
- Robust parser: `KEY=VALUE`, empty values, comments, quoted values, `export` prefixes,
  CRLF/LF line endings, whitespace tolerance, duplicate counting, invalid-line detection.
- Comparison matrix relative to a selectable baseline with **Shared / Missing / Extra /
  Duplicates** filters and case-insensitive search.
- Summary statistics (shared, missing, extra, duplicates, invalid lines).
- Safe `.env.example` export: variable names only, empty placeholder values, deduplicated,
  alphabetically sorted.
- Dark and light themes with system-preference detection and persisted preference.
- Responsive layout (mobile, tablet, desktop) and accessible keyboard navigation.

## How it works

1. Paste or upload `.env` content into any of the three environment cards.
2. A pure TypeScript parser extracts variable names and structural information; raw values
   are never part of the parsed result.
3. The comparison engine classifies every variable relative to your chosen baseline and
   renders the matrix, summary, and filters.
4. Optionally export a sanitized `.env.example` containing only variable names.

## Privacy and security considerations

- All parsing and comparison happen locally in your browser. EnvMirror makes no
  intentional network requests with your content and has no backend.
- Raw values **are visible in the input editors** while you work — this is the point of the
  tool. They are excluded from comparison results and exported files.
- The application keeps your input in browser memory during the session; no configuration
  data is intentionally uploaded or saved. Closing the page or using **Reset all** removes
  it from application state. (Browser JavaScript cannot guarantee secure erasure of memory.)
- The only value persisted in browser storage is your light/dark theme preference.
- Uploaded files are read with `File.text()` and are limited to 512 KB and `.env`/`.txt`
  types. Uploaded content is never executed, never rendered as HTML, and never logged.
- No analytics or third-party tracking.

## Development setup

Requirements: Node.js 20+ (Node 22 recommended) and npm.

```bash
npm install
npm run dev      # start the Vite dev server
```

## Project structure

```
src/
  components/   React UI (presentation only)
  hooks/        useTheme, useEnvironments
  lib/          pure logic: env-parser, compare, export (+ unit tests)
  types/        shared TypeScript types
  styles/       design tokens & global CSS
scripts/        Playwright browser QA suites
docs/           QA reports
```

## Testing and QA

```bash
npm run lint      # oxlint
npm run test:run  # Vitest unit tests (parser, comparison, export)
npm run build     # tsc -b && vite build
```

Browser QA: serve the production build (`npm run build && npm run preview`) and run
`node scripts/qa-browser.mjs` / `node scripts/qa-part2.mjs` (requires Playwright). See
`docs/FINAL-QA-REPORT.md` for the latest audited results.

## Continuous Integration

GitHub Actions runs on every push to `main` and on pull requests targeting `main`. The
`EnvMirror CI` workflow executes `npm ci`, Oxlint, the Vitest unit suite, and the production
build (which includes the TypeScript type check via `tsc -b`). All checks must pass for CI
to be green; results are visible in the repository's **Actions** tab.

## Deployment

EnvMirror is deployed to **GitHub Pages** from this repository:

- **Production URL:** https://mdabdulhamidk9.github.io/envmirror/
- The `Deploy to GitHub Pages` workflow (`.github/workflows/deploy.yml`) builds the site
  with `npm run build` and deploys the `dist/` output **automatically on every push to
  `main`**.
- Manual deployments are supported via **workflow dispatch** (repository → Actions →
  `Deploy to GitHub Pages` → Run workflow).
- Required repository setting: **Settings → Pages → Build and deployment → Source →
  "GitHub Actions"**.
- Vite is configured with `base: '/envmirror/'` so all assets resolve under the repository
  subpath. No backend, database, or environment variables are required.

## Known limitations

- EnvMirror compares variable **names**, not values — it cannot detect when the same
  variable holds different values in two environments.
- Values remain visible in the input editors by design; EnvMirror cannot prevent browser
  extensions or OS-level software from reading page content.
- An empty uploaded file replaces the card's content (file-replaces-content semantics).
- The parser is single-line based; multi-line quoted values are not supported.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Please review
[SECURITY.md](SECURITY.md) before reporting security-related issues.

## License status

This project currently has **no explicit open-source license**. All rights are reserved by
the author until a license is chosen. Do not redistribute without permission.
