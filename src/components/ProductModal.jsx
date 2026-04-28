import { useEffect } from 'react';
import { PRODUCTS } from '../data/products';
import { HEALTH } from '../data/health';
import { PRODUCT_IMAGES } from '../data/images';
import { CATEGORY_TYPES, SECTION_BG, WA_NUMBER } from '../data/catalog';

function getImageUrl(productUrl) {
  if (!productUrl) return null;
  const m = productUrl.match(/\/tienda\/([^/?#]+)/);
  return m ? PRODUCT_IMAGES[m[1]] || null : null;
}

const SECTION_LABELS = { gym: 'GYM', vita: 'VITAMINAS', dote: 'DOTERRA' };
const SECTION_COLORS = { gym: '#c8ff00', vita: '#7fffd4', dote: '#ffd700' };

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

  const imageUrl = getImageUrl(p.u);
  const sectionColor = SECTION_COLORS[p.s];
  const cardType = CATEGORY_TYPES[p.c] || 'SUPPLEMENT';

  const waMsg = `Hola MacroForge! 💪 Me interesa: ${p.n} (${p.b}) — ${p.p[0] || ''}. ¿Tienen disponibilidad?`;
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`;

  const flavors = (p.f || [])
    .flatMap(f => f.split(',').map(s => s.trim()).filter(Boolean))
    .slice(0, 40);

  const prices = parsePrices(p.p);

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${p.s}`}>
        {/* Image */}
        <div className="m-img">
          {imageUrl && (
            <img
              className="real-img"
              src={imageUrl}
              alt={`${p.n} | ${p.b}`}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div className={`cv cv-${p.s}`} style={{ background: SECTION_BG[p.s] }}>
            <div className="cv-tag">{p.b}</div>
            <div className="cv-name">{p.n.toUpperCase()}</div>
            <div className="cv-bar" />
            <div className="cv-type">{cardType}</div>
          </div>
        </div>

        <div className="m-tag" style={{ color: sectionColor }}>
          {SECTION_LABELS[p.s]}
        </div>
        <button className="m-close" onClick={onClose} aria-label="Cerrar">✕</button>

        <div className="m-body">
          <div className="m-brand">{p.b}</div>
          <div className="m-name">{p.n}</div>
          <div className="m-cat">{p.c}</div>

          {/* Solo WhatsApp — sin link a tienda distribuidora */}
          <a className="m-wa" href={waUrl} target="_blank" rel="noopener noreferrer">
            💬 Pedir por WhatsApp
          </a>

          {h.d && (
            <div className="m-section">
              <h4>¿Qué es y para qué sirve?</h4>
              <p>{h.d}</p>
            </div>
          )}

          {h.b?.length > 0 && (
            <div className="m-section">
              <h4>Beneficios clave</h4>
              <ul>{h.b.map((ben, i) => <li key={i}>{ben}</li>)}</ul>
            </div>
          )}

          {flavors.length > 0 && (
            <div className="m-section">
              <h4>Sabores / Variantes</h4>
              <div className="flavor-list">
                {flavors.map((f, i) => <span key={i} className="flavor">{f}</span>)}
              </div>
            </div>
          )}

          {h.u && (
            <div className="m-section">
              <h4>Cómo usar</h4>
              <p>{h.u}</p>
            </div>
          )}

          <div className="m-section">
            <h4>Precios disponibles</h4>
            <div className="m-prices">
              {prices.map((pr, i) => (
                <div key={i} className="m-pi">
                  <span className="m-pi-opt">{pr.rest}</span>
                  <span className="m-pi-val">{pr.val}</span>
                </div>
              ))}
            </div>
          </div>

          {h.w && (
            <div className="m-section">
              <h4>Aviso importante</h4>
              <div className="m-warn">{h.w}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
