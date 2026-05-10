/**
 * RefillSection — Passive replenishment intelligence.
 *
 * Renders for returning users whose purchase-intent history suggests
 * a product may be running low based on standard supplement cycles.
 *
 * Tone: helpful, warm, never pushy. Like a trusted store that remembers you.
 * Psychology: removes the friction of remembering to reorder.
 *
 * Placement: top of CatalogHome, ABOVE RecentlyViewed.
 * Why above: repurchase intent is the highest-value signal — surface it first.
 *
 * Triggers:
 *   - User has 2+ visits
 *   - User previously clicked "Quiero este producto" on a refillable category
 *   - 75%+ of that category's standard cycle has elapsed
 *
 * Renders nothing if: new visitor, no purchase intent history, or no candidates.
 */
import { useMemo } from 'react';
import { PRODUCTS } from '../data/products';
import { resolveProductImage } from '../data/images';
import { analytics } from '../lib/analytics';
import { buildWaUrl } from '../lib/whatsapp';
import { getRefillCandidates } from '../lib/retention';
import { getCustomerState } from '../lib/customerState';

export default function RefillSection({ onOpenProduct }) {
  const candidates = useMemo(() => {
    const state = getCustomerState();
    if (!state.isReturning) return [];
    return getRefillCandidates().filter(c => PRODUCTS[c.productId]).slice(0, 2);
  }, []);

  if (candidates.length === 0) return null;

  return (
    <section className="refill-section">
      <div className="refill-header">
        <div className="refill-eyebrow">Recordatorio</div>
        <h3 className="refill-title">
          {candidates.length === 1 ? '¿Ya casi terminás?' : '¿Ya casi terminan?'}
        </h3>
        <p className="refill-sub">
          Basado en tu historial, estos suplementos podrían estar próximos a terminarse.
        </p>
      </div>

      <div className="refill-cards">
        {candidates.map(({ productId, category, daysSincePurchase, urgency }) => {
          const p    = PRODUCTS[productId];
          if (!p) return null;
          const img  = resolveProductImage(p.u);
          const waUrl = buildWaUrl('sameAgain', { name: p.n });

          return (
            <div key={productId} className={`refill-card refill-card--${urgency}`}>
              <div className="refill-card-img" onClick={() => onOpenProduct(productId)}>
                {img
                  ? <img src={img} alt={p.n} loading="lazy" decoding="async"
                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                  : <div className="refill-card-initial">{p.b.charAt(0)}</div>
                }
              </div>
              <div className="refill-card-body">
                <div className="refill-card-brand">{p.b}</div>
                <div className="refill-card-name">{p.n}</div>
                <div className="refill-card-meta">
                  {urgency === 'overdue'
                    ? 'Probablemente ya se terminó'
                    : `Hace ${daysSincePurchase} días`}
                </div>
                <a
                  className="refill-card-cta"
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => analytics.refillHintClick(productId, category, daysSincePurchase)}
                >
                  💬 Pedir de nuevo →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
