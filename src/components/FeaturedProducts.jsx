import { useMemo } from 'react';
import { PRODUCTS } from '../data/products';
import { PRODUCT_LABELS } from '../data/labels';
import { getTopClicked } from '../hooks/useClickTracking';
import ProductCard from './ProductCard';

// Build slug → product ID reverse map once at module load
const SLUG_TO_ID = (() => {
  const map = {};
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const slug = p.u?.match(/\/tienda\/([^/?#]+)/)?.[1];
    if (slug) map[slug] = id;
  }
  return map;
})();

// Curated fallback order when no click data exists
const CURATED_PRIORITY = ['recommended', 'popular', 'beginner'];

function buildFeaturedIds() {
  const seen = new Set();
  const result = [];

  function tryAdd(id) {
    if (id && PRODUCTS[id] && !seen.has(id) && result.length < 8) {
      seen.add(id);
      result.push(id);
    }
  }

  // 1. Dynamic: products users have actually clicked (local session data)
  const topClicked = getTopClicked(4);
  for (const { slug } of topClicked) tryAdd(SLUG_TO_ID[slug]);

  // 2. Curated: store-recommended picks fill remaining slots
  for (const priority of CURATED_PRIORITY) {
    for (const [slug, label] of Object.entries(PRODUCT_LABELS)) {
      if (label !== priority) continue;
      tryAdd(SLUG_TO_ID[slug]);
    }
  }

  return result;
}

export default function FeaturedProducts({ onOpenProduct }) {
  const ids = useMemo(() => buildFeaturedIds(), []);
  if (ids.length === 0) return null;

  // If any clicked products surfaced, section title reflects real activity.
  // Otherwise it's a curated recommendation strip.
  const topClickedCount = getTopClicked(1).length;
  const heading  = topClickedCount > 0 ? 'Lo más consultado' : 'Recomendados por MacroForge';
  const eyebrow  = topClickedCount > 0 ? 'Más visitados · Catálogo 2026' : 'Selección destacada · Catálogo 2026';

  return (
    <section className="featured-section">
      <div className="featured-header">
        <div className="featured-eyebrow">{eyebrow}</div>
        <h2 className="featured-title">{heading}</h2>
      </div>
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
