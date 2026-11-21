/**
 * Pure comparison engine. Deterministic, side-effect free, framework-free.
 *
 * Compares variable NAMES across environments relative to a selected baseline
 * and classifies every key as shared, missing (absent from at least one other
 * provided environment), or extra (absent from the baseline).
 */
import type { EnvId, KeyStatus } from '../types'
import type { ParseResult } from './env-parser'

export const ENV_IDS: readonly EnvId[] = ['local', 'staging', 'production'] as const

export const ENV_LABELS: Record<EnvId, string> = {
  local: 'Local',
  staging: 'Staging',
  production: 'Production',
}

/** Comparison input for one environment. `null` means the user supplied nothing. */
export type EnvParse = ParseResult | null

export interface KeyRow {
  key: string
  /** Environments (of those provided) that contain the key. */
  presentIn: EnvId[]
  /** Provided environments that lack the key (never includes the baseline). */
  missingIn: EnvId[]
  /** Occurrence count per environment where the key is duplicated. */
  duplicateOccurrences: Partial<Record<EnvId, number>>
  status: KeyStatus
}

export interface EnvSummary {
  id: EnvId
  provided: boolean
  keyCount: number
  duplicateKeyCount: number
  issueCount: number
}

export interface ComparisonResult {
  baseline: EnvId
  rows: KeyRow[]
  summary: EnvSummary[]
  totals: {
    shared: number
    missing: number
    extra: number
    duplicate: number
    issues: number
  }
}

function isProvided(parse: EnvParse): parse is ParseResult {
  return parse !== null
}

/** Build the comparison matrix from parsed environments. */
export function compareEnvironments(
  parses: Record<EnvId, EnvParse>,
  baseline: EnvId,
): ComparisonResult {
  const providedIds = ENV_IDS.filter((id) => isProvided(parses[id]))

  const keyNames = new Set<string>()
  for (const id of providedIds) {
    const parse = parses[id]
    if (parse) {
      for (const name of parse.keyNames) keyNames.add(name)
    }
  }

  const baselineParse = parses[baseline]
  const baselineKeys = new Set(baselineParse ? baselineParse.keyNames : [])

  const rows: KeyRow[] = [...keyNames].sort((a, b) => a.localeCompare(b)).map((key) => {
    const presentIn: EnvId[] = []
    const missingIn: EnvId[] = []
    const duplicateOccurrences: Partial<Record<EnvId, number>> = {}

    for (const id of providedIds) {
      const parse = parses[id]
      if (!parse) continue
      const entry = parse.entries.find((candidate) => candidate.name === key)
      if (entry) {
        presentIn.push(id)
        if (entry.occurrences > 1) duplicateOccurrences[id] = entry.occurrences
      } else if (id !== baseline) {
        missingIn.push(id)
      }
    }

    let status: KeyStatus
    if (!baselineKeys.has(key)) {
      status = 'extra'
    } else if (missingIn.length > 0) {
      status = 'missing'
    } else {
      status = 'shared'
    }

    return { key, presentIn, missingIn, duplicateOccurrences, status }
  })

  const summary: EnvSummary[] = ENV_IDS.map((id) => {
    const parse = parses[id]
    return {
      id,
      provided: isProvided(parse),
      keyCount: parse ? parse.keyCount : 0,
      duplicateKeyCount: parse ? parse.duplicateEntries.length : 0,
      issueCount: parse ? parse.issues.length : 0,
    }
  })

  const totals = {
    shared: rows.filter((row) => row.status === 'shared').length,
    missing: rows.filter((row) => row.status === 'missing').length,
    extra: rows.filter((row) => row.status === 'extra').length,
    duplicate: summary.reduce((sum, env) => sum + env.duplicateKeyCount, 0),
    issues: summary.reduce((sum, env) => sum + env.issueCount, 0),
  }

  return { baseline, rows, summary, totals }
}

/** True when no environment has any input. */
export function isComparisonEmpty(parses: Record<EnvId, EnvParse>): boolean {
  return ENV_IDS.every((id) => !isProvided(parses[id]))
}
