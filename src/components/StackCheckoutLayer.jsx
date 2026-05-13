/**
 * MacroForge — Stack Checkout Layer
 *
 * Phase 4 (Revenue Infrastructure) + Phase 5 (Revenue Acceleration)
 *
 * The premium conversion layer between stack creation and WhatsApp.
 * Psychology: before clicking WhatsApp, the customer sees a structured
 * order summary + stack intelligence that builds commitment.
 * The seller receives a "hot buyer" message — not a casual inquiry.
 *
 * Phase 5 upgrades:
 *   - RevenueAccelerationLayer: tier, coverage, completeness, suggestion
 *   - Premium WA message: "quiero cerrar el pedido hoy" framing
 *   - isRestored support: warm recognition for returning users
 *   - 6 trust signals (upgraded from 4)
 *
 * ── Future Shopify integration (Phase 6) ─────────────────────────
 * TODO: Replace WA button with Shopify Buy Button when checkout ready.
 *   POST /api/checkout/create → Shopify draft order → checkout_url
 *   Requires: Shopify Admin API key (server-side only, never frontend).
 *
 * TODO: POST /api/subscriptions/create
 *   Shopify Selling Plan for refill subscriptions ("Suscribirse y ahorrar").
 *
 * TODO: Customer segmentation
 *   tier.shopifyTag → Shopify customer tag via Admin API (server-side).
 *   Enables tag-based pricing, loyalty tiers, and CRM segmentation.
 *
 * Security: No secrets. No payment credentials. 100% frontend-safe.
 */

import { useState } from 'react';
import { PRODUCTS } from '../data/products';
import { resolveProductImage, resolveDoTERRAImage } from '../data/images';
import { analytics } from '../lib/analytics';
import { WA_NUMBER } from '../data/catalog';
import {
  getStackTier,
  getStackCoverage,
  buildPremiumWAMessage,
} from '../lib/checkoutPsychology';
import { initiateShopifyCheckout, CHECKOUT_ERRORS } from '../lib/shopifyCheckout';
import {
  initiateSubscriptionCheckout,
  getRecommendedSubscriptionInterval,
  getSubscriptionDiscount,
} from '../lib/subscriptionCheckout';
import { parseCRCPrice, formatCRC, normalizePriceDisplay } from '../lib/priceFormatter';
import { getStackSupplyEstimate } from '../lib/refillIntelligence';
import { buildWaUrl } from '../lib/whatsapp';
import RevenueAccelerationLayer from './RevenueAccelerationLayer';
import RetentionEngineLayer from './RetentionEngineLayer';
import '../styles/stackCheckout.css';
import '../styles/revenueAcceleration.css';
import '../styles/retentionEngine.css';

// ── Estimated supply per category (days) ─────────────────────
const SUPPLY_DAYS = {
  'Creatinas': 30, 'Proteínas Whey': 30, 'Proteínas Isoladas': 30,
  'Gainers de Masa': 21, 'Pre-Entrenamientos': 45, 'BCAA': 30,
  'Glutamina': 30, 'Aminoácidos Esenciales': 30, 'Electrolitos': 30,
  'Magnesio': 60, 'Vitaminas Esenciales': 30, 'Multivitamínicos': 30,
  'Omega y Grasas Saludables': 30, 'Sueño y Relajación': 45,
  'Probióticos': 30, 'Colágeno y Belleza': 30,
};

const GOAL_LABELS = {
  muscle: 'Ganar músculo', cut: 'Definición', performance: 'Más rendimiento',
  wellness: 'Salud general', recovery: 'Recuperación', sleep: 'Dormir mejor',
};
const BUD_LABELS = {
  basic: 'Stack esencial', mid: 'Stack balanceado', full: 'Stack completo',
};

// Price helpers re-exported from central formatter (parseCRCPrice, formatCRC, normalizePriceDisplay)

// ── Product card for checkout ─────────────────────────────────
function CheckoutProduct({ id, index }) {
  const p = PRODUCTS[id];
  if (!p) return null;
  const img    = resolveProductImage(p.u) || resolveDoTERRAImage(p.n);
  const price  = normalizePriceDisplay(p.p?.[0], '');
  const supply = SUPPLY_DAYS[p.c];
  return (
    <div className="sc-product">
      <div className="sc-num">{index + 1}</div>
      <div className="sc-img">
        {img
          ? <img src={img} alt={p.n} loading="lazy" decoding="async"
              onError={e => { e.currentTarget.style.display = 'none'; }} />
          : <div className="sc-img-fallback">{(p.b || '?').charAt(0)}</div>
        }
      </div>
      <div className="sc-info">
        <div className="sc-brand">{p.b}</div>
        <div className="sc-name">{p.n}</div>
        {supply && <div className="sc-supply">~{supply} días de suministro</div>}
      </div>
      {price && <div className="sc-price">{price}</div>}
    </div>
  );
}

// ── Six premium trust signals ─────────────────────────────────
const TRUST_SIGNALS = [
  'Productos originales garantizados',
  'Asesoría personalizada incluida',
  'Confirmamos disponibilidad al instante',
  'Envíos en todo Costa Rica',
  'Soporte directo por WhatsApp',
  'Selección optimizada para tu objetivo',
];

// ── Main component ────────────────────────────────────────────
export default function StackCheckoutLayer({
  source,
  guidedStack,
  manualProductIds,
  guidedSelections,
  isRestored,
  restoredAt,
  onEdit,
  onSave,
  onContinue,
}) {
  const [saved,          setSaved]          = useState(false);
  const [payState,       setPayState]       = useState('idle');   // 'idle'|'loading'|'error'
  const [payError,       setPayError]       = useState(null);     // user-facing error message
  const [subState,       setSubState]       = useState('idle');   // 'idle'|'loading'|'error'

  // Normalize to array of product IDs
  const productIds = source === 'guided'
    ? (guidedStack || []).map(item => item.id).filter(id => Boolean(id && PRODUCTS[id]))
    : (manualProductIds || []).filter(id => Boolean(id && PRODUCTS[id]));

  // Derived values
  const total = productIds.reduce((sum, id) => sum + parseCRCPrice(PRODUCTS[id]?.p?.[0] || ''), 0);

  const minSupply = productIds.reduce((min, id) => {
    const days = SUPPLY_DAYS[PRODUCTS[id]?.c];
    return days && days < min ? days : min;
  }, 999);
  const supplyDisplay = minSupply < 999 ? `~${minSupply} días` : null;

  const goal = guidedSelections?.goal;

  // Stack tier (for WA message context)
  const tier     = getStackTier(productIds.length, guidedSelections?.budget);
  const coverage = getStackCoverage(productIds);

  // Subscription recommendation — computed once, used in sticky footer CTA
  const supplyEst   = getStackSupplyEstimate(productIds);
  const recInterval = getRecommendedSubscriptionInterval(supplyEst?.min);
  const discountPct = getSubscriptionDiscount(tier?.tier);
  const subWaUrl    = buildWaUrl('subscriptionOffer', {
    stackName:     tier?.label || 'Mi Stack',
    discount:      `${discountPct}%`,
    intervalLabel: recInterval.label,
  });

  // Premium WA message — Phase 5 hot-buyer framing
  const waMessage = buildPremiumWAMessage({
    source,
    productIds,
    total,
    guidedSelections,
    tierLabel: tier.label,
    coverage,
  });
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMessage)}`;

  function handleWAClick() {
    onContinue?.(productIds.length, total);
    analytics.checkoutLayer('continue', {
      source,
      stack_size:      productIds.length,
      estimated_total: total,
      tier:            tier.tier,
    });
    analytics.whatsappClick(
      `checkout_${source}`,
      null,
      goal ? `${GOAL_LABELS[goal]} — ${tier.label}` : `${tier.label} — manual`
    );
  }

  async function handlePayNow() {
    setPayState('loading');
    setPayError(null);
    analytics.checkoutLayer('pay_now_clicked', { source, stack_size: productIds.length, tier: tier.tier });

    try {
      const checkoutUrl = await initiateShopifyCheckout({
        productIds,
        products: PRODUCTS,
        source,
        tier,
        coverage,
        guidedSelections,
        estimatedTotal: total,
      });

      analytics.checkoutLayer('shopify_checkout_opened', { source, stack_size: productIds.length });
      // Redirect to Shopify hosted checkout
      window.location.href = checkoutUrl;

    } catch (err) {
      setPayState('error');

      if (err.code === CHECKOUT_ERRORS.WHATSAPP_CONCIERGE) {
        // High-value order: route to premium WA concierge
        setPayError('Para este pedido, nuestro equipo te atiende personalmente por WhatsApp.');
        analytics.checkoutLayer('shopify_routed_concierge', { reason: err.reason });
      } else {
        // General failure: fall back to WA
        setPayError('El pago directo no está disponible en este momento. Usá WhatsApp abajo.');
        analytics.checkoutLayer('shopify_checkout_failed', { reason: err.reason || err.code });
      }
    }
  }

  async function handleSubscribeNow() {
    setSubState('loading');
    analytics.subscriptionEvent('subscription_cta_clicked', {
      stack_tier:    tier?.tier || 'esencial',
      interval_days: recInterval.days,
      discount_pct:  discountPct,
      cta_location:  'sticky_footer',
    });
    try {
      const { checkout_url } = await initiateSubscriptionCheckout({
        productIds,
        products:           PRODUCTS,
        source,
        tier,
        guidedSelections,
        estimatedTotal:     total,
        supplyEstimateDays: supplyEst?.min,
        intervalPreference: recInterval.days,
      });
      analytics.subscriptionEvent('subscription_checkout_created', {
        stack_tier:    tier?.tier || 'esencial',
        interval_days: recInterval.days,
        discount_pct:  discountPct,
      });
      window.location.href = checkout_url;
    } catch {
      setSubState('error');
      analytics.subscriptionEvent('subscription_checkout_failed', {
        cta_location: 'sticky_footer',
      });
    }
  }

  function handleSave() {
    setSaved(true);
    onSave?.();
  }

  return (
    <div className="sc-container">

      {/* Scrollable content */}
      <div className="sc-scroll">

        {/* Header */}
        <div className="sc-header">
          <div className="sc-badge">
            <span>📋</span> Resumen de tu stack
          </div>
          <div className="sc-context">
            {goal && <span className="sc-goal-tag">{GOAL_LABELS[goal]}</span>}
            {guidedSelections?.budget && (
              <span className="sc-goal-tag">{BUD_LABELS[guidedSelections.budget]}</span>
            )}
          </div>
        </div>

        {/* Product list */}
        <div className="sc-products">
          {productIds.map((id, i) => (
            <CheckoutProduct key={id} id={id} index={i} />
          ))}
        </div>

        {/* Revenue Acceleration Layer — Phase 5 */}
        <RevenueAccelerationLayer
          productIds={productIds}
          guidedSelections={guidedSelections}
          isRestored={isRestored}
          restoredAt={restoredAt}
        />

        {/* Total summary */}
        <div className="sc-total">
          <div className="sc-total-left">
            <div className="sc-total-label">Total estimado</div>
            <div className="sc-total-sub">
              {productIds.length} producto{productIds.length !== 1 ? 's' : ''}
              {supplyDisplay ? ` · Suministro ${supplyDisplay}` : ''}
            </div>
          </div>
          <div className="sc-total-value">
            {total > 0 ? `~${formatCRC(total)}` : 'Consultar'}
            {total > 0 && <small>+IVA</small>}
          </div>
        </div>

        {/* Six trust signals (upgraded from four) */}
        <div className="sc-trust">
          {TRUST_SIGNALS.map(t => (
            <div key={t} className="sc-trust-item">
              <span className="sc-trust-check">✓</span>
              {t}
            </div>
          ))}
        </div>

        {/* Retention Engine Layer — Phase 6 */}
        <RetentionEngineLayer
          source={source}
          productIds={productIds}
          guidedSelections={guidedSelections}
          tier={tier}
        />

      </div>

      {/* Sticky CTA — catalog mode: WhatsApp as the primary conversion path */}
      <div className="sc-cta-block">

        {/* Primary: WhatsApp consultation */}
        <a
          className="sc-wa-btn sc-wa-btn--primary"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWAClick}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.112.549 4.1 1.51 5.827L.057 23.82a.5.5 0 0 0 .623.623l5.993-1.453A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.888 0-3.657-.519-5.17-1.42l-.37-.22-3.556.862.862-3.556-.22-.37A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Consultar por WhatsApp
        </a>

        {/* Tertiary: edit + save */}
        <div className="sc-secondary-btns">
          <button className="sc-edit-btn" onClick={onEdit} type="button">← Editar</button>
          <button
            className={`sc-save-btn${saved ? ' sc-save-btn--saved' : ''}`}
            onClick={handleSave}
            type="button"
            disabled={saved}
          >
            {saved ? '✓ Guardado' : '🔖 Guardar'}
          </button>
        </div>
      </div>

    </div>
  );
}
