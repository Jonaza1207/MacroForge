export default function Controls({ activeFilter, searchQuery, visibleCount, onFilter, onSearch }) {
  const filters = [
    { id: 'all', label: 'Todos' },
    { id: 'gym', label: '💪 Gym' },
    { id: 'vita', label: '🌿 Vitaminas' },
    { id: 'dote', label: '🌸 doTERRA' },
  ];

  return (
    <div className="controls">
      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Buscar producto, marca, beneficio..."
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
        />
      </div>
      {filters.map(f => (
        <button
          key={f.id}
          className={`fbtn${activeFilter === f.id ? ' active' : ''}`}
          onClick={() => onFilter(f.id)}
        >
          {f.label}
        </button>
      ))}
      <span className="results">{visibleCount} resultado{visibleCount !== 1 ? 's' : ''}</span>
    </div>
  );
}
