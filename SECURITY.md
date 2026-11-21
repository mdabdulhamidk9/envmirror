# Security Policy

## Reporting a vulnerability

If you find a security or privacy issue in EnvMirror, please open a GitHub issue in this
repository marked clearly as a security concern (or contact the maintainer directly once a
preferred channel is published). Please include:

- A description of the issue and its impact.
- Steps to reproduce (synthetic data only — never real `.env` content or credentials).

## Scope

EnvMirror is a fully client-side static application. Relevant concerns include:

- Any network transmission of user-entered `.env` content.
- Persistent storage of configuration data beyond the theme preference.
- Execution or unsafe rendering of uploaded content.
- Exposure of secret values outside the input editors (e.g., in results, exports, logs,
  or error messages).
- Supply-chain issues in dependencies.

## What is explicitly in scope as designed behavior

- Raw values being visible in the input editors while a user works.
- Session-in-memory retention of editor text until reset or page close.
- The light/dark theme preference persisted in localStorage.

## Supported versions

Security fixes target the latest released version.
