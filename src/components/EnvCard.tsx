import { useId } from 'react'
import type { EnvId } from '../types'
import type { ParseResult } from '../lib/env-parser'

interface EnvCardProps {
  id: EnvId
  label: string
  description: string
  source: { text: string; fileName: string | null; error: string | null }
  parse: ParseResult | null
  onText: (text: string) => void
  onFile: (file: File) => void
  onClear: () => void
}

export function EnvCard({ id, label, description, source, parse, onText, onFile, onClear }: EnvCardProps) {
  const fileInputId = useId()
  const hasContent = source.text.trim() !== ''
  const duplicateCount = parse?.duplicateEntries.length ?? 0
  const issueCount = parse?.issues.length ?? 0

  return (
    <article className="card env-card" aria-labelledby={`${id}-title`}>
      <div className="env-card__head">
        <div>
          <h2 id={`${id}-title`} className="env-card__title">{label}</h2>
          <p className="env-card__description">{description}</p>
        </div>
        <span className={`badge ${hasContent ? 'badge--green' : 'badge--muted'}`} aria-live="polite">
          {hasContent ? `${parse?.keyCount ?? 0} keys` : 'empty'}
        </span>
      </div>

      <div className="env-card__actions">
        <label className="btn btn--secondary" htmlFor={fileInputId}>
          Upload .env
          <input
            id={fileInputId}
            type="file"
            accept=".env,.txt,text/plain"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onFile(file)
              event.target.value = ''
            }}
          />
        </label>
        <button type="button" className="btn btn--ghost" onClick={onClear} disabled={!hasContent && source.error === null}>
          Clear
        </button>
      </div>

      <textarea
        className="env-card__textarea"
        value={source.text}
        onChange={(event) => onText(event.target.value)}
        placeholder={`Paste ${label.toLowerCase()} .env content…`}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        aria-label={`${label} environment content`}
        rows={8}
      />

      <div className="env-card__foot">
        {source.fileName !== null && <span className="chip chip--file">{source.fileName}</span>}
        {duplicateCount > 0 && (
          <span className="chip chip--warn">
            {duplicateCount} duplicate {duplicateCount === 1 ? 'key' : 'keys'}
          </span>
        )}
        {issueCount > 0 && (
          <span className="chip chip--danger">
            {issueCount} invalid {issueCount === 1 ? 'line' : 'lines'}
          </span>
        )}
      </div>

      {source.error !== null && (
        <p className="env-card__error" role="alert">{source.error}</p>
      )}
    </article>
  )
}
