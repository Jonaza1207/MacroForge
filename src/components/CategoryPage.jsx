import { WA_NUMBER } from '../data/catalog';
import ProductCard from './ProductCard';

// Category guidance — reduces decision paralysis, improves conversion
const CAT_GUIDE = {
  'Creatinas':                  'Elegí la mejor creatina para fuerza, volumen y rendimiento.',
  'Proteínas Whey':             'Proteínas de suero ideales para ganar masa muscular.',
  'Pre-Entrenamientos':         'Energía y enfoque para entrenar al máximo nivel.',
  'Proteínas Isoladas':         'Proteína de máxima pureza para resultados serios.',
  'Gainers de Masa':            'Ganadores de peso y masa con alta densidad calórica.',
  'BCAA':                       'Aminoácidos esenciales para recuperación y resistencia.',
  'Glutamina':                   'Recuperación muscular y refuerzo del sistema inmune.',
  'Quemadores de Grasa':        'Acelera tu metabolismo y quema grasa más rápido.',
  'Aminoácidos Esenciales':     'EAA completos para rendimiento y recuperación óptimos.',
  'Precursores Hormonales':     'Aumenta testosterona y rendimiento de forma natural.',
  'Proteínas Veganas':          'Nutrición de alto valor sin ingredientes animales.',
  'Bebidas Energéticas':        'Energía instantánea para el gym y el día a día.',
  'Vasodilatadores / Pump':     'Maximizá el pump y el flujo sanguíneo muscular.',
  'Electrolitos':                'Hidratación óptima durante y después del ejercicio.',
  'Proteínas de Carne':         'Proteína bovina de alta biodisponibilidad.',
  'Shakers y Botellas':         'Accesorios premium para preparar tus suplementos.',
  'Accesorios de Gym':          'Cinturones, straps y equipo para entrenar con seguridad.',
  'Magnesio para Agarre':       'Magnesio en polvo y bloques para mejor agarre.',
  'Snacks Proteicos':           'Barras y snacks con alto contenido proteico.',
  // Vita
  'Magnesio':                   'Relajá músculos, mejorá el sueño y reducí el estrés.',
  'Vitaminas Esenciales':       'Cobertura nutricional completa para tu salud diaria.',
  'Adaptógenos y Hormonas':     'Equilibrá tus hormonas y reducí el estrés naturalmente.',
  'Multivitamínicos':           'Vitaminas y minerales esenciales en una sola dosis.',
  'Colágeno y Belleza':         'Cuidá tu piel, articulaciones y bienestar interno.',
  'Omega y Grasas Saludables':  'Corazón sano, cerebro activo y menos inflamación.',
  'Sueño y Relajación':         'Dormí mejor y despertá con energía renovada.',
  'Digestión y Enzimas':        'Mejorá tu digestión y absorción de nutrientes.',
  'Probióticos':                 'Fortalecé tu microbiota intestinal y sistema inmune.',
  'Longevidad Celular':         'Antienvejecimiento y salud celular avanzada.',
  'Salud Mental y Cognitiva':   'Enfoque, memoria y rendimiento cerebral.',
  'Control Metabólico':         'Apoyo para la gestión de peso y metabolismo saludable.',
  'Articulaciones':              'Protegé y fortalecé tus articulaciones naturalmente.',
  'Salud Cardiovascular':       'Los mejores suplementos para cuidar tu corazón.',
  'Detox y Salud Hepática':     'Depuración hepática y desintoxicación natural.',
  'Minerales':                   'Minerales esenciales para funciones vitales del cuerpo.',
  'Vitaminas y Suplementos':    'Suplementación completa para tu bienestar.',
  // doTERRA
  'Aceites Esenciales Individuales': 'Aceites 100% puros y naturales de grado terapéutico.',
  'Mezclas doTERRA':            'Mezclas formuladas por expertos para usos específicos.',
  'Bienestar Interno doTERRA':  'Suplementos naturales para tu salud diaria.',
  'Cuidado Personal':           'Productos naturales para piel y cuerpo.',
  'Kits Especiales':            'Kits completos para empezar tu bienestar con doTERRA.',
  'Difusores':                   'Difusores para aromaterapia y transformar tu ambiente.',
};

export default function CategoryPage({ sectionData, categoryName, products, onOpenProduct }) {
  const { color } = sectionData;
  const waMsg = `Hola MacroForge! 💪 Estoy buscando: ${categoryName}. ¿Qué tienen disponible?`;
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;
  const guide = CAT_GUIDE[categoryName];

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
        >
          💬
        </a>
      </div>

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
