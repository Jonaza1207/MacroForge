import { memo } from 'react';
import ProductCard from './ProductCard';

function CategoryBlock({ categoryName, products, onOpenProduct }) {
  if (!products.length) return null;

  return (
    <div className="cat">
      <div className="cat-header">
        <h3 className="cat-name">{categoryName}</h3>
        <span className="cat-count-label">
          {products.length} producto{products.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="product-grid">
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
