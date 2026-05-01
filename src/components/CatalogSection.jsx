import CategoryBlock from './CategoryBlock';

const CAT_SHORT = {
  'Creatinas':'Creatinas','Shakers y Botellas':'Shakers','Proteínas Whey':'Whey',
  'Pre-Entrenamientos':'Pre-Workout','Proteínas Isoladas':'Isolada',
  'Accesorios de Gym':'Accesorios','Gainers de Masa':'Gainers',
  'Quemadores de Grasa':'Fat Burner','Bebidas Energéticas':'Energy',
  'Vasodilatadores / Pump':'Pump','Glutamina':'Glutamina',
  'Aminoácidos Esenciales':'Aminos','Precursores Hormonales':'Testosterona',
  'Proteínas Veganas':'Veganas','BCAA':'BCAA','Snacks Proteicos':'Snacks',
  'Magnesio para Agarre':'Magnesio Gym','Proteínas de Carne':'Carne',
  'Electrolitos':'Electrolitos','Magnesio':'Magnesio','Vitaminas Esenciales':'Vitaminas',
  'Adaptógenos y Hormonas':'Adaptógenos','Multivitamínicos':'Multis',
  'Detox y Salud Hepática':'Detox','Colágeno y Belleza':'Colágeno',
  'Omega y Grasas Saludables':'Omega','Minerales':'Minerales',
  'Longevidad Celular':'Longevidad','Suplementos Especializados':'Especial',
  'Salud Mental y Cognitiva':'Mental','Control Metabólico':'Metabólico',
  'Sueño y Relajación':'Sueño','Digestión y Enzimas':'Digestión',
  'Vitaminas y Suplementos':'Vitaminas+','Articulaciones':'Articulaciones',
  'Salud Cardiovascular':'Cardio','Probióticos':'Probióticos',
  'Salud Digestiva':'Digestiva','Aceites Esenciales Individuales':'Aceites',
  'Mezclas doTERRA':'Mezclas','Bienestar Interno doTERRA':'Bienestar',
  'Cuidado Personal':'Personal','Kits Especiales':'Kits',
  'Cuidado del Cabello':'Cabello','Cuidado de la Piel':'Piel',
  'Almacenamiento y Botellas':'Botellas','Aromaterapia Emocional':'Emocional',
  'Difusores':'Difusores','Protección Solar doTERRA':'Solar',
  'Kits de AutoEnvío':'AutoEnvío',
};

function catId(sectionId, name) {
  return `cat-${sectionId}-${name.replace(/[\s/]+/g, '-').toLowerCase()}`;
}

export default function CatalogSection({ sectionId, sectionData, productsByCategory, onOpenProduct }) {
  const { label, sublabel, color, categories } = sectionData;

  const total = categories.reduce((sum, cat) => sum + (productsByCategory[cat]?.length || 0), 0);
  if (total === 0) return null;

  const populated = categories.filter(cat => (productsByCategory[cat]?.length || 0) > 0);

  return (
    <section className="section" id={`sec-${sectionId}`}>
      <div className="section-header">
        <div className="section-accent-bar" style={{ background: color }} />
        <div className="section-meta">
          <div className="section-sublabel">{sublabel}</div>
          <div className="section-title" style={{ color }}>{label}</div>
          <div className="section-count">{total} producto{total !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Category quick-jump chips */}
      {populated.length > 2 && (
        <div className="cat-chips" style={{ '--section-color': color }}>
          {populated.map(cat => (
            <a
              key={cat}
              href={`#${catId(sectionId, cat)}`}
              className="cat-chip"
            >
              {CAT_SHORT[cat] || cat}
            </a>
          ))}
        </div>
      )}

      {categories.map(cat => (
        <CategoryBlock
          key={cat}
          sectionId={sectionId}
          categoryName={cat}
          products={productsByCategory[cat] || []}
          onOpenProduct={onOpenProduct}
        />
      ))}
    </section>
  );
}
