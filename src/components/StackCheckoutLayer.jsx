/**
 * MacroForge — Stack Checkout Layer
 *
 * Phase 4 — Revenue Infrastructure
 * The premium conversion layer between stack creation and WhatsApp.
 *
 * Psychology:
 *   Before clicking WhatsApp, the customer sees a structured order summary.
 *   This creates psychological commitment — they've reviewed their purchase,
 *   they know the total, they trust the products. The seller receives a
 *   serious, purchase-ready message instead of a casual inquiry.
 *
 * Seller benefit:
 *   The enhanced WA message includes goal, budget tier, product list,
 *   prices, and an explicit "ready to buy" closing phrase. Close rates
 *   increase because there's no back-and-forth to establish intent.
 *
 * ── Future Shopify integration (Phase 5) ─────────────────────────
 * TODO: Replace the WA button with a Shopify Buy Button when checkout
 *   infrastructure is ready. The "Confirm" CTA maps 1:1 to checkout.
 * TODO: POST /api/checkout/create (Vercel Edge Function)
 *   Creates a Shopify draft order from the stack product IDs.
 *   Returns a checkout_url the customer opens directly.
 *   Requires: Shopify Admin API key (server-side only, never frontend).
 *
 * ── Security ─────────────────────────────────────────────────────
 * No secrets. No payment credentials. No Shopify API in frontend.
 * This component is 100% frontend-safe for public deployment.
 */

import { useState } from 'react';
import { PRODUCTS } from '../data/products';
import { resolveProductImage } from '../data/images';
import { analytics } from '../lib/analytics';
import { WA_NUMBER } from '../data/catalog';
import '../styles/stackCheckout.css';

// ── Estimated supply per category (days) ─────────────────────
// Shown per product so the customer understands recurring nature.
const SUPPLY_DAYS = {
  'Creatinas':              30,
  'Proteínas Whey':         30,
  'Proteínas Isoladas':     30,
  'Gainers de Masa':        21,
  'Pre-Entrenamientos':     45,
  'BCAA':                   30,
  'Glutamina':              30,
  'Aminoácidos Esenciales': 30,
  'Electrolitos':           30,
  'Magnesio':               60,
  'Vitaminas Esenciales':   30,
  'Multivitamínicos':       30,
  'Omega y Grasas Saludables': 30,
  'Sueño y Relajación':     45,
  'Probióticos':            30,
  'Colágeno y Belleza':     30,
};

// ── Goal copy ─────────────────────────────────────────────────
const GOAL_COPY = {
  muscle:      'Tu stack está optimizado para ganar músculo de forma progresiva.',
  cut:         'Tu stack está diseñado para definición sin perder masa muscular.',
  performance: 'Stack optimizado para rendimiento y energía sostenida.',
  wellness:    'Un stack completo para salud y bienestar general diario.',
  recovery:    'Optimizado para recuperación muscular y articular.',
  sleep:       'Stack pensado para mejorar la calidad del sueño y la recuperación.',
};

const GOAL_LABELS = {
  muscle: 'Ganar músculo', cut: 'Definición', performance: 'Más rendimiento',
  wellness: 'Salud general', recovery: 'Recuperación', sleep: 'Dormir mejor',
};
const EXP_LABELS = {
  beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
};
const BUD_LABELS = {
  basic: 'Stack esencial', mid: 'Stack balanceado', full: 'Stack completo',
};

// ── Price helpers ─────────────────────────────────────────────
function parsePrice(priceStr) {
  const m = (priceStr || '').match(/([\d,]+)/);
  return m ? parseFloat(m[1].replace(/,/g, '')) || 0 : 0;
}

function formatTotal(num) {
  return `₡${num.toLocaleString('es-CR')}`;
}

// ── Enhanced WhatsApp message ─────────────────────────────────
function buildCheckoutWAMessage({ source, productIds, total, guidedSelections }) {
  const lines = productIds.map((id, i) => {
    const p = PRODUCTS[id];
    if (!p) return null;
    const price = (p.p[0] || '').match(/(₡\s*[\d\s,.]+)/)?.[1]?.trim() || 'consultar precio';
    return `${i + 1}. ${p.n} — ${p.b} — ${price}`;
  }).filter(Boolean).join('\n');

  const totalLine = total > 0
    ? `\nTotal estimado: ~${formatTotal(total)} (+IVA)`
    : '';

  if (source === 'guided' && guidedSelections?.goal) {
    const { goal, experience, budget } = guidedSelections;
    return `Hola MacroForge! 🎯

Armé mi stack personalizado y estoy listo para confirmar.

📋 Mi perfil:
• Objetivo: ${GOAL_LABELS[goal] || goal}
• Experiencia: ${EXP_LABELS[experience] || experience}
• Inversión: ${BUD_LABELS[budget] || budget}

📦 Mi stack (${productIds.length} producto${productIds.length !== 1 ? 's' : ''}):
${lines}
${totalLine}

¿Me confirman disponibilidad y precio final? Estoy listo para proceder.`;
  }

  return `Hola MacroForge! 🎯

Armé mi propio stack y estoy listo para confirmar.

📦 Mi stack (${productIds.length} producto${productIds.length !== 1 ? 's' : ''}):
${lines}
${totalLine}

¿Me confirman disponibilidad y precio final para proceder?`;
}

// ── Product card for checkout ─────────────────────────────────
function CheckoutProduct({ id, index }) {
  const p = PRODUCTS[id];
  if (!p) return null;

  const img    = resolveProductImage(p.u);
  const price  = (p.p[0] || '').match(/(₡\s*[\d\s,.]+)/)?.[1]?.trim() || '';
  const supply = SUPPLY_DAYS[p.c];

  return (
    <div className="sc-product">
      <div className="sc-num">{index + 1}</div>
      <div className="sc-img">
        {img
          ? <img src={img} alt={p.n} loading="lazy" decoding="async"
              onError={e => { e.currentTarget.style.display = 'none'; }} />
          : <div className="sc-img-fallback">{p.b.charAt(0)}</div>
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

// ── Main component ────────────────────────────────────────────
export default function StackCheckoutLayer({
  source,
  guidedStack,
  manualProductIds,
  guidedSelections,
  onEdit,
  onSave,
  onContinue,
}) {
  const [saved, setSaved] = useState(false);

  // Normalize to array of product IDs
  const productIds = source === 'guided'
    ? (guidedStack || []).map(item => item.id).filter(id => Boolean(id && PRODUCTS[id]))
    : (manualProductIds || []).filter(id => Boolean(id && PRODUCTS[id]));

  // Derived values
  const total = productIds.reduce((sum, id) => {
    return sum + parsePrice(PRODUCTS[id]?.p?.[0] || '');
  }, 0);

  // Shortest supply = how long the stack lasts (first product to run out)
  const minSupply = productIds.reduce((min, id) => {
    const days = SUPPLY_DAYS[PRODUCTS[id]?.c];
    return days && days < min ? days : min;
  }, 999);
  const supplyDisplay = minSupply < 999 ? `~${minSupply} días` : null;

  // Stack quality badge
  const quality = productIds.length >= 5 ? 'premium'
    : productIds.length >= 3 ? 'completo'
    : 'básico';

  // Goal context
  const goal = guidedSelections?.goal;

  // WA message + URL
  const waMessage = buildCheckoutWAMessage({ source, productIds, total, guidedSelections });
  const waUrl     = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMessage)}`;

  function handleWAClick() {
    onContinue?.(productIds.length, total);
    analytics.checkoutLayer('continue', {
      source,
      stack_size:      productIds.length,
      estimated_total: total,
      quality,
    });
    analytics.whatsappClick(
      `checkout_${source}`,
      null,
      goal ? `${GOAL_LABELS[goal]} — checkout` : 'manual stack — checkout'
    );
  }

  function handleSave() {
    setSaved(true);
    onSave?.();
  }

  const TRUST = [
    'Productos originales garantizados',
    'Asesoría personalizada incluida',
    'Envíos en todo Costa Rica',
    'Confirmamos disponibilidad al instante',
  ];

  return (
    <div className="sc-container">

      {/* Scrollable content area */}
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
            <span className={`sc-quality sc-quality--${quality}`}>{quality.charAt(0).toUpperCase() + quality.slice(1)}</span>
          </div>
        </div>

        {/* Product list */}
        <div className="sc-products">
          {productIds.map((id, i) => (
            <CheckoutProduct key={id} id={id} index={i} />
          ))}
        </div>

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
            {total > 0 ? `~${formatTotal(total)}` : 'Consultar'}
            {total > 0 && <small>+IVA</small>}
          </div>
        </div>

        {/* Trust signals */}
        <div className="sc-trust">
          {TRUST.map(t => (
            <div key={t} className="sc-trust-item">
              <span className="sc-trust-check">✓</span>
              {t}
            </div>
          ))}
        </div>

        {/* Goal-specific conversion copy */}
        <div className="sc-conversion">
          {goal && GOAL_COPY[goal]
            ? GOAL_COPY[goal]
            : 'Tu stack está listo para confirmar. Normalmente respondemos en minutos.'}
        </div>

      </div>

      {/* Sticky CTA block — never scrolls away on mobile */}
      <div className="sc-cta-block">
        <div className="sc-cta-note">
          Te confirmamos disponibilidad y precio en minutos por WhatsApp.
        </div>

        {/* Primary — WhatsApp (highest intent signal) */}
        <a
          className="sc-wa-btn"
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWAClick}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.112.549 4.1 1.51 5.827L.057 23.82a.5.5 0 0 0 .623.623l5.993-1.453A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.888 0-3.657-.519-5.17-1.42l-.37-.22-3.556.862.862-3.556-.22-.37A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Confirmar disponibilidad por WhatsApp
        </a>

        {/* Secondary CTAs */}
        <div className="sc-secondary-btns">
          <button className="sc-edit-btn" onClick={onEdit} type="button">
            ← Editar stack
          </button>
          <button
            className={`sc-save-btn${saved ? ' sc-save-btn--saved' : ''}`}
            onClick={handleSave}
            type="button"
            disabled={saved}
          >
            {saved ? '✓ Guardado' : '🔖 Guardar para después'}
          </button>
        </div>
      </div>

    </div>
  );
}
