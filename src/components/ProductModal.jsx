import { useEffect, useState, useMemo } from 'react';
import { PRODUCTS } from '../data/products';
import { PRODUCT_LABELS } from '../data/labels';
import { HEALTH } from '../data/health';
import { resolveProductImage } from '../data/images';
import { CATEGORY_TYPES, WA_NUMBER } from '../data/catalog';
import { trackCta } from '../hooks/useClickTracking';
import { useFavorites } from '../hooks/useFavorites';
import { analytics } from '../lib/analytics';
import ProductSchema from './ProductSchema';

const SECTION_LABELS = { gym: 'GYM', vita: 'VITAMINAS', dote: 'DOTERRA' };
const SECTION_COLORS = { gym: '#E3001E', vita: '#00C896', dote: '#D4A843' };

function parsePrices(prices) {
  return prices.map((pr, i) => {
    const m = pr.match(/(₡\s*[\d\s,.]+)/);
    const val = m ? m[0].trim() : pr;
    const rest = m ? pr.replace(m[0], '').trim() : '';
    return { val, rest: rest || `Presentación ${i + 1}` };
  });
}

// Share icon SVG
const IconShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

// Check icon SVG
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// Heart icon SVGs
const IconHeartOutline = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const IconHeartFilled = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

// Ranked labels for related product sort
const LABEL_RANK = { recommended: 0, popular: 1, beginner: 2 };

export default function ProductModal({ productId, onClose, onOpen }) {
  const [copied, setCopied] = useState(false);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const p = PRODUCTS[String(productId)];
  const h = p ? (HEALTH[p.c] || {}) : {};

  // Lock body scroll + Escape to close
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  if (!p) return null;

  const favorited    = isFavorite(productId);
  const sectionColor = SECTION_COLORS[p.s];
  const cardType     = CATEGORY_TYPES[p.c] || 'SUPPLEMENT';
  const imgUrl       = resolveProductImage(p.u);
  const slug         = p.u?.match(/\/tienda\/([^/?#]+)/)?.[1] || null;

  const waMsg = `Hola MacroForge! 💪 Quiero comprar ${p.n}. ¿Tienen disponible y cuánto cuesta el envío a mi zona?`;
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;

  const flavors = (p.f || [])
    .flatMap(f => f.split(',').map(s => s.trim()).filter(Boolean))
    .slice(0, 40);

  const prices = parsePrices(p.p);

  // ── Share system: Web Share API → clipboard fallback ─────────
  const shareUrl  = `${window.location.origin}${window.location.pathname}#product/${slug}`;
  const shareTitle = `${p.n} — MacroForge`;
  const shareText  = `Mirá este suplemento en MacroForge: ${p.n} de ${p.b}`;

  function handleShare() {
    if (!slug) return;
    if (navigator.share) {
      navigator.share({ title: shareTitle, text: shareText, url: shareUrl })
        .then(() => analytics.share(productId, p.n, 'native'))
        .catch(() => {}); // user cancelled — silent
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
          analytics.share(productId, p.n, 'clipboard');
        })
        .catch(() => {});
    }
  }

  // ── Related products — same category, curated priority ───────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const related = useMemo(() => {
    return Object.entries(PRODUCTS)
      .filter(([id, r]) => String(id) !== String(productId) && r.c === p.c && r.p?.length > 0)
      .sort(([, a], [, b]) => {
        const sa = a.u?.match(/\/tienda\/([^/?#]+)/)?.[1] || '';
        const sb = b.u?.match(/\/tienda\/([^/?#]+)/)?.[1] || '';
        const ra = LABEL_RANK[PRODUCT_LABELS[sa]] ?? 9;
        const rb = LABEL_RANK[PRODUCT_LABELS[sb]] ?? 9;
        return ra - rb;
      })
      .slice(0, 3);
  }, [productId, p.c]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <ProductSchema product={p} />
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        {/* Image */}
        <div className="modal-img">
          {imgUrl && (
            <img
              src={imgUrl}
              alt={`${p.n} | ${p.b}`}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={e => {
                e.currentTarget.style.display = 'none';
                if (import.meta.env?.DEV) console.warn(`[MacroForge] Modal image failed: ${p.n}`);
              }}
            />
          )}
          {!imgUrl && (
            <div className="card-fallback">
              <div className="card-fallback-brand">{p.b}</div>
              <div className="card-fallback-name" style={{ fontSize: 28 }}>{p.n.toUpperCase()}</div>
              <div className="card-fallback-bar" />
              <div className="card-fallback-type">{cardType}</div>
            </div>
          )}
        </div>

        {/* Section tag */}
        <div className="modal-tag" style={{ color: sectionColor }}>
          {SECTION_LABELS[p.s]}
        </div>

        {/* Header actions: share + favorite + close */}
        <div className="modal-header-actions">
          {slug && (
            <button
              className={`modal-share ${copied ? 'modal-share--copied' : ''}`}
              onClick={handleShare}
              aria-label={copied ? 'Enlace copiado' : 'Compartir producto'}
              title={copied ? 'Enlace copiado' : 'Compartir'}
            >
              {copied ? <IconCheck /> : <IconShare />}
            </button>
          )}
          <button
            className={`modal-favorite ${favorited ? 'modal-favorite--active' : ''}`}
            onClick={() => {
              toggleFavorite(productId);
              analytics.favorite(productId, p.n, !favorited ? 'add' : 'remove');
            }}
            aria-label={favorited ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            title={favorited ? 'Quitar de favoritos' : 'Guardar'}
          >
            {favorited ? <IconHeartFilled /> : <IconHeartOutline />}
          </button>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* 1. Identity */}
          <div className="modal-brand">{p.b}</div>
          <div className="modal-name">{p.n}</div>
          <div className="modal-cat">{p.c}</div>

          {/* 2. Primary price — anchors value BEFORE CTA */}
          <div className="modal-primary-price">
            <span className="modal-primary-price-val">{prices[0].val}</span>
            <span className="price-iva">+iva</span>
            {prices.length > 1 && (
              <span className="modal-primary-price-note">
                +{prices.length - 1} {prices.length === 2 ? 'opción' : 'opciones'}
              </span>
            )}
          </div>

          {/* 3. Trust signals — calm, factual, no pressure */}
          <div className="modal-trust-row">
            <span className="modal-trust-item">✓ Original garantizado</span>
            <span className="modal-trust-item">🚀 Entrega en CR</span>
            <span className="modal-trust-item">💬 Consulta gratis</span>
          </div>

          {/* 4. Primary CTA — full width, immediately after price anchor */}
          <a
            className="modal-wa"
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackCta(slug);
              analytics.whatsappClick('modal', productId, p.n);
            }}
          >
            💬 Quiero este producto
          </a>

          {/* 5. Product information — secondary, for the committed reader */}
          {h.d && (
            <div className="modal-section">
              <h4>¿Qué es y para qué sirve?</h4>
              <p>{h.d}</p>
            </div>
          )}

          {h.b?.length > 0 && (
            <div className="modal-section">
              <h4>Beneficios clave</h4>
              <ul>{h.b.map((ben, i) => <li key={i}>{ben}</li>)}</ul>
            </div>
          )}

          {flavors.length > 0 && (
            <div className="modal-section">
              <h4>Variantes disponibles</h4>
              <div className="flavor-list">
                {flavors.map((f, i) => <span key={i} className="flavor-tag">{f}</span>)}
              </div>
            </div>
          )}

          {h.u && (
            <div className="modal-section">
              <h4>Cómo usar</h4>
              <p>{h.u}</p>
            </div>
          )}

          {/* 6. Full price breakdown */}
          <div className="modal-section">
            <h4>{prices.length > 1 ? 'Opciones de compra' : 'Precio'}</h4>
            <div className="modal-prices">
              {prices.map((pr, i) => (
                <div key={i} className="modal-price-row">
                  <span className="modal-price-opt">{pr.rest}</span>
                  <span className="modal-price-right">
                    <span className="modal-price-val">{pr.val}</span>
                    <span className="price-iva">+iva</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {h.w && (
            <div className="modal-section">
              <h4>Aviso importante</h4>
              <div className="modal-warn">{h.w}</div>
            </div>
          )}

          {/* 7. Related products — AOV engine */}
          {related.length > 0 && onOpen && (
            <div className="modal-section modal-related-section">
              <h4>También te puede interesar</h4>
              <div className="modal-related-grid">
                {related.map(([rid, r]) => {
                  const rImg  = resolveProductImage(r.u);
                  const rPrice = r.p[0]?.match(/(₡\s*[\d\s,.]+)/)?.[0]?.trim() || '';
                  return (
                    <button
                      key={rid}
                      className="modal-related-card"
                      onClick={() => {
                        analytics.relatedClick(productId, rid, r.n);
                        onOpen(rid);
                      }}
                      aria-label={`Ver ${r.n}`}
                    >
                      <div className="modal-related-img">
                        {rImg
                          ? <img src={rImg} alt={r.n} loading="lazy" decoding="async"
                              onError={e => { e.currentTarget.style.display = 'none'; }} />
                          : <div className="modal-related-fallback">{r.b.charAt(0)}</div>
                        }
                      </div>
                      <div className="modal-related-body">
                        <div className="modal-related-brand">{r.b}</div>
                        <div className="modal-related-name">{r.n}</div>
                        {rPrice && <div className="modal-related-price">{rPrice}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
    </>
  );
}
