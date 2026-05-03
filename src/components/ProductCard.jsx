import { memo, useState } from 'react';
import { resolveProductImage } from '../data/images';

function ProductCard({ product, badge, onClick }) {
  const [imgError, setImgError] = useState(false);
  const { n, b, p, u, f } = product;

  const imageUrl = resolveProductImage(u);
  const showImage   = Boolean(imageUrl) && !imgError;
  const showFallback = !showImage;

  const firstPrice = p[0] || '';
  const priceMatch = firstPrice.match(/(₡\s*[\d\s,.]+)(.*)/);
  const priceVal   = priceMatch ? priceMatch[1].trim() : firstPrice;

  const hasFlavors = Array.isArray(f) && f.some(fl => fl && fl.trim());

  return (
    <div
      className="card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="card-img">

        {/* Only one of these renders at a time — no overlap possible */}
        {showImage && (
          <img
            src={imageUrl}
            alt={`${n} | ${b}`}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        )}

        {showFallback && (
          <div className="card-fallback">
            <div className="card-fallback-brand">{b}</div>
            <div className="card-fallback-name">{n}</div>
            <div className="card-fallback-bar" />
          </div>
        )}

        {badge && <div className={`card-badge ${badge.cls}`}>{badge.label}</div>}
      </div>

      <div className="card-body">
        <div className="card-brand">{b}</div>
        <div className="card-name">{n}</div>

        {hasFlavors && (
          <div className="card-flavors">
            <span className="card-flavor-dot" />
            <span className="card-flavor-text">Sabores disponibles</span>
          </div>
        )}

        <div className="card-price-row">
          <span className="card-price">{priceVal}</span>
          {p.length > 1 && (
            <span className="card-multi">+{p.length - 1} opciones</span>
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
