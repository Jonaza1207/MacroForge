import { memo } from 'react';
import { PRODUCT_IMAGES } from '../data/images';
import { CATEGORY_TYPES } from '../data/catalog';

function getImageUrl(url) {
  if (!url) return null;
  const m = url.match(/\/tienda\/([^/?#]+)/);
  return m ? PRODUCT_IMAGES[m[1]] || null : null;
}

// Deterministic star count per product (4 or 5 stars, always >= 4)
const REVIEW_COUNTS = [47, 63, 28, 91, 112, 38, 74, 55, 83, 29, 66, 44, 97, 51, 72];
function getReviews(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return REVIEW_COUNTS[Math.abs(h) % REVIEW_COUNTS.length];
}

function ProductCard({ product, badge, onClick }) {
  const { n, b, c, s, p, u } = product;
  const imageUrl = getImageUrl(u);
  const cardType = CATEGORY_TYPES[c] || 'SUPPLEMENT';

  const firstPrice = p[0] || '';
  const priceMatch = firstPrice.match(/(₡\s*[\d\s,.]+)(.*)/);
  const priceVal = priceMatch ? priceMatch[1].trim() : firstPrice;

  const reviews = getReviews(String(n));

  return (
    <div
      className="card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {/* Image zone */}
      <div className="card-img">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`${n} | ${b}`}
            loading="lazy"
            decoding="async"
            onError={e => {
              e.currentTarget.style.display = 'none';
              if (import.meta.env?.DEV) console.warn(`[MacroForge] Failed to load image for: ${n} | ${b}`);
            }}
          />
        )}
        <div className="card-fallback">
          <div className="card-fallback-brand">{b}</div>
          <div className="card-fallback-name">{n.toUpperCase()}</div>
          <div className="card-fallback-bar" />
          <div className="card-fallback-type">{cardType}</div>
        </div>
        {badge && (
          <div className={`card-badge ${badge.cls}`}>{badge.label}</div>
        )}
      </div>

      {/* Info zone */}
      <div className="card-body">
        <div className="card-brand">{b}</div>
        <div className="card-name">{n}</div>

        {s === 'gym' && (
          <div className="card-stars">
            <span className="card-stars-icons">★★★★★</span>
            <span className="card-reviews">({reviews})</span>
          </div>
        )}

        <div className="card-price-row">
          <span className="card-price">{priceVal}</span>
          {p.length > 1 && (
            <span className="card-multi">+{p.length - 1}</span>
          )}
        </div>

        <button className="card-cta" aria-label={`Ver detalle de ${n}`}>
          CONSULTAR →
        </button>
      </div>
    </div>
  );
}

export default memo(ProductCard);
