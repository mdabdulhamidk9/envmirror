export type EnvId = 'local' | 'staging' | 'production'

export interface EnvSourceState {
  /** Raw pasted/uploaded text. Held in memory only — never persisted. */
  text: string
  /** Original file name when the input came from an upload, otherwise null. */
  fileName: string | null
  /** User-facing error for this card (never contains file content). */
  error: string | null
}

export type EnvSources = Record<EnvId, EnvSourceState>

export type KeyStatus = 'shared' | 'missing' | 'extra'

export type MatrixFilter = 'all' | KeyStatus | 'duplicates'
