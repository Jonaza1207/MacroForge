import { useEffect } from 'react';
import { PRODUCTS } from '../data/products';
import { HEALTH } from '../data/health';
import { PRODUCT_IMAGES } from '../data/images';
import { CATEGORY_TYPES, WA_NUMBER } from '../data/catalog';

function getImageUrl(url) {
  if (!url) return null;
  const m = url.match(/\/tienda\/([^/?#]+)/);
  return m ? PRODUCT_IMAGES[m[1]] || null : null;
}

const SECTION_LABELS = { gym: 'GYM', vita: 'VITAMINAS', dote: 'DOTERRA' };
const SECTION_COLORS = { gym: '#ff4500', vita: '#ff6a00', dote: '#cc1500' };

function parsePrices(prices) {
  return prices.map((pr, i) => {
    const m = pr.match(/(₡\s*[\d\s,.]+)/);
    const val = m ? m[0].trim() : pr;
    const rest = m ? pr.replace(m[0], '').trim() : '';
    return { val, rest: rest || `Presentación ${i + 1}` };
  });
}

export default function ProductModal({ productId, onClose }) {
  const p = PRODUCTS[String(productId)];
  const h = p ? (HEALTH[p.c] || {}) : {};

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

  const sectionColor = SECTION_COLORS[p.s];
  const cardType = CATEGORY_TYPES[p.c] || 'SUPPLEMENT';
  const imgUrl = getImageUrl(p.u);

  const waMsg = `Hola MacroForge! 💪 Me interesa: ${p.n} (${p.b}) — ${p.p[0] || ''}. ¿Tienen disponibilidad?`;
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;

  const flavors = (p.f || [])
    .flatMap(f => f.split(',').map(s => s.trim()).filter(Boolean))
    .slice(0, 40);

  const prices = parsePrices(p.p);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        {/* Image */}
        <div className="modal-img">
          {imgUrl && (
            <img
              src={imgUrl}
              alt={`${p.n} | ${p.b}`}
              onError={e => {
                e.currentTarget.style.display = 'none';
                if (import.meta.env?.DEV) console.warn(`[MacroForge] Failed to load modal image for: ${p.n}`);
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

        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>

        {/* Body */}
        <div className="modal-body">
          <div className="modal-brand">{p.b}</div>
          <div className="modal-name">{p.n}</div>
          <div className="modal-cat">{p.c}</div>

          <a className="modal-wa" href={waUrl} target="_blank" rel="noopener noreferrer">
            💬 Pedir por WhatsApp
          </a>

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
              <h4>Sabores / Variantes</h4>
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

          <div className="modal-section">
            <h4>Precios disponibles</h4>
            <div className="modal-prices">
              {prices.map((pr, i) => (
                <div key={i} className="modal-price-row">
                  <span className="modal-price-opt">{pr.rest}</span>
                  <span className="modal-price-val">{pr.val}</span>
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
        </div>
      </div>
    </div>
  );
}
