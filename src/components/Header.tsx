interface HeaderProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__brand">
        <svg className="header__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <rect x="2" y="6" width="12" height="20" rx="2.5" className="header__mark-frame" />
          <rect x="18" y="6" width="12" height="20" rx="2.5" className="header__mark-frame" />
          <path d="M13 11h6M13 16h6M13 21h6" className="header__mark-line" />
        </svg>
        <div>
          <h1 className="header__title">EnvMirror</h1>
          <p className="header__tagline">Compare .env variable names privately in your browser</p>
        </div>
      </div>
      <div className="header__actions">
        <span className="privacy-chip" title="All parsing and comparison happens locally in your browser. No configuration data is intentionally uploaded or saved by EnvMirror.">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="privacy-chip__icon">
            <path d="M8 1.5 2.5 3.8v3.9c0 3.5 2.4 6 5.5 6.8 3.1-.8 5.5-3.3 5.5-6.8V3.8L8 1.5Z" fill="currentColor" opacity=".15" />
            <path d="M8 1.5 2.5 3.8v3.9c0 3.5 2.4 6 5.5 6.8 3.1-.8 5.5-3.3 5.5-6.8V3.8L8 1.5Zm0 1.6 4.5 1.9v2.7c0 2.7-1.9 4.7-4.5 5.4-2.6-.7-4.5-2.7-4.5-5.4V5L8 3.1Z" fill="currentColor" />
            <path d="M7.2 10.5 5.4 8.7l.9-.9.9.9 2.5-2.5.9.9-3.4 3.5Z" fill="currentColor" />
          </svg>
          Browser-only processing
        </span>
        <button
          type="button"
          className="btn btn--icon"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
