import type { EnvId } from '../types'
import { ENV_IDS, ENV_LABELS, type ComparisonResult, type KeyRow } from '../lib/compare'
import type { MatrixFilter } from '../types'

interface MatrixPanelProps {
  comparison: ComparisonResult
  filter: MatrixFilter
  onFilterChange: (filter: MatrixFilter) => void
  search: string
  onSearchChange: (search: string) => void
}

const FILTERS: Array<{ id: MatrixFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'shared', label: 'Shared' },
  { id: 'missing', label: 'Missing' },
  { id: 'extra', label: 'Extra' },
  { id: 'duplicates', label: 'Duplicates' },
]

function matchesFilter(row: KeyRow, filter: MatrixFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'shared':
      return row.status === 'shared'
    case 'missing':
      return row.status === 'missing'
    case 'extra':
      return row.status === 'extra'
    case 'duplicates':
      return Object.keys(row.duplicateOccurrences).length > 0
  }
}

function presenceLabel(
  row: KeyRow,
  id: EnvId,
  provided: boolean,
): { text: string; tone: 'green' | 'red' | 'muted' } {
  if (!provided) return { text: 'Not provided', tone: 'muted' }
  if (row.presentIn.includes(id)) return { text: 'Present', tone: 'green' }
  return { text: 'Missing', tone: 'red' }
}

export function MatrixPanel({
  comparison,
  filter,
  onFilterChange,
  search,
  onSearchChange,
}: MatrixPanelProps) {
  const { rows, summary, baseline } = comparison
  const providedMap = new Map(summary.map((env) => [env.id, env.provided]))
  const loweredSearch = search.trim().toLowerCase()
  const visibleRows = rows.filter(
    (row) => matchesFilter(row, filter) && row.key.toLowerCase().includes(loweredSearch),
  )

  return (
    <section className="matrix" aria-label="Comparison matrix">
      <div className="matrix__toolbar">
        <div className="matrix__filters" role="group" aria-label="Filter rows">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`filter-btn ${filter === option.id ? 'filter-btn--active' : ''}`}
              aria-pressed={filter === option.id}
              onClick={() => onFilterChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="matrix__search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search variable names…"
          aria-label="Search variable names"
        />
      </div>

      {visibleRows.length === 0 ? (
        <p className="matrix__empty">No variable names match the current search and filters.</p>
      ) : (
        <div className="matrix__scroll" tabIndex={0}>
          <table className="matrix__table">
            <caption className="sr-only">
              Environment variable comparison relative to the {ENV_LABELS[baseline]} baseline
            </caption>
            <thead>
              <tr>
                <th scope="col">Variable</th>
                {ENV_IDS.map((id) => (
                  <th scope="col" key={id} className="matrix__env-col">
                    {ENV_LABELS[id]}
                    {id === baseline && <span className="matrix__baseline-star" title="Baseline"> ★</span>}
                  </th>
                ))}
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="matrix__key">
                    {row.key}
                    {Object.entries(row.duplicateOccurrences).map(([envId, count]) => (
                      <span key={envId} className="chip chip--dup" title={`${ENV_LABELS[envId as EnvId]}: defined ${count}×`}>
                        ×{count}
                      </span>
                    ))}
                  </th>
                  {ENV_IDS.map((id) => {
                    const presence = presenceLabel(row, id, providedMap.get(id) ?? false)
                    return (
                      <td key={id}>
                        <span className={`badge badge--${presence.tone}`}>{presence.text}</span>
                      </td>
                    )
                  })}
                  <td>
                    <span className={`badge badge--${row.status === 'shared' ? 'green' : row.status === 'missing' ? 'red' : 'amber'}`}>
                      {row.status === 'shared' ? 'Shared' : row.status === 'missing' ? `Missing in ${row.missingIn.length}` : 'Extra'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="matrix__count" aria-live="polite">
        Showing {visibleRows.length} of {rows.length} variable names
      </p>
    </section>
  )
}
