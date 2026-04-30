import { memo } from 'react';
import { resolveProductImage } from '../data/images';

function ProductCard({ product, badge, onClick }) {
  const { n, b, p, u } = product;
  const imageUrl = resolveProductImage(u);

  const firstPrice = p[0] || '';
  const priceMatch = firstPrice.match(/(₡\s*[\d\s,.]+)(.*)/);
  const priceVal = priceMatch ? priceMatch[1].trim() : firstPrice;

  return (
    <div
      className="card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="card-img">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`${n} | ${b}`}
            loading="lazy"
            decoding="async"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="card-fallback">
          <div className="card-fallback-brand">{b}</div>
          <div className="card-fallback-name">{n.toUpperCase()}</div>
          <div className="card-fallback-bar" />
        </div>
        {badge && (
          <div className={`card-badge ${badge.cls}`}>{badge.label}</div>
        )}
      </div>

      <div className="card-body">
        <div className="card-brand">{b}</div>
        <div className="card-name">{n}</div>
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
