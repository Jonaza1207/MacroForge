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
import { analytics } from '../lib/analytics';
import {
  getRecentlyViewedIds,
  RECENTLY_VIEWED_EVENT,
} from '../hooks/useRecentlyViewed';
import ProductCard from './ProductCard';

const SHOW_MIN = 2;
const SHOW_MAX = 4;

export default function RecentlyViewed({ onOpenProduct }) {
  const [ids, setIds] = useState(() =>
    getRecentlyViewedIds(SHOW_MAX).filter(id => PRODUCTS[id])
  );

  useEffect(() => {
    function refresh() {
      setIds(getRecentlyViewedIds(SHOW_MAX).filter(id => PRODUCTS[id]));
    }
    window.addEventListener(RECENTLY_VIEWED_EVENT, refresh);
    return () => window.removeEventListener(RECENTLY_VIEWED_EVENT, refresh);
  }, []);

  if (ids.length < SHOW_MIN) return null;

  function handleOpen(id) {
    const p = PRODUCTS[id];
    if (p) analytics.recentlyViewedClick(id, p.n);
    onOpenProduct(id);
  }

  return (
    <section className="recently-viewed">
      <div className="recently-viewed-eyebrow">Retomá donde lo dejaste</div>
      <div className="product-grid">
        {ids.map(id => (
          <ProductCard
            key={id}
            product={PRODUCTS[id]}
            onClick={() => handleOpen(id)}
          />
        ))}
      </div>
    </section>
  );
}
