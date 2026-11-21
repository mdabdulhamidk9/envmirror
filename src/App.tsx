import { useCallback, useMemo, useState } from 'react'
import type { EnvId, EnvSources, MatrixFilter } from './types'
import { Header } from './components/Header'
import { EnvCard } from './components/EnvCard'
import { SummaryPanel } from './components/SummaryPanel'
import { MatrixPanel } from './components/MatrixPanel'
import { EmptyState } from './components/EmptyState'
import { useTheme } from './hooks/useTheme'
import { useEnvironments } from './hooks/useEnvironments'
import { compareEnvironments, ENV_IDS, ENV_LABELS, isComparisonEmpty } from './lib/compare'
import { collectUnionKeys, generateEnvExample } from './lib/export'

const SAMPLE: EnvSources = {
  local: {
    text: '# Development\nAPI_URL=http://localhost:3000\nDATABASE_URL=postgres://localhost:5432/app\nFEATURE_NEW_UI=true\nDEBUG=true\nTOKEN_TTL=3600\nTELEMETRY=off',
    fileName: null,
    error: null,
  },
  staging: {
    text: 'API_URL=https://staging.example.com\nDATABASE_URL=postgres://db-staging:5432/app\nFEATURE_NEW_UI=true\nTOKEN_TTL=7200\nLOG_LEVEL=info\nCACHE_TTL=60',
    fileName: null,
    error: null,
  },
  production: {
    text: 'API_URL=https://api.example.com\nDATABASE_URL=postgres://db-prod:5432/app\nTOKEN_TTL=3600\nLOG_LEVEL=warn\nCACHE_TTL=300\nCDN_HOST=cdn.example.com',
    fileName: null,
    error: null,
  },
}

const CARD_META: Array<{ id: EnvId; description: string }> = [
  { id: 'local', description: 'Your development machine' },
  { id: 'staging', description: 'Pre-production environment' },
  { id: 'production', description: 'Live environment' },
]

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const { sources, parses, setText, loadFile, clear, clearAll, hasAnyInput } = useEnvironments()
  const [baseline, setBaseline] = useState<EnvId>('production')
  const [filter, setFilter] = useState<MatrixFilter>('all')
  const [search, setSearch] = useState('')

  const comparison = useMemo(() => compareEnvironments(parses, baseline), [parses, baseline])
  const showEmpty = isComparisonEmpty(parses)

  const handleFile = useCallback(
    (id: EnvId) => (file: File) => {
      void loadFile(id, file)
    },
    [loadFile],
  )

  const handleExport = useCallback(() => {
    const union = collectUnionKeys({
      local: parses.local?.keyNames ?? [],
      staging: parses.staging?.keyNames ?? [],
      production: parses.production?.keyNames ?? [],
    })
    const blob = new Blob([generateEnvExample(union)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'env.example'
    anchor.click()
    URL.revokeObjectURL(url)
  }, [parses])

  const handleReset = useCallback(() => {
    clearAll()
    setFilter('all')
    setSearch('')
  }, [clearAll])

  return (
    <div className="page">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="main">
        <section className="cards" aria-label="Environment inputs">
          {CARD_META.map(({ id, description }) => (
            <EnvCard
              key={id}
              id={id}
              label={ENV_LABELS[id]}
              description={description}
              source={sources[id]}
              parse={parses[id]}
              onText={(text) => setText(id, text)}
              onFile={handleFile(id)}
              onClear={() => clear(id)}
            />
          ))}
        </section>

        <div className="toolbar">
          <label className="toolbar__baseline">
            Baseline
            <select value={baseline} onChange={(event) => setBaseline(event.target.value as EnvId)}>
              {ENV_IDS.map((id) => (
                <option key={id} value={id}>
                  {ENV_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <div className="toolbar__spacer" />
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleExport}
            disabled={showEmpty}
          >
            Download .env.example
          </button>
          <button type="button" className="btn btn--danger" onClick={handleReset} disabled={!hasAnyInput}>
            Reset all
          </button>
        </div>

        {showEmpty ? (
          <EmptyState onUseSample={() => ENV_IDS.forEach((id) => setText(id, SAMPLE[id].text))} />
        ) : (
          <>
            <SummaryPanel comparison={comparison} />
            <MatrixPanel
              comparison={comparison}
              filter={filter}
              onFilterChange={setFilter}
              search={search}
              onSearchChange={setSearch}
            />
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          🔒 <strong>Privacy:</strong> EnvMirror processes your .env files locally in your browser.
          Values remain visible in the input editors while you work, but are excluded from
          comparison results and exported files. No configuration data is intentionally uploaded
          or saved by EnvMirror; raw input is kept only in browser memory during the current
          session and is removed by Reset all or by closing the page.
        </p>
      </footer>
    </div>
  )
}
