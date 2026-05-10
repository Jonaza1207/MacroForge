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

// One-line expert guidance — covers EVERY category.
// Reduces uncertainty instantly. No walls of text.
// Rule: answer "what does this do for me?" in one line.
const CATEGORY_HINTS = {
  // ── GYM & Performance ──────────────────────────────────────────
  'Creatinas':                'Mejoran fuerza, rendimiento y volumen muscular',
  'Proteínas Whey':           'Recuperación y crecimiento muscular post-entreno',
  'Pre-Entrenamientos':       'Energía, enfoque y resistencia para entrenar más duro',
  'Proteínas Isoladas':       'Proteína pura de rápida absorción, mínima grasa y lactosa',
  'Gainers de Masa':          'Para subir de peso y masa muscular con calorías y proteína',
  'Quemadores de Grasa':      'Apoyan la pérdida de grasa con termogénesis y energía',
  'Bebidas Energéticas':      'Energía y rendimiento sostenido durante el día o entreno',
  'Vasodilatadores / Pump':   'Más flujo sanguíneo, pump muscular y venas visibles',
  'Glutamina':                'Recuperación muscular más rápida y sistema inmune',
  'Aminoácidos Esenciales':   'Bloque constructor del músculo, sin calorías extra',
  'BCAA':                     'Leucina, isoleucina y valina — protegen y construyen músculo',
  'Precursores Hormonales':   'Apoyan niveles hormonales naturales para rendimiento',
  'Proteínas Veganas':        'Proteína completa sin lácteos — apta para veganos e intolerantes',
  'Proteínas de Carne':       'Proteína de carne bovina — digestiva y sin lactosa',
  'Snacks Proteicos':         'Proteína conveniente entre comidas, sin descuidar la dieta',
  'Electrolitos':             'Hidratación óptima y prevención de calambres musculares',
  'Accesorios de Gym':        'Equipamiento y accesorios para entrenar mejor',
  'Shakers y Botellas':       'Contenedores para mezclar y transportar suplementos',
  'Magnesio para Agarre':     'Mejora el agarre y la seguridad en ejercicios con peso',
  // ── Vitaminas & Bienestar ───────────────────────────────────────
  'Magnesio':                 'Sueño profundo, reducción de estrés y recuperación muscular',
  'Vitaminas Esenciales':     'Cobertura nutricional diaria que la dieta no siempre da',
  'Multivitamínicos':         'Todo lo esencial en una sola dosis diaria conveniente',
  'Adaptógenos y Hormonas':   'Reducen cortisol, apoyan energía y equilibrio hormonal',
  'Omega y Grasas Saludables':'Salud cardiovascular, cerebro y reducción de inflamación',
  'Colágeno y Belleza':       'Piel, cabello, uñas y articulaciones — desde adentro',
  'Sueño y Relajación':       'Dormí mejor, recuperate más rápido y despertá más descansado',
  'Salud Mental y Cognitiva': 'Enfoque, memoria y bienestar mental sin efectos secundarios',
  'Control Metabólico':       'Apoyo al metabolismo, glucosa y composición corporal',
  'Detox y Salud Hepática':   'Limpieza hepática y desintoxicación natural del organismo',
  'Probióticos':              'Flora intestinal saludable, inmunidad y digestión eficiente',
  'Digestión y Enzimas':      'Digestión eficiente y absorción óptima de nutrientes',
  'Salud Digestiva':          'Bienestar gastrointestinal y comodidad digestiva diaria',
  'Articulaciones':           'Movimiento sin dolor, cartílago y flexibilidad articular',
  'Salud Cardiovascular':     'Corazón y circulación saludable a largo plazo',
  'Minerales':                'Hierro, zinc, calcio y más — lo que muchas dietas no cubren',
  'Longevidad Celular':       'NAD+, antioxidantes y biohacking para envejecer mejor',
  'Suplementos Especializados':'Formulaciones específicas para necesidades particulares',
  'Vitaminas y Suplementos':  'Vitaminas individuales y fórmulas especializadas de bienestar',
  // ── doTERRA ─────────────────────────────────────────────────────
  'Aceites Esenciales Individuales': 'Pureza 100% — cada aceite para su aplicación específica',
  'Mezclas doTERRA':          'Fórmulas propietarias para resultados concretos y rápidos',
  'Bienestar Interno doTERRA':'Suplementos doTERRA para bienestar desde adentro',
  'Cuidado Personal':         'Higiene y cuidado corporal con ingredientes naturales doTERRA',
  'Cuidado del Cabello':      'Nutrición capilar con fórmulas basadas en aceites esenciales',
  'Cuidado de la Piel':       'Piel saludable, hidratada y radiante con productos doTERRA',
  'Aromaterapia Emocional':   'Roll-ons para equilibrio emocional y bienestar mental',
  'Difusores':                'Transforma cualquier espacio con aromaterapia de alta calidad',
  'Protección Solar doTERRA': 'Protección solar natural con ingredientes seguros y efectivos',
  'Almacenamiento y Botellas':'Contenedores para almacenar y transportar tus aceites esenciales',
  'Kits Especiales':          'La mejor forma de empezar o ampliar tu colección doTERRA',
  'Kits de AutoEnvío':        'Selecciones curadas con descuentos regulares para usuarios frecuentes',
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
              {hint && (
                <div className="cat-tile-hint">{hint}</div>
              )}
              {isBeginner && !hint && (
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
