import CategoryBlock from './CategoryBlock';

export default function CatalogSection({ sectionId, sectionData, productsByCategory, onOpenProduct }) {
  const { label, sublabel, color, categories } = sectionData;

  // Count visible products in this section
  const total = categories.reduce((sum, cat) => sum + (productsByCategory[cat]?.length || 0), 0);

  if (total === 0) return null;

  return (
    <section className="section" id={`sec-${sectionId}`}>
      <div className="sec-header">
        <div className="sec-dot" style={{ background: color }} />
        <div className="sec-meta">
          <div className="sec-label">{sublabel}</div>
          <div className="sec-title" style={{ color }}>{label}</div>
          <div className="sec-count">{total} producto{total !== 1 ? 's' : ''}</div>
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
