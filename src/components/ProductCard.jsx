import { memo } from 'react';
import { PRODUCT_IMAGES } from '../data/images';
import { CATEGORY_TYPES, SECTION_BG } from '../data/catalog';

function getImageUrl(productUrl) {
  if (!productUrl) return null;
  const m = productUrl.match(/\/tienda\/([^/?#]+)/);
  return m ? PRODUCT_IMAGES[m[1]] || null : null;
}

function ProductCard({ product, onClick }) {
  const { n, b, c, s, p, u } = product;
  const imageUrl = getImageUrl(u);
  const cvClass = `cv cv-${s}`;
  const cardClass = `card c-${s}`;
  const cardType = CATEGORY_TYPES[c] || 'SUPPLEMENT';

  // Parse first price: extract ₡ amount + extra text
  const firstPrice = p[0] || '';
  const priceMatch = firstPrice.match(/(₡\s*[\d\s,.]+)(.*)/);
  const priceVal = priceMatch ? priceMatch[1].trim() : firstPrice;
  const priceExtra = priceMatch ? priceMatch[2].trim() : '';

  return (
    <div className={cardClass} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="c-img">
        {imageUrl && (
          <img
            className="real-img"
            src={imageUrl}
            alt={`${n} | ${b}`}
            loading="lazy"
            decoding="async"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className={cvClass} style={{ background: SECTION_BG[s] }}>
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
          {priceExtra && !p.length > 1 && (
            <span className="c-multi">{priceExtra}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
