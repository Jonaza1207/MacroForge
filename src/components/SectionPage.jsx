import { analytics } from '../lib/analytics';

// Categories with the lowest entry barrier — ideal for customers new to supplementation.
// Shown with a subtle "Para empezar" confidence signal on the category tile.
const BEGINNER_CATEGORIES = new Set([
  'Creatinas',
  'Proteínas Whey',
  'Glutamina',
  'Vitaminas Esenciales',
  'Magnesio',
  'Multivitamínicos',
  'Omega y Grasas Saludables',
  'Kits Especiales',
]);

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
  'Vitaminas y Suplementos': '💊',
  'Aceites Esenciales Individuales': '🌸', 'Mezclas doTERRA': '🌺',
  'Bienestar Interno doTERRA': '🌿', 'Cuidado Personal': '✨',
  'Kits Especiales': '🎁', 'Cuidado del Cabello': '💆',
  'Cuidado de la Piel': '🧴', 'Almacenamiento y Botellas': '🫙',
  'Aromaterapia Emocional': '🧘', 'Difusores': '💨',
  'Protección Solar doTERRA': '☀️', 'Kits de AutoEnvío': '📦',
};

// High-intent categories that anchor each section's first viewport
const FEATURED = {
  gym:  ['Creatinas', 'Proteínas Whey', 'Pre-Entrenamientos', 'Proteínas Isoladas'],
  vita: ['Magnesio', 'Vitaminas Esenciales', 'Multivitamínicos', 'Sueño y Relajación'],
  dote: ['Aceites Esenciales Individuales', 'Mezclas doTERRA', 'Kits Especiales'],
};

// One-line expert guidance — reduces uncertainty for first-time buyers
const CATEGORY_HINTS = {
  'Creatinas':                       'Ideal para fuerza y volumen',
  'Proteínas Whey':                  'Lo más buscado para ganar músculo',
  'Pre-Entrenamientos':              'Energía para entrenar más duro',
  'Proteínas Isoladas':              'Proteína limpia y rápida absorción',
  'Magnesio':                        'Sueño, estrés y recuperación muscular',
  'Vitaminas Esenciales':            'Cobertura nutricional diaria completa',
  'Multivitamínicos':                'Todo lo esencial en una sola dosis',
  'Sueño y Relajación':              'Dormí mejor, recuperate más rápido',
  'Aceites Esenciales Individuales': 'Pureza 100% para cada necesidad',
  'Mezclas doTERRA':                 'Formuladas para resultados específicos',
  'Kits Especiales':                 'La mejor forma de empezar con doTERRA',
};

export default function SectionPage({ sectionId, sectionData, productsByCategory, onSelectCategory }) {
  const { label, sublabel, color, categories } = sectionData;

  const populated = categories
    .map(cat => ({ cat, count: (productsByCategory[cat] || []).length }))
    .filter(({ count }) => count > 0);

  const totalProducts = populated.reduce((s, { count }) => s + count, 0);

  const featuredOrder = FEATURED[sectionId] || [];
  const featuredSet   = new Set(featuredOrder);

  // Featured categories first (in priority order), then rest (preserving catalog order)
  const sorted = [
    ...featuredOrder.map(cat => populated.find(p => p.cat === cat)).filter(Boolean),
    ...populated.filter(({ cat }) => !featuredSet.has(cat)),
  ];

  function handleCategoryClick(cat) {
    if (BEGINNER_CATEGORIES.has(cat)) {
      analytics.beginnerPath(cat, sectionId);
    }
    onSelectCategory(cat);
  }

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

      <p className="section-page-guide">Elegí tu objetivo para encontrar los productos correctos.</p>

      <div className="cat-grid">
        {sorted.map(({ cat, count }) => {
          const isFeatured  = featuredSet.has(cat);
          const isBeginner  = BEGINNER_CATEGORIES.has(cat);
          const hint        = CATEGORY_HINTS[cat];
          return (
            <button
              key={cat}
              className={`cat-tile${isFeatured ? ' cat-tile--featured' : ''}`}
              style={{ '--sc': color }}
              onClick={() => handleCategoryClick(cat)}
              aria-label={`Ver ${cat}`}
            >
              <div className="cat-tile-icon">{CAT_ICONS[cat] || '📦'}</div>
              <div className="cat-tile-name">{cat}</div>
              {isFeatured && hint && (
                <div className="cat-tile-hint">{hint}</div>
              )}
              {isBeginner && !isFeatured && (
                <div className="cat-tile-beginner">Ideal para empezar</div>
              )}
              <div className="cat-tile-footer">
                <span className="cat-tile-count">{count} productos</span>
                <span className="cat-tile-arrow">→</span>
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}
