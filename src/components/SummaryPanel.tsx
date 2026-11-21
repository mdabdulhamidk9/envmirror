import type { ComparisonResult } from '../lib/compare'

const TILES: Array<{ key: keyof ComparisonResult['totals']; label: string; tone: string }> = [
  { key: 'shared', label: 'Shared keys', tone: 'green' },
  { key: 'missing', label: 'Missing keys', tone: 'red' },
  { key: 'extra', label: 'Extra keys', tone: 'amber' },
  { key: 'duplicate', label: 'Duplicates', tone: 'purple' },
  { key: 'issues', label: 'Invalid lines', tone: 'red' },
]

export function SummaryPanel({ comparison }: { comparison: ComparisonResult }) {
  return (
    <section className="summary" aria-label="Comparison summary">
      <ul className="summary__grid">
        {TILES.map((tile) => (
          <li key={tile.key} className={`summary-tile summary-tile--${tile.tone}`}>
            <span className="summary-tile__value">{comparison.totals[tile.key]}</span>
            <span className="summary-tile__label">{tile.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
