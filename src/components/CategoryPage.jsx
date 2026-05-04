import { WA_NUMBER } from '../data/catalog';
import ProductCard from './ProductCard';

export default function CategoryPage({ sectionData, categoryName, products, onOpenProduct }) {
  const { color } = sectionData;
  const waMsg = `Hola MacroForge! 💪 Estoy buscando productos de: ${categoryName}. ¿Qué tienen disponible?`;
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;

  return (
    <div className="category-page">

      <div className="cat-page-header">
        <div className="cat-page-bar" style={{ background: color }} />
        <div className="cat-page-content">
          <div className="cat-page-label">{sectionData.label}</div>
          <h1 className="cat-page-title">{categoryName}</h1>
          <div className="cat-page-count">
            {products.length} producto{products.length !== 1 ? 's' : ''}
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
