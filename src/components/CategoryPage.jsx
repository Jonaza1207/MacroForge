import { analytics } from '../lib/analytics';
import { buildWaUrl } from '../lib/whatsapp';
import { COMPARISONS } from '../data/comparisons';
import ProductCard from './ProductCard';

const CAT_GUIDE = {
  'Creatinas':                  'Elegí la mejor creatina para fuerza, volumen y rendimiento.',
  'Proteínas Whey':             'Proteínas de suero ideales para ganar masa muscular.',
  'Pre-Entrenamientos':         'Energía y enfoque para entrenar al máximo nivel.',
  'Proteínas Isoladas':         'Proteína de máxima pureza para resultados serios.',
  'Gainers de Masa':            'Ganadores de peso y masa con alta densidad calórica.',
  'BCAA':                       'Aminoácidos esenciales para recuperación y resistencia.',
  'Glutamina':                  'Recuperación muscular y refuerzo del sistema inmune.',
  'Quemadores de Grasa':        'Acelera tu metabolismo y quema grasa más rápido.',
  'Aminoácidos Esenciales':     'EAA completos para rendimiento y recuperación óptimos.',
  'Precursores Hormonales':     'Aumenta testosterona y rendimiento de forma natural.',
  'Proteínas Veganas':          'Nutrición de alto valor sin ingredientes animales.',
  'Bebidas Energéticas':        'Energía instantánea para el gym y el día a día.',
  'Vasodilatadores / Pump':     'Maximizá el pump y el flujo sanguíneo muscular.',
  'Electrolitos':               'Hidratación óptima durante y después del ejercicio.',
  'Proteínas de Carne':         'Proteína bovina de alta biodisponibilidad.',
  'Shakers y Botellas':         'Accesorios premium para preparar tus suplementos.',
  'Accesorios de Gym':          'Cinturones, straps y equipo para entrenar con seguridad.',
  'Magnesio para Agarre':       'Magnesio en polvo y bloques para mejor agarre.',
  'Snacks Proteicos':           'Barras y snacks con alto contenido proteico.',
  'Magnesio':                   'Relajá músculos, mejorá el sueño y reducí el estrés.',
  'Vitaminas Esenciales':       'Cobertura nutricional completa para tu salud diaria.',
  'Adaptógenos y Hormonas':     'Equilibrá tus hormonas y reducí el estrés naturalmente.',
  'Multivitamínicos':           'Vitaminas y minerales esenciales en una sola dosis.',
  'Colágeno y Belleza':         'Cuidá tu piel, articulaciones y bienestar interno.',
  'Omega y Grasas Saludables':  'Corazón sano, cerebro activo y menos inflamación.',
  'Sueño y Relajación':         'Dormí mejor y despertá con energía renovada.',
  'Digestión y Enzimas':        'Mejorá tu digestión y absorción de nutrientes.',
  'Probióticos':                'Fortalecé tu microbiota intestinal y sistema inmune.',
  'Longevidad Celular':         'Antienvejecimiento y salud celular avanzada.',
  'Salud Mental y Cognitiva':   'Enfoque, memoria y rendimiento cerebral.',
  'Control Metabólico':         'Apoyo para la gestión de peso y metabolismo saludable.',
  'Articulaciones':             'Protegé y fortalecé tus articulaciones naturalmente.',
  'Salud Cardiovascular':       'Los mejores suplementos para cuidar tu corazón.',
  'Detox y Salud Hepática':     'Depuración hepática y desintoxicación natural.',
  'Minerales':                  'Minerales esenciales para funciones vitales del cuerpo.',
  'Vitaminas y Suplementos':    'Suplementación completa para tu bienestar.',
  'Aceites Esenciales Individuales': 'Aceites 100% puros y naturales de grado terapéutico.',
  'Mezclas doTERRA':            'Mezclas formuladas por expertos para usos específicos.',
  'Bienestar Interno doTERRA':  'Suplementos naturales para tu salud diaria.',
  'Cuidado Personal':           'Productos naturales para piel y cuerpo.',
  'Kits Especiales':            'Kits completos para empezar tu bienestar con doTERRA.',
  'Difusores':                  'Difusores para aromaterapia y transformar tu ambiente.',
};

const CHOICE_THRESHOLD = 8;

export default function CategoryPage({ sectionData, categoryName, products, onOpenProduct }) {
  const { color } = sectionData;
  const guide      = CAT_GUIDE[categoryName];
  const showHelper = products.length >= CHOICE_THRESHOLD;
  const comparison = COMPARISONS[categoryName] || null;

  const waUrl = buildWaUrl('comparisonConsult', {
    optionA: categoryName,
    optionB: 'otra opción',
  });

  function handleHelperClick() {
    analytics.whatsappClick('category_helper', null, categoryName);
  }

  return (
    <div className="category-page">

      <div className="cat-page-header">
        <div className="cat-page-bar" style={{ background: color }} />
        <div className="cat-page-content">
          <div className="cat-page-label">{sectionData.label}</div>
          <h1 className="cat-page-title">{categoryName}</h1>
          {guide && <p className="cat-page-guide">{guide}</p>}
          <div className="cat-page-count">
            {products.length} producto{products.length !== 1 ? 's' : ''} disponibles
          </div>
        </div>
        <a
          className="cat-page-wa"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Consultar por WhatsApp"
          onClick={handleHelperClick}
        >
          💬
        </a>
      </div>

      {/* Comparison strip — accelerates certainty for categories with key decision tradeoffs */}
      {comparison && (
        <div className="cat-comparison-strip" style={{ '--cat-color': color }}>
          <div className="cat-comparison-question">{comparison.question}</div>
          <div className="cat-comparison-options">
            {comparison.options.map((opt, i) => (
              <div key={i} className="cat-comparison-option">
                <div className="cat-comparison-opt-label">{opt.label}</div>
                <div className="cat-comparison-opt-desc">{opt.desc}</div>
                {opt.tag && <div className="cat-comparison-opt-tag">{opt.tag}</div>}
              </div>
            ))}
          </div>
          <a
            className="cat-comparison-cta"
            href={buildWaUrl('comparisonConsult', { optionA: comparison.options[0]?.label, optionB: comparison.options[1]?.label })}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => analytics.whatsappClick('comparison_strip', null, categoryName)}
          >
            💬 Ayudame a elegir →
          </a>
        </div>
      )}

      {/* Choice-overload helper — appears when category has many products */}
      {showHelper && !comparison && (
        <a
          className="cat-choice-helper"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ '--cat-color': color }}
          onClick={handleHelperClick}
        >
          <span className="cat-choice-helper-text">
            ¿No sabés cuál elegir? <strong>Consultanos por WhatsApp →</strong>
          </span>
          <span className="cat-choice-helper-sub">Te recomendamos el ideal para tu objetivo</span>
        </a>
      )}

      {products.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📦</div>
          <div className="empty-title">Sin productos</div>
          <div className="empty-sub">Consultá disponibilidad por WhatsApp.</div>
        </div>
      ) : (
        <div className="product-grid">
          {products.map(([id, product]) => (
            <ProductCard
              key={id}
              product={product}
              onClick={() => onOpenProduct(id)}
            />
          ))}
        </div>
      )}

    </div>
  );
}
