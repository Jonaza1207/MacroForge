/**
 * StackSelling — Consultative stack-buying system.
 *
 * Psychology: A customer arriving for a single product is a customer
 * who hasn't discovered that supplementation is a system. This section
 * reframes the purchase from "one product" to "the right combination,"
 * then routes directly into a curated WhatsApp consultation.
 *
 * Each stack uses only products from the curated PRODUCT_LABELS list —
 * MacroForge's own verified recommendations. No random upsells.
 */
import { PRODUCTS } from '../data/products';
import { resolveProductImage } from '../data/images';
import { analytics } from '../lib/analytics';
import { buildWaUrl } from '../lib/whatsapp';

// Build slug → [id, product] reverse map once
const SLUG_MAP = (() => {
  const m = {};
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const slug = p.u?.match(/\/tienda\/([^/?#]+)/)?.[1];
    if (slug) m[slug] = [id, p];
  }
  return m;
})();

// Curated stacks — each uses verified recommended/popular products.
// IDs derived from PRODUCT_LABELS to ensure quality.
const STACKS = [
  {
    id:       'muscle',
    icon:     '💪',
    goal:     'Ganar músculo',
    subtitle: 'El stack más consultado',
    slugs:    ['gold-standard-whey', 'creatina-monohidratada-nutricost', 'zma'],
    waGoal:   'ganar músculo y masa muscular',
  },
  {
    id:       'cut',
    icon:     '🔥',
    goal:     'Definición',
    subtitle: 'Quemá grasa, conservá músculo',
    slugs:    ['iso-100', 'clanutricost', 'carnitinsimply'],
    waGoal:   'definición y pérdida de grasa',
  },
  {
    id:       'performance',
    icon:     '⚡',
    goal:     'Rendimiento',
    subtitle: 'Entrenás más, rendís más',
    slugs:    ['c4', 'creatina-monohidratada-nutricost', 'gold-standard-whey'],
    waGoal:   'más energía y rendimiento en el gym',
  },
  {
    id:       'wellness',
    icon:     '❤️',
    goal:     'Bienestar general',
    subtitle: 'La base de todo',
    slugs:    ['multivitaminico-hombre-rule-one', 'omega3nutricost', 'melatoninanutricost'],
    waGoal:   'bienestar general y salud',
  },
];

function StackCard({ stack }) {
  const products = stack.slugs
    .map(slug => SLUG_MAP[slug])
    .filter(Boolean);

  const waUrl = buildWaUrl('stackConsult', { goal: stack.waGoal });

  function handleClick() {
    analytics.stackCTA(stack.id, stack.goal);
  }

  return (
    <div className="stack-card">
      <div className="stack-card-header">
        <span className="stack-card-icon" aria-hidden="true">{stack.icon}</span>
        <div>
          <div className="stack-card-goal">{stack.goal}</div>
          <div className="stack-card-sub">{stack.subtitle}</div>
        </div>
      </div>

      <div className="stack-product-list">
        {products.map(([id, p]) => {
          const img = resolveProductImage(p.u);
          return (
            <div key={id} className="stack-product-item">
              <div className="stack-product-img">
                {img
                  ? <img src={img} alt={p.n} loading="lazy" decoding="async" />
                  : <span className="stack-product-initial">{p.b.charAt(0)}</span>
                }
              </div>
              <div className="stack-product-info">
                <div className="stack-product-brand">{p.b}</div>
                <div className="stack-product-name">{p.n}</div>
              </div>
            </div>
          );
        })}
      </div>

      <a
        className="stack-card-cta"
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
      >
        💬 Consultar este stack →
      </a>
    </div>
  );
}

export default function StackSelling() {
  return (
    <section className="stack-section">
      <div className="stack-inner">
        <div className="stack-header">
          <div className="stack-eyebrow">Asesoría especializada</div>
          <h2 className="stack-title">Armemos tu stack</h2>
          <p className="stack-desc">
            El suplemento correcto hace la diferencia.
            La combinación correcta hace la transformación.
          </p>
        </div>

        <div className="stack-grid">
          {STACKS.map(stack => (
            <StackCard key={stack.id} stack={stack} />
          ))}
        </div>

        <div className="stack-footer-note">
          Cada stack es una recomendación. Te asesoramos según tu objetivo, cuerpo y presupuesto.
        </div>
      </div>
    </section>
  );
}
