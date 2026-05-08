/**
 * RecentlyViewed — "Retomá donde lo dejaste"
 *
 * Shows the last 4 products a returning visitor viewed.
 * Renders nothing for new visitors (no data) or single-product sessions.
 *
 * Placement: top of CatalogHome, ABOVE FeaturedProducts.
 * Psychology: the most personally relevant content appears first.
 * A returning visitor sees exactly what they were browsing before —
 * recognition triggers familiarity, familiarity builds trust, trust converts.
 */
import { useState, useEffect } from 'react';
import { PRODUCTS } from '../data/products';
import {
  getRecentlyViewedIds,
  RECENTLY_VIEWED_EVENT,
} from '../hooks/useRecentlyViewed';
import ProductCard from './ProductCard';

const SHOW_MIN  = 2; // don't render for fewer than 2 items
const SHOW_MAX  = 4;

export default function RecentlyViewed({ onOpenProduct }) {
  const [ids, setIds] = useState(() =>
    getRecentlyViewedIds(SHOW_MAX).filter(id => PRODUCTS[id])
  );

  // Re-read when a new product is viewed (modal opens and dispatches event)
  useEffect(() => {
    function refresh() {
      setIds(getRecentlyViewedIds(SHOW_MAX).filter(id => PRODUCTS[id]));
    }
    window.addEventListener(RECENTLY_VIEWED_EVENT, refresh);
    return () => window.removeEventListener(RECENTLY_VIEWED_EVENT, refresh);
  }, []);

  if (ids.length < SHOW_MIN) return null;

  return (
    <section className="recently-viewed">
      <div className="recently-viewed-eyebrow">Retomá donde lo dejaste</div>
      <div className="product-grid">
        {ids.map(id => (
          <ProductCard
            key={id}
            product={PRODUCTS[id]}
            onClick={() => onOpenProduct(id)}
          />
        ))}
      </div>
    </section>
  );
}
