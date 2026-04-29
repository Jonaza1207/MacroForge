import { memo } from 'react';
import ProductCard from './ProductCard';

const BADGE_MAP = {
  'Pre-Entrenamientos':     { label: '🔥 HOT',         cls: 'badge-hot' },
  'Creatinas':              { label: '★ BEST SELLER',   cls: 'badge-bestseller' },
  'Proteínas Whey':         { label: '★ BEST SELLER',   cls: 'badge-bestseller' },
  'Quemadores de Grasa':    { label: '🔥 HOT',         cls: 'badge-hot' },
  'Proteínas Isoladas':     { label: '◆ PREMIUM',       cls: 'badge-limited' },
  'Gainers de Masa':        { label: '💪 POPULAR',      cls: 'badge-hot' },
  'BCAA':                   { label: '★ TOP SELLER',    cls: 'badge-bestseller' },
  'Bebidas Energéticas':    { label: '⚡ ENERGY',       cls: 'badge-new' },
  'Vasodilatadores / Pump': { label: '💥 PUMP',         cls: 'badge-hot' },
  'Precursores Hormonales': { label: '◆ ADVANCED',      cls: 'badge-limited' },
  'Aminoácidos Esenciales': { label: '★ TOP SELLER',    cls: 'badge-bestseller' },
  'Glutamina':              { label: '★ BEST SELLER',   cls: 'badge-bestseller' },
};

function CategoryBlock({ categoryName, products, onOpenProduct }) {
  if (!products.length) return null;
  const badge = BADGE_MAP[categoryName] || null;

  return (
    <div className="cat">
      <div className="cat-header">
        <h3 className="cat-name">{categoryName}</h3>
        <span className="cat-count-label">{products.length} producto{products.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="product-grid">
        {products.map(([id, product]) => (
          <ProductCard
            key={id}
            product={product}
            badge={badge}
            onClick={() => onOpenProduct(id)}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(CategoryBlock);
