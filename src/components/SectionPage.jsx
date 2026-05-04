const CAT_ICONS = {
  'Creatinas': '⚡', 'Proteínas Whey': '🥛', 'Pre-Entrenamientos': '🔥',
  'Proteínas Isoladas': '💎', 'Gainers de Masa': '🏋️', 'Quemadores de Grasa': '🔥',
  'Bebidas Energéticas': '⚡', 'Vasodilatadores / Pump': '💉', 'Glutamina': '🧬',
  'Aminoácidos Esenciales': '🧬', 'BCAA': '🧬', 'Precursores Hormonales': '⚗️',
  'Proteínas Veganas': '🌱', 'Snacks Proteicos': '🍫', 'Accesorios de Gym': '🎽',
  'Shakers y Botellas': '🥤', 'Proteínas de Carne': '🥩', 'Electrolitos': '💧',
  'Magnesio para Agarre': '✊', 'Magnesio': '🧲', 'Vitaminas Esenciales': '💊',
  'Adaptógenos y Hormonas': '🌿', 'Multivitamínicos': '💊', 'Colágeno y Belleza': '✨',
  'Omega y Grasas Saludables': '🐟', 'Minerales': '💊', 'Longevidad Celular': '🔬',
  'Sueño y Relajación': '🌙', 'Salud Mental y Cognitiva': '🧠',
  'Digestión y Enzimas': '🌱', 'Probióticos': '🦠', 'Salud Digestiva': '🌱',
  'Articulaciones': '🦴', 'Salud Cardiovascular': '❤️', 'Control Metabólico': '⚖️',
  'Detox y Salud Hepática': '🍃', 'Suplementos Especializados': '🔬',
  'Vitaminas y Suplementos': '💊', 'Multivitamínicos': '💊',
  'Aceites Esenciales Individuales': '🌸', 'Mezclas doTERRA': '🌺',
  'Bienestar Interno doTERRA': '🌿', 'Cuidado Personal': '✨',
  'Kits Especiales': '🎁', 'Cuidado del Cabello': '💆',
  'Cuidado de la Piel': '🧴', 'Almacenamiento y Botellas': '🫙',
  'Aromaterapia Emocional': '🧘', 'Difusores': '💨',
  'Protección Solar doTERRA': '☀️', 'Kits de AutoEnvío': '📦',
};

export default function SectionPage({ sectionId, sectionData, productsByCategory, onSelectCategory }) {
  const { label, sublabel, color, categories } = sectionData;

  const populated = categories
    .map(cat => ({ cat, count: (productsByCategory[cat] || []).length }))
    .filter(({ count }) => count > 0);

  const totalProducts = populated.reduce((s, { count }) => s + count, 0);

  return (
    <div className="section-page">

      <div className="page-header">
        <div className="page-header-bar" style={{ background: color }} />
        <div className="page-header-content">
          <div className="page-sublabel">{sublabel}</div>
          <h1 className="page-title" style={{ color }}>{label}</h1>
          <p className="page-meta">
            {populated.length} categorías · {totalProducts} productos
          </p>
        </div>
      </div>

      <p className="section-page-guide">Elegí una categoría para ver los productos</p>

      <div className="cat-grid">
        {populated.map(({ cat, count }) => (
          <button
            key={cat}
            className="cat-tile"
            style={{ '--sc': color }}
            onClick={() => onSelectCategory(cat)}
            aria-label={`Ver ${cat}`}
          >
            <div className="cat-tile-icon">{CAT_ICONS[cat] || '📦'}</div>
            <div className="cat-tile-name">{cat}</div>
            <div className="cat-tile-footer">
              <span className="cat-tile-count">{count} productos</span>
              <span className="cat-tile-arrow">→</span>
            </div>
          </button>
        ))}
      </div>

    </div>
  );
}
