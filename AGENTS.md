# AGENTS.md — EnvMirror

## Project

EnvMirror is a 100% client-side static web app (React + TypeScript + Vite) that compares
environment variable configurations across Local / Staging / Production and reports
missing, extra, and duplicate keys — **excluding values from comparison results and
exports** (values remain visible in the input editors while a user works).

- No backend, no database, no auth, no paid APIs, no cloud storage, no analytics.
- Deployment target: Cloudflare Pages (static build output in `dist/`).
- Never deploy, push, or modify external services without explicit user approval.

## Hard privacy rules (non-negotiable)

- All parsing/comparison happens in the browser. No network calls with user content.
- Never persist `.env` content or derived values in localStorage, sessionStorage,
  IndexedDB, or cookies. The only persisted value is the light/dark theme preference.
- Never render uploaded content as HTML, never log secret values, never include
  values in error messages. Only key **names** and comparison results reach the UI
  outside the input editors; raw editor text stays in React state for the session
  (documented behavior — do not claim memory erasure or secure deletion).
- No `eval`/`new Function`. File reads use `File.text()` with size/type checks.
- Test fixtures use synthetic values only.

## Structure

```
src/
  components/   React UI (presentation only, no parsing logic)
  hooks/        React hooks (theme, environment state)
  lib/          pure logic: env-parser, compare, export (fully unit-tested)
  types/        shared TypeScript types
  styles/       global CSS (design tokens, light/dark)
```

Parsing and comparison logic must stay pure and framework-free so it can be tested
independently with Vitest (`src/lib/*.test.ts`).

## Commands

```
npm run dev      # local dev server
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm run test     # vitest run
```

## Conventions

- TypeScript strict mode; no unused locals/parameters (enforced by tsconfig).
- Oxlint with react + typescript plugins; keep `react/rules-of-hooks` clean.
- Component files in PascalCase, hooks prefixed `use`, lib files camelCase.
- CSS uses design tokens (custom properties) defined in `src/styles/app.css`.
