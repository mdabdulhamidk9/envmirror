# Changelog

All notable changes to EnvMirror are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) where applicable; no releases have
been published yet.

## [Unreleased]

### Added

- Environment input cards for Local, Staging, and Production with `.env` upload, paste,
  clear, file-name indicator, and key counts.
- Pure TypeScript `.env` name parser (comments, quoted values, `export` prefixes, CRLF/LF,
  duplicates, invalid lines).
- Comparison engine with selectable baseline and Shared / Missing / Extra / Duplicate
  classification.
- Comparison matrix with search and filters; summary statistics.
- Safe `.env.example` export (names only, empty placeholders, deduplicated, sorted).
- Dark/light theme with persisted preference.
- Responsive, keyboard-accessible interface.
- Unit test suite (Vitest), browser QA suites (Playwright), and `docs/FINAL-QA-REPORT.md`.
- Repository documentation: README, CONTRIBUTING, SECURITY, CHANGELOG.
