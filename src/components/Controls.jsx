import ThemeToggle from './ThemeToggle';

export default function Controls({ activeFilter, searchQuery, visibleCount, onFilter, onSearch, theme, onThemeToggle }) {
  const filters = [
    { id: 'all',  label: 'Todos'       },
    { id: 'gym',  label: '💪 Gym'      },
    { id: 'vita', label: '🌿 Vitaminas' },
    { id: 'dote', label: '🌸 doTERRA'  },
  ];

  return (
    <div className="controls">
      <div className="controls-brand">MACRO<span>FORGE</span></div>

      <div className="search">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Buscar producto, marca..."
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      {filters.map(f => (
        <button
          key={f.id}
          className={`filter-btn${activeFilter === f.id ? ' active' : ''}`}
          onClick={() => onFilter(f.id)}
        >
          {f.label}
        </button>
      ))}

      <span className="count">{visibleCount} resultado{visibleCount !== 1 ? 's' : ''}</span>

      <ThemeToggle theme={theme} onToggle={onThemeToggle} />
    </div>
  );
}
