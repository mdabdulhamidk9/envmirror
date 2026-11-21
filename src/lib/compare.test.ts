import { describe, expect, it } from 'vitest'
import { parseEnv } from './env-parser'
import { compareEnvironments, isComparisonEmpty, type EnvParse } from './compare'
import type { EnvId } from '../types'

function parses(input: Partial<Record<EnvId, string>>): Record<EnvId, EnvParse> {
  return {
    local: input.local !== undefined ? parseEnv(input.local) : null,
    staging: input.staging !== undefined ? parseEnv(input.staging) : null,
    production: input.production !== undefined ? parseEnv(input.production) : null,
  }
}

describe('compareEnvironments', () => {
  it('classifies shared keys across all environments', () => {
    const result = compareEnvironments(
      parses({
        local: 'A=1\nB=2',
        staging: 'A=10\nB=20',
        production: 'A=100\nB=200',
      }),
      'production',
    )
    expect(result.rows.map((row) => ({ key: row.key, status: row.status }))).toEqual([
      { key: 'A', status: 'shared' },
      { key: 'B', status: 'shared' },
    ])
    expect(result.totals).toMatchObject({ shared: 2, missing: 0, extra: 0 })
  })

  it('detects keys missing from an environment relative to the baseline', () => {
    const result = compareEnvironments(
      parses({
        staging: 'A=1',
        production: 'A=1\nB=2\nC=3',
      }),
      'production',
    )
    const rowB = result.rows.find((row) => row.key === 'B')
    const rowC = result.rows.find((row) => row.key === 'C')
    expect(rowB?.status).toBe('missing')
    expect(rowB?.missingIn).toEqual(['staging'])
    expect(rowC?.missingIn).toEqual(['staging'])
    expect(result.totals.missing).toBe(2)
  })

  it('detects extra keys relative to the baseline', () => {
    const result = compareEnvironments(
      parses({
        staging: 'A=1\nDEBUG_MODE=1',
        production: 'A=1',
      }),
      'production',
    )
    const rowDebug = result.rows.find((row) => row.key === 'DEBUG_MODE')
    expect(rowDebug?.status).toBe('extra')
    expect(rowDebug?.presentIn).toEqual(['staging'])
    expect(result.totals.extra).toBe(1)
  })

  it('treats keys absent from the baseline as extra even when shared elsewhere', () => {
    const result = compareEnvironments(
      parses({
        local: 'LOCAL_ONLY=1\nSHARED=2',
        production: 'SHARED=2',
      }),
      'production',
    )
    expect(result.rows.find((row) => row.key === 'LOCAL_ONLY')?.status).toBe('extra')
    expect(result.rows.find((row) => row.key === 'SHARED')?.status).toBe('shared')
  })

  it('does not mark the baseline itself as missing keys', () => {
    const result = compareEnvironments(
      parses({
        staging: 'A=1',
        production: 'A=1\nB=2',
      }),
      'staging',
    )
    const rowB = result.rows.find((row) => row.key === 'B')
    expect(rowB?.status).toBe('extra') // not in baseline (staging)
    expect(rowB?.missingIn).toEqual([])
    expect(rowB?.presentIn).toEqual(['production'])
  })

  it('collects duplicate occurrences per environment', () => {
    const result = compareEnvironments(
      parses({
        local: 'DUP=1\nDUP=2\nDUP=3',
        production: 'DUP=1',
      }),
      'production',
    )
    const row = result.rows.find((entry) => entry.key === 'DUP')
    expect(row?.duplicateOccurrences).toEqual({ local: 3 })
    expect(result.totals.duplicate).toBe(1)
  })

  it('treats unprovided environments as neither present nor missing', () => {
    const result = compareEnvironments(parses({ production: 'A=1' }), 'production')
    const row = result.rows.find((entry) => entry.key === 'A')
    expect(row?.presentIn).toEqual(['production'])
    expect(row?.missingIn).toEqual([])
    expect(result.summary.find((env) => env.id === 'local')?.provided).toBe(false)
    expect(result.totals.issues).toBe(0)
  })

  it('aggregates issue counts across environments', () => {
    const result = compareEnvironments(
      parses({
        local: 'A=1\nbad line',
        staging: 'B=2\n1BAD=1\n1BAD2=2',
        production: 'C=3',
      }),
      'production',
    )
    expect(result.totals.issues).toBe(3)
    expect(result.summary.find((env) => env.id === 'staging')?.issueCount).toBe(2)
  })

  it('sorts rows alphabetically for a deterministic matrix', () => {
    const result = compareEnvironments(
      parses({ production: 'ZEBRA=1\nALPHA=2\nMIDDLE=3' }),
      'production',
    )
    expect(result.rows.map((row) => row.key)).toEqual(['ALPHA', 'MIDDLE', 'ZEBRA'])
  })

  it('produces identical output for identical input (determinism)', () => {
    const input = parses({
      local: 'A=1\nB=2\nA=3',
      staging: 'B=1\nC=2',
      production: 'A=1\nC=3\nB=4',
    })
    expect(compareEnvironments(input, 'staging')).toEqual(compareEnvironments(input, 'staging'))
  })

  it('keeps per-environment presence stable while only status follows the baseline', () => {
    const input = parses({
      local: 'A=1\nB=2',
      staging: 'A=1',
      production: 'A=1\nC=3',
    })
    const rowsByBaseline = {
      local: compareEnvironments(input, 'local').rows,
      staging: compareEnvironments(input, 'staging').rows,
      production: compareEnvironments(input, 'production').rows,
    }

    // Presence and missingIn must not change merely because the baseline changes.
    for (const [baseline, rows] of Object.entries(rowsByBaseline)) {
      const rowA = rows.find((row) => row.key === 'A')
      expect(rowA?.presentIn).toEqual(['local', 'staging', 'production'])
      expect(rowA?.missingIn).toEqual([])
      const rowB = rows.find((row) => row.key === 'B')
      expect(rowB?.presentIn).toEqual(['local'])
      const rowC = rows.find((row) => row.key === 'C')
      expect(rowC?.presentIn).toEqual(['production'])
      // C is absent from every non-baseline environment that lacks it;
      // missingIn never includes the baseline itself.
      if (baseline === 'local') {
        expect(rowC?.missingIn).toEqual(['staging'])
      } else if (baseline === 'staging') {
        expect(rowC?.missingIn).toEqual(['local'])
      } else {
        expect(rowC?.missingIn).toEqual(['local', 'staging'])
      }
    }

    // Status must follow the baseline.
    expect(rowsByBaseline.production.find((row) => row.key === 'B')?.status).toBe('extra')
    // B is only in local: with local as baseline it is missing from the others.
    expect(rowsByBaseline.local.find((row) => row.key === 'B')?.status).toBe('missing')
    expect(rowsByBaseline.staging.find((row) => row.key === 'B')?.status).toBe('extra')
    expect(rowsByBaseline.production.find((row) => row.key === 'C')?.status).toBe('missing')
    expect(rowsByBaseline.local.find((row) => row.key === 'C')?.status).toBe('extra')
  })
})

describe('isComparisonEmpty', () => {
  it('is true when nothing was provided', () => {
    expect(isComparisonEmpty(parses({}))).toBe(true)
  })

  it('is false when any environment has input', () => {
    expect(isComparisonEmpty(parses({ local: 'A=1' }))).toBe(false)
  })
})
