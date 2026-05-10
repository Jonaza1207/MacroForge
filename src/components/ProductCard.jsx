import { memo, useState, useMemo } from 'react';
import { resolveProductImage } from '../data/images';
import { PRODUCT_LABELS, CLICK_THRESHOLD_POPULAR } from '../data/labels';
import { isDynamicPopular, trackView, trackCta } from '../hooks/useClickTracking';
import { analytics } from '../lib/analytics';
import { buildWaUrl } from '../lib/whatsapp';

function slugFrom(url) {
  return url?.match(/\/tienda\/([^/?#]+)/)?.[1] || null;
}

function computeBadge(slug) {
  if (!slug) return null;
  if (isDynamicPopular(slug, CLICK_THRESHOLD_POPULAR)) {
    return { label: 'Popular', cls: 'badge-hot' };
  }
  const label = PRODUCT_LABELS[slug];
  if (label === 'recommended') return { label: 'Recomendado',  cls: 'badge-new'       };
  if (label === 'popular')     return { label: 'Popular',      cls: 'badge-bestseller' };
  if (label === 'beginner')    return { label: 'Para empezar', cls: 'badge-limited'    };
  return null;
}

function ProductCard({ product, badge: badgeProp, onClick }) {
  const [imgError, setImgError] = useState(false);
  const { n, b, p, u, f } = product;

  const imageUrl     = resolveProductImage(u);
  const showImage    = Boolean(imageUrl) && !imgError;
  const showFallback = !showImage;

  const firstPrice = p[0] || '';
  const priceMatch = firstPrice.match(/(₡\s*[\d\s,.]+)(.*)/);
  const priceVal   = priceMatch ? priceMatch[1].trim() : firstPrice;
  const hasFlavors = Array.isArray(f) && f.some(fl => fl && fl.trim());

  const slug  = useMemo(() => slugFrom(u), [u]);
  const badge = badgeProp ?? useMemo(() => computeBadge(slug), [slug]); // eslint-disable-line

  // Consultative CTA copy — not a purchase pressure signal
  const waUrl = buildWaUrl('product', { name: n, brand: b });

  function handleCardClick() {
    trackView(slug);
    onClick();
  }

  function handleCtaClick(e) {
    e.stopPropagation();
    trackCta(slug);
    analytics.whatsappClick('card', slug || '', n);
  }

  return (
    <div
      className="card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleCardClick()}
    >
      <div className="card-img">
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

        <div className="card-trust">
          <span className="trust-pill">✓ Original</span>
          <span className="trust-pill">🚀 Entrega CR</span>
        </div>

        {hasFlavors && (
          <div className="card-flavors">
            <span className="card-flavor-dot" />
            <span className="card-flavor-text">Sabores disponibles</span>
          </div>
        )}

        <div className="card-price-row">
          <span className="card-price">{priceVal}</span>
          <span className="price-iva">+iva</span>
          {p.length > 1 && (
            <span className="card-multi">+{p.length - 1} opciones</span>
          )}
        </div>

        <a
          className="card-cta"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleCtaClick}
          aria-label={`Consultar ${n} por WhatsApp`}
        >
          💬 Consultar
        </a>
      </div>
    </div>
  );
}

export default memo(ProductCard);
