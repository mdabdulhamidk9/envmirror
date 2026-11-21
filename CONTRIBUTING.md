# Contributing to EnvMirror

Thank you for considering a contribution!

## Ground rules

- EnvMirror is a 100% client-side application: no backend, no database, no analytics, no
  paid services. Proposals that add server-side processing of user content will not be
  accepted.
- Privacy behavior is a feature. Any change must keep the guarantees documented in
  `README.md` and `SECURITY.md` accurate.
- Do not commit real `.env` files or credentials. Test fixtures use synthetic values only.

## Workflow

1. Fork or branch from `main`.
2. Keep parsing/comparison/export logic pure and framework-free in `src/lib/`, tested with
   Vitest (`src/lib/*.test.ts`).
3. Keep React components presentation-only; state lives in `src/hooks/`.
4. Style with the design tokens in `src/styles/app.css`; avoid one-off colors.

## Before opening a pull request

Run and pass:

```bash
npm run lint
npm run test:run
npm run build
```

Describe what changed and why, and include tests for behavior changes in `src/lib/`.
