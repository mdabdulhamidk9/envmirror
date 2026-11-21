import { describe, expect, it } from 'vitest'
import { parseEnv } from './env-parser'

describe('parseEnv — normal files', () => {
  it('extracts key names from a standard file', () => {
    const result = parseEnv('API_URL=https://example.com\nDB_HOST=localhost\nDEBUG=true')
    expect(result.keyNames).toEqual(['API_URL', 'DB_HOST', 'DEBUG'])
    expect(result.keyCount).toBe(3)
    expect(result.issues).toEqual([])
    expect(result.duplicateEntries).toEqual([])
    expect(result.isEmpty).toBe(false)
  })

  it('never captures values', () => {
    const result = parseEnv('SECRET_TOKEN=super-secret-value-123')
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('super-secret-value-123')
  })

  it('supports empty values', () => {
    const result = parseEnv('EMPTY_KEY=')
    expect(result.keyNames).toEqual(['EMPTY_KEY'])
    expect(result.issues).toEqual([])
  })

  it('ignores full-line comments', () => {
    const result = parseEnv('# a comment\nKEY_ONE=1\n  # indented comment\nKEY_TWO=2')
    expect(result.keyNames).toEqual(['KEY_ONE', 'KEY_TWO'])
    expect(result.isEmpty).toBe(false)
  })

  it('handles quoted values (single and double)', () => {
    const result = parseEnv("A='quoted value'\nB=\"double quoted\"\nC=\"with = sign\"")
    expect(result.keyNames).toEqual(['A', 'B', 'C'])
    expect(result.issues).toEqual([])
  })

  it('supports the optional export prefix', () => {
    const result = parseEnv('export PLAIN_KEY=1\nexport  SPACED_KEY=2')
    expect(result.keyNames).toEqual(['PLAIN_KEY', 'SPACED_KEY'])
    expect(result.issues).toEqual([])
  })

  it('tolerates whitespace around keys and separators', () => {
    const result = parseEnv('  SPACED = value  \n\tTABBED\t=\tvalue')
    expect(result.keyNames).toEqual(['SPACED', 'TABBED'])
    expect(result.issues).toEqual([])
  })

  it('handles values containing equals signs', () => {
    const result = parseEnv('CONNECTION=Server=localhost;Port=5432')
    expect(result.keyNames).toEqual(['CONNECTION'])
  })
})

describe('parseEnv — line endings and empty files', () => {
  it('parses CRLF line endings', () => {
    const result = parseEnv('A=1\r\nB=2\r\n')
    expect(result.keyNames).toEqual(['A', 'B'])
    expect(result.issues).toEqual([])
  })

  it('parses LF line endings', () => {
    const result = parseEnv('A=1\nB=2\n')
    expect(result.keyNames).toEqual(['A', 'B'])
  })

  it('parses lone CR line endings', () => {
    const result = parseEnv('A=1\rB=2')
    expect(result.keyNames).toEqual(['A', 'B'])
  })

  it('reports empty files as empty', () => {
    const result = parseEnv('')
    expect(result.isEmpty).toBe(true)
    expect(result.keyCount).toBe(0)
    expect(result.issues).toEqual([])
  })

  it('reports whitespace-only and comment-only files as empty', () => {
    const result = parseEnv('\n\n# only a comment\n   \n')
    expect(result.isEmpty).toBe(true)
    expect(result.keyCount).toBe(0)
    expect(result.issues).toEqual([])
  })

  it('strips a leading BOM', () => {
    const result = parseEnv('\uFEFFKEY=1')
    expect(result.keyNames).toEqual(['KEY'])
    expect(result.issues).toEqual([])
  })
})

describe('parseEnv — duplicates and invalid entries', () => {
  it('detects duplicate keys with occurrence counts', () => {
    const result = parseEnv('MODE=dev\nMODE=prod\nOTHER=1')
    expect(result.keyCount).toBe(2)
    expect(result.duplicateEntries).toEqual([{ name: 'MODE', line: 1, occurrences: 2 }])
    expect(result.keyNames).toEqual(['MODE', 'OTHER'])
  })

  it('reports lines without a separator as invalid', () => {
    const result = parseEnv('JUST_A_WORD\nKEY=1')
    expect(result.keyNames).toEqual(['KEY'])
    expect(result.issues).toEqual([{ line: 1, reason: 'missing_separator' }])
  })

  it('reports invalid key names without exposing line content', () => {
    const result = parseEnv('1BAD=1\nBAD NAME=2\nGOOD=3')
    expect(result.keyNames).toEqual(['GOOD'])
    expect(result.issues).toEqual([
      { line: 1, reason: 'invalid_name' },
      { line: 2, reason: 'invalid_name' },
    ])
  })

  it('reports issue line numbers only (1-based), never content', () => {
    const serialized = JSON.stringify(parseEnv('garbage line here\n'))
    expect(serialized).not.toContain('garbage line here')
  })

  it('is deterministic across repeated calls', () => {
    const source = 'B=1\nA=2\nA=3\n# comment\nC=4'
    expect(parseEnv(source)).toEqual(parseEnv(source))
  })
})
