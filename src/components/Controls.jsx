import ThemeToggle from './ThemeToggle';
import { SECTIONS } from '../data/catalog';

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default function Controls({
  view, activeSection, activeCategory,
  searchQuery, visibleCount,
  onBack, onGoHome, onSearch,
  theme, onThemeToggle,
}) {
  const sectionData = activeSection ? SECTIONS[activeSection] : null;
  const isHome = view === 'home';

  return (
    <div className="controls">

      {/* ── Back button (non-home views) ── */}
      {!isHome && (
        <button className="nav-back" onClick={onBack} aria-label="Volver">
          <ChevronLeft />
          <span className="nav-back-label">Volver</span>
        </button>
      )}

      {/* ── Brand logo (home only, desktop) ── */}
      {isHome && (
        <div className="controls-brand">MACRO<span>FORGE</span></div>
      )}

      {/* ── Breadcrumb (non-home views) ── */}
      {!isHome && (
        <div className="nav-breadcrumb">
          <button className="nav-crumb" onClick={onGoHome}>Inicio</button>
          {activeSection && (
            <>
              <span className="nav-crumb-sep">›</span>
              <button
                className={`nav-crumb ${view === 'section' ? 'is-active' : ''}`}
                onClick={view === 'category' ? onBack : undefined}
                style={view === 'section' ? { color: sectionData?.color } : {}}
              >
                {sectionData?.label?.split(' ')[0] || activeSection.toUpperCase()}
              </button>
            </>
          )}
          {activeCategory && (
            <>
              <span className="nav-crumb-sep">›</span>
              <span className="nav-crumb is-active" style={{ color: sectionData?.color }}>
                {activeCategory}
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Search ── */}
      <div className="search">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder={
            view === 'category' ? `Buscar en ${activeCategory}...`
            : view === 'section' ? `Buscar en ${sectionData?.label?.split(' ')[0] || ''}...`
            : 'Buscar producto, marca...'
          }
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear"
            onClick={() => onSearch('')}
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Result count ── */}
      {visibleCount !== null && (
        <span className="count">{visibleCount} resultado{visibleCount !== 1 ? 's' : ''}</span>
      )}

      <ThemeToggle theme={theme} onToggle={onThemeToggle} />
    </div>
  );
}
