/**
 * GuidePage — Authority content renderer.
 *
 * Renders an educational guide with:
 *   - Expert content organized in clear sections
 *   - Curated product recommendations
 *   - WhatsApp CTA for consultation
 *   - Related guides for authority compounding
 *
 * Accessible via #guia/[slug] — deep-linkable, shareable.
 * Psychology: a visitor who reads a guide trusts MacroForge more.
 *   They arrived with a question. They leave with an answer AND
 *   a clear path to buy the right product.
 *
 * Trust signals: no fake urgency, no pressure, just expertise.
 */
import { useEffect } from 'react';
import { PRODUCTS } from '../data/products';
import { resolveProductImage } from '../data/images';
import { PRODUCT_LABELS } from '../data/labels';
import { analytics } from '../lib/analytics';
import { buildWaUrl } from '../lib/whatsapp';
import { GUIDES, getGuide } from '../data/guides';
import ProductCard from './ProductCard';

// slug → product ID map (module-level, computed once)
const SLUG_TO_ID = (() => {
  const m = {};
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const slug = p.u?.match(/\/tienda\/([^/?#]+)/)?.[1];
    if (slug) m[slug] = id;
  }
  return m;
})();

export default function GuidePage({ slug, onClose, onOpenProduct }) {
  const guide = getGuide(slug);

  useEffect(() => {
    if (guide) {
      analytics.guideView(slug, guide.title);
      document.title = `${guide.title} | MacroForge`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', guide.subtitle);
    }
    return () => {
      // Caller (App) restores the title on close
    };
  }, [slug, guide]);

  if (!guide) {
    return (
      <div className="guide-page">
        <button className="guide-back" onClick={onClose}>← Volver al catálogo</button>
        <div className="empty">
          <div className="empty-icon">📖</div>
          <div className="empty-title">Guía no encontrada</div>
        </div>
      </div>
    );
  }

  const productIds = guide.productSlugs
    .map(s => SLUG_TO_ID[s])
    .filter(id => id && PRODUCTS[id]);

  const waUrl = buildWaUrl(guide.waFlow, { goal: guide.waGoal });

  const relatedGuides = (guide.relatedGuides || [])
    .map(s => GUIDES[s])
    .filter(Boolean)
    .slice(0, 2);

  return (
    <article className="guide-page">

      {/* Back nav */}
      <button className="guide-back" onClick={onClose}>
        ← Volver al catálogo
      </button>

      {/* Header */}
      <header className="guide-header">
        <div className="guide-eyebrow">Guía MacroForge · Costa Rica</div>
        <h1 className="guide-title">{guide.title}</h1>
        <p className="guide-subtitle">{guide.subtitle}</p>
      </header>

      {/* Content sections */}
      <div className="guide-content">
        {guide.sections.map((section, i) => (
          <section key={i} className="guide-section">
            <h2 className="guide-section-heading">{section.heading}</h2>
            <div className="guide-section-body">
              {section.body.split('\n\n').map((para, j) => (
                <p key={j}>{para}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Primary CTA — after reading = highest intent */}
      <div className="guide-cta-block">
        <div className="guide-cta-label">¿Querés asesoría personalizada?</div>
        <p className="guide-cta-sub">
          Normalmente respondemos en minutos. Sin compromiso, sin presión.
        </p>
        <a
          className="guide-cta-btn"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => analytics.whatsappClick('guide', slug, guide.title)}
        >
          💬 Consultar por WhatsApp →
        </a>
      </div>

      {/* Curated product recommendations */}
      {productIds.length > 0 && (
        <section className="guide-products">
          <div className="guide-products-eyebrow">Selección recomendada</div>
          <h2 className="guide-products-title">Productos para este objetivo</h2>
          <div className="product-grid">
            {productIds.map(id => (
              <ProductCard
                key={id}
                product={PRODUCTS[id]}
                onClick={() => {
                  analytics.featuredClick(id, PRODUCTS[id]?.n, `guide:${slug}`);
                  onOpenProduct(id);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Related guides — authority compounding */}
      {relatedGuides.length > 0 && (
        <nav className="guide-related">
          <div className="guide-related-label">También te puede interesar</div>
          <div className="guide-related-cards">
            {relatedGuides.map(g => (
              <button
                key={g.slug}
                className="guide-related-card"
                onClick={() => {
                  history.pushState({ guide: g.slug }, '', `#guia/${g.slug}`);
                  onClose(g.slug);
                }}
              >
                <div className="guide-related-title">{g.title}</div>
                <div className="guide-related-sub">{g.subtitle}</div>
                <div className="guide-related-arrow">Leer guía →</div>
              </button>
            ))}
          </div>
        </nav>
      )}

    </article>
  );
}
