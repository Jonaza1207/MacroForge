import CategoryBlock from './CategoryBlock';

export default function CatalogSection({ sectionId, sectionData, productsByCategory, onOpenProduct }) {
  const { label, sublabel, color, categories } = sectionData;

  const total = categories.reduce((sum, cat) => sum + (productsByCategory[cat]?.length || 0), 0);
  if (total === 0) return null;

  return (
    <section className="section" id={`sec-${sectionId}`}>
      <div className="section-header">
        <div className="section-dot" style={{ background: color }} />
        <div className="section-meta">
          <div className="section-sublabel">{sublabel}</div>
          <div className="section-title" style={{ color }}>{label}</div>
          <div className="section-count">{total} producto{total !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {categories.map(cat => (
        <CategoryBlock
          key={cat}
          categoryName={cat}
          products={productsByCategory[cat] || []}
          onOpenProduct={onOpenProduct}
        />
      ))}
    </section>
  );
}
