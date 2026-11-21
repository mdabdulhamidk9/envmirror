import { useCallback, useMemo, useState } from 'react'
import type { EnvId, EnvSourceState, EnvSources } from '../types'
import { parseEnv, type ParseResult } from '../lib/env-parser'
import type { EnvParse } from '../lib/compare'

export const MAX_FILE_BYTES = 512 * 1024

function createEmptySource(): EnvSourceState {
  return { text: '', fileName: null, error: null }
}

export function createEmptySources(): EnvSources {
  return {
    local: createEmptySource(),
    staging: createEmptySource(),
    production: createEmptySource(),
  }
}

function isAllowedFileName(name: string): boolean {
  const lowered = name.toLowerCase()
  return lowered.endsWith('.env') || lowered.endsWith('.txt') || lowered === '.env'
}

/**
 * In-memory state for the three environment inputs plus their parsed results.
 * Nothing here is persisted anywhere; clearing removes content from memory.
 */
export function useEnvironments(): {
  sources: EnvSources
  parses: Record<EnvId, EnvParse>
  setText: (id: EnvId, text: string) => void
  loadFile: (id: EnvId, file: File) => Promise<void>
  clear: (id: EnvId) => void
  clearAll: () => void
  hasAnyInput: boolean
} {
  const [sources, setSources] = useState<EnvSources>(createEmptySources)

  const setText = useCallback((id: EnvId, text: string) => {
    setSources((previous) => ({
      ...previous,
      [id]: { text, fileName: null, error: null },
    }))
  }, [])

  const loadFile = useCallback(async (id: EnvId, file: File) => {
    if (!isAllowedFileName(file.name)) {
      setSources((previous) => ({
        ...previous,
        [id]: { ...previous[id], error: 'Unsupported file type. Please use a .env or .txt file.' },
      }))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setSources((previous) => ({
        ...previous,
        [id]: { ...previous[id], error: 'File is too large (limit: 512 KB).' },
      }))
      return
    }
    try {
      const text = await file.text()
      setSources((previous) => ({
        ...previous,
        [id]: { text, fileName: file.name, error: null },
      }))
    } catch {
      setSources((previous) => ({
        ...previous,
        [id]: { ...previous[id], error: 'The file could not be read.' },
      }))
    }
  }, [])

  const clear = useCallback((id: EnvId) => {
    setSources((previous) => ({ ...previous, [id]: createEmptySource() }))
  }, [])

  const clearAll = useCallback(() => {
    setSources(createEmptySources())
  }, [])

  const parses = useMemo(() => {
    const result: Record<EnvId, EnvParse> = {
      local: null,
      staging: null,
      production: null,
    }
    for (const id of ['local', 'staging', 'production'] as const) {
      const source = sources[id]
      result[id] = source.text.trim() === '' ? null : parseEnv(source.text)
    }
    return result
  }, [sources])

  const hasAnyInput = useMemo(
    () => Object.values(sources).some((source) => source.text.trim() !== ''),
    [sources],
  )

  return { sources, parses, setText, loadFile, clear, clearAll, hasAnyInput }
}

export type { ParseResult }
