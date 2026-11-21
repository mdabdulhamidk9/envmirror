/**
 * Pure .env parser. Extracts variable NAMES and structural information only.
 *
 * Privacy: values are intentionally discarded and are never part of the result.
 * This module performs no I/O, executes no content, and is deterministic.
 */

export type IssueReason = 'missing_separator' | 'invalid_name'

export interface ParsedEntry {
  /** Variable name, e.g. `API_URL`. Values are never captured. */
  name: string
  /** 1-based line number of the first occurrence. */
  line: number
  /** How many times this name appears in the file (>= 1). */
  occurrences: number
}

export interface ParseIssue {
  /** 1-based line number of the offending line. */
  line: number
  reason: IssueReason
}

export interface ParseResult {
  /** One entry per unique key name, in first-seen order. */
  entries: ParsedEntry[]
  /** Unique key names in first-seen order. */
  keyNames: string[]
  /** Number of unique key names. */
  keyCount: number
  /** Entries whose name appears more than once. */
  duplicateEntries: ParsedEntry[]
  /** Lines that could not be parsed, by line number only (content is never kept). */
  issues: ParseIssue[]
  /** True when the file contains no meaningful lines (blank or comments only). */
  isEmpty: boolean
}

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const EXPORT_PREFIX = /^export[ \t]+/

/**
 * Parse the text of a `.env` file into key metadata.
 *
 * Supported syntax: `KEY=VALUE`, empty values, `#`/blank comments, single- and
 * double-quoted values, optional `export ` prefix, CRLF and LF line endings,
 * leading/trailing whitespace around keys and values.
 *
 * Duplicate keys are counted (last convention differs per runtime, so the parser
 * reports occurrences and lets consumers decide). Lines without `=` or with an
 * invalid key name are reported as issues.
 */
export function parseEnv(source: string): ParseResult {
  const withoutBom = source.replace(/^\uFEFF/, '')
  const lines = withoutBom.replace(/\r\n?/g, '\n').split('\n')

  const counts = new Map<string, { firstLine: number; occurrences: number }>()
  const issues: ParseIssue[] = []
  let meaningfulLines = 0

  lines.forEach((raw, index) => {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) return
    meaningfulLines += 1

    const withoutExport = line.replace(EXPORT_PREFIX, '')
    const separatorIndex = withoutExport.indexOf('=')
    if (separatorIndex === -1) {
      issues.push({ line: index + 1, reason: 'missing_separator' })
      return
    }

    const name = withoutExport.slice(0, separatorIndex).trim()
    if (!KEY_PATTERN.test(name)) {
      issues.push({ line: index + 1, reason: 'invalid_name' })
      return
    }

    const existing = counts.get(name)
    if (existing) {
      existing.occurrences += 1
    } else {
      counts.set(name, { firstLine: index + 1, occurrences: 1 })
    }
  })

  const entries: ParsedEntry[] = [...counts.entries()].map(([name, info]) => ({
    name,
    line: info.firstLine,
    occurrences: info.occurrences,
  }))

  return {
    entries,
    keyNames: entries.map((entry) => entry.name),
    keyCount: entries.length,
    duplicateEntries: entries.filter((entry) => entry.occurrences > 1),
    issues,
    isEmpty: meaningfulLines === 0,
  }
}
