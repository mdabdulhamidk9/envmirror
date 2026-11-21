interface EmptyStateProps {
  onUseSample: () => void
}

export function EmptyState({ onUseSample }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-label="Get started">
      <svg viewBox="0 0 48 48" className="empty-state__icon" aria-hidden="true" focusable="false">
        <rect x="4" y="10" width="17" height="28" rx="3" className="empty-state__frame" />
        <rect x="27" y="10" width="17" height="28" rx="3" className="empty-state__frame" />
        <path d="M21 18h6M21 24h6M21 30h6" className="empty-state__line" />
      </svg>
      <h2>Compare your environments</h2>
      <p>
        Upload or paste up to three <code>.env</code> files — Local, Staging, and Production.
        EnvMirror compares variable <strong>names</strong> and highlights what is missing,
        extra, or duplicated. Values stay visible in the input editors while you work but are
        excluded from comparison results and exported files.
      </p>
      <button type="button" className="btn btn--primary" onClick={onUseSample}>
        Try with sample data
      </button>
    </section>
  )
}
