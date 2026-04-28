import { memo } from 'react';
import ProductCard from './ProductCard';
import { HEALTH } from '../data/health';

function CategoryBlock({ categoryName, products, onOpenProduct }) {
  if (!products.length) return null;
  const h = HEALTH[categoryName] || {};
  return (
    <div className="cat-block">
      <div className="cat-header">
        <h3 className="cat-title">{categoryName}</h3>
        <span className="cat-count">{products.length} producto{products.length !== 1 ? 's' : ''}</span>
      </div>
      {h.d && <p className="cat-desc">{h.d}</p>}
      <div className="grid">
        {products.map(([id, product]) => (
          <ProductCard
            key={id}
            product={product}
            onClick={() => onOpenProduct(id)}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(CategoryBlock);
