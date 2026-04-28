import { memo } from 'react';
import { CATEGORY_TYPES } from '../data/catalog';

function ProductCard({ product, onClick }) {
  const { n, b, c, s, p } = product;
  const cvClass = `cv cv-${s}`;
  const cardClass = `card c-${s}`;
  const cardType = CATEGORY_TYPES[c] || 'SUPPLEMENT';

  const firstPrice = p[0] || '';
  const priceMatch = firstPrice.match(/(₡\s*[\d\s,.]+)(.*)/);
  const priceVal = priceMatch ? priceMatch[1].trim() : firstPrice;

  return (
    <div className={cardClass} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="c-img">
        <div className={cvClass}>
          <div className="cv-tag">{b}</div>
          <div className="cv-name">{n.toUpperCase()}</div>
          <div className="cv-bar" />
          <div className="cv-type">{cardType}</div>
        </div>
      </div>
      <div className="c-info">
        <div className="c-brand">{b}</div>
        <div className="c-name">{n}</div>
        <div className="c-price">
          {priceVal}
          {p.length > 1 && <span className="c-multi">+{p.length - 1}</span>}
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
