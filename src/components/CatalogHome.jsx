import { PRODUCTS } from '../data/products';

const SECTION_META = {
  gym: {
    icon: '💪',
    tagline: 'Performance',
    desc: 'Proteínas, creatinas, pre-entrenos y todo para tu entrenamiento.',
  },
  vita: {
    icon: '🌿',
    tagline: 'Salud',
    desc: 'Vitaminas, minerales, magnesio y suplementos para tu bienestar.',
  },
  dote: {
    icon: '🌸',
    tagline: 'Bienestar',
    desc: 'Aceites esenciales y productos naturales doTERRA originales.',
  },
};

export default function CatalogHome({ sections, sectionCounts, onSelectSection }) {
  return (
    <div className="catalog-home">

      <div className="catalog-home-intro">
        <div className="catalog-home-eyebrow">Compra por categoría</div>
        <h2 className="catalog-home-title">¿Qué estás buscando?</h2>
        <p className="catalog-home-sub">
          Encontrá rápido lo que ocupás — más de {Object.keys(PRODUCTS).length} productos originales.
        </p>
      </div>

      <div className="section-cards">
        {Object.entries(sections).map(([id, section]) => {
          const meta    = SECTION_META[id] || {};
          const count   = sectionCounts[id] || 0;
          return (
            <button
              key={id}
              className="section-card"
              style={{ '--sc': section.color }}
              onClick={() => onSelectSection(id)}
              aria-label={`Explorar ${section.label}`}
            >
              <div className="section-card-top">
                <span className="section-card-icon">{meta.icon}</span>
                <span className="section-card-tag" style={{ color: section.color }}>
                  {meta.tagline}
                </span>
              </div>
              <div className="section-card-label">{section.label}</div>
              <div className="section-card-desc">{meta.desc}</div>
              <div className="section-card-footer">
                <span className="section-card-count">{count} productos</span>
                <span className="section-card-cta" style={{ color: section.color }}>
                  Explorar →
                </span>
              </div>
              <div
                className="section-card-accent"
                style={{ background: section.color }}
              />
            </button>
          );
        })}
      </div>

    </div>
  );
}
