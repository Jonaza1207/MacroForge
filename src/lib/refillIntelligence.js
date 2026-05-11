/**
 * MacroForge — Refill Intelligence System
 *
 * Phase 6 — Retention + Recurring Revenue Engine
 * Pure logic module — no React, no DOM, no side effects.
 *
 * Computes:
 *   - Estimated supply duration for a product stack
 *   - Refill timeline copy (when to reorder)
 *   - Reorder psychology messaging (goal-aware, educational)
 *   - Formatted refill date estimates
 *
 * This is the foundation of the recurring revenue system.
 * The customer who knows their stack lasts 30 days is a customer
 * who returns in 25–28 days to reorder. Without this information,
 * they forget, run out, and buy from a competitor.
 *
 * ── Future subscription integration (Phase 7) ─────────────────────
 * TODO: POST /api/subscriptions/create (Vercel Edge Function)
 *   Input:  { product_ids, interval_days, customer_anonymous_id }
 *   Action: Creates Shopify Selling Plan subscription
 *   Saves:  subscription record in Supabase
 *   Output: { subscription_id, next_billing_date, checkout_url }
 *   Requires: Shopify Admin API + Supabase (server-side only)
 *
 * TODO: POST /api/reminders/schedule
 *   Schedules a WhatsApp refill reminder via 360dialog or Twilio
 *   Fires at 75% of the estimated supply duration
 *   Requires: WhatsApp Business API (server-side only)
 *
 * Future Supabase tables:
 *   subscriptions(id, user_id, product_ids, interval_days, next_date, status)
 *   refill_reminders(id, subscription_id, sent_at, channel, converted)
 */

import { PRODUCTS } from '../data/products';

// ── Supply data per category ──────────────────────────────────────
// min/max range accounts for variation in serving size and frequency.
// These are estimates — the goal is to give the customer a planning window.
const SUPPLY_RANGES = {
  'Creatinas':              { min: 25, max: 35 }, // 150g @ 5g/day = 30 days
  'Proteínas Whey':         { min: 25, max: 35 }, // 2lbs @ 2 scoops/day = ~30 days
  'Proteínas Isoladas':     { min: 25, max: 35 },
  'Proteínas de Carne':     { min: 25, max: 35 },
  'Proteínas Veganas':      { min: 25, max: 35 },
  'Gainers de Masa':        { min: 18, max: 24 }, // 3 scoops/day → shorter
  'Pre-Entrenamientos':     { min: 40, max: 50 }, // 1 scoop, 3-4x/week
  'BCAA':                   { min: 25, max: 35 },
  'Glutamina':              { min: 25, max: 35 },
  'Aminoácidos Esenciales': { min: 25, max: 35 },
  'Electrolitos':           { min: 25, max: 35 },
  'Magnesio':               { min: 55, max: 65 }, // 1 cap/day → 60 caps = 60 days
  'Vitaminas Esenciales':   { min: 25, max: 35 },
  'Multivitamínicos':       { min: 25, max: 35 },
  'Omega y Grasas Saludables': { min: 25, max: 35 },
  'Sueño y Relajación':     { min: 40, max: 50 }, // taken 3–4x/week
  'Probióticos':            { min: 25, max: 35 },
  'Colágeno y Belleza':     { min: 25, max: 35 },
  'Articulaciones':         { min: 25, max: 35 },
  'Salud Mental y Cognitiva': { min: 25, max: 35 },
  'Salud Cardiovascular':   { min: 25, max: 35 },
  'Control Metabólico':     { min: 25, max: 35 },
};

// ── Core supply estimation ────────────────────────────────────────

/**
 * Estimate how long a stack lasts based on its products.
 * Returns the shortest supply range (first product to run out).
 *
 * @param {string[]} productIds
 * @returns {{ min: number, max: number, display: string } | null}
 */
export function getStackSupplyEstimate(productIds) {
  let minOfMins = 999;
  let minOfMaxs = 999;

  for (const id of productIds) {
    const p = PRODUCTS[id];
    if (!p) continue;
    const range = SUPPLY_RANGES[p.c];
    if (!range) continue;
    if (range.min < minOfMins) minOfMins = range.min;
    if (range.max < minOfMaxs) minOfMaxs = range.max;
  }

  if (minOfMins === 999) return null;
  return {
    min:     minOfMins,
    max:     minOfMaxs,
    display: minOfMins === minOfMaxs
      ? `~${minOfMins} días`
      : `${minOfMins}–${minOfMaxs} días`,
  };
}

/**
 * Estimate the approximate refill date from today.
 * Returns a formatted Spanish date string (e.g., "alrededor del 10 de julio").
 */
export function getRefillDateEstimate(estimate) {
  if (!estimate) return null;
  // Use 75% of the min supply as the reminder window
  const reminderDays = Math.round(estimate.min * 0.75);
  const refillDate   = new Date(Date.now() + reminderDays * 86400000);
  return refillDate.toLocaleDateString('es-CR', {
    day:   'numeric',
    month: 'long',
  });
}

// ── Refill copy ───────────────────────────────────────────────────

/**
 * Returns the primary refill timeline message for the checkout layer.
 * Compact, factual, actionable.
 */
export function getRefillTimelineMessage(estimate) {
  if (!estimate) return null;
  if (estimate.min === estimate.max) {
    return `Tu stack debería durar aproximadamente ${estimate.min} días con uso consistente.`;
  }
  return `Tu stack debería durar entre ${estimate.min} y ${estimate.max} días con uso regular.`;
}

// ── Reorder psychology ────────────────────────────────────────────

/**
 * Goal-aware reorder psychology messages.
 * Educational and motivational — never pushy.
 * Designed to create the mental framing: "I need to plan my next order."
 */
const REORDER_MESSAGES = {
  muscle:      'Los mejores resultados vienen de la constancia. Mantener el stack activo de forma continua maximiza el progreso muscular.',
  cut:         'La consistencia es lo que define el cuerpo. Interrumpir el stack en medio del proceso reduce los resultados.',
  performance: 'El rendimiento se construye semana a semana. Un stack continuo asegura que nunca pierdas ritmo.',
  wellness:    'Los beneficios de los suplementos de bienestar se acumulan con el tiempo. La constancia es clave.',
  recovery:    'Una recuperación óptima depende de la suplementación consistente. No dejes que se corte el ciclo.',
  sleep:       'La calidad del sueño mejora progresivamente. Mantener el stack sin interrupciones da mejores resultados.',
  default:     'La constancia es lo que transforma el entrenamiento en resultados. Planificá tu próximo reabastecimiento.',
};

/**
 * Returns the reorder psychology message for the given goal.
 */
export function getReorderPsychologyMessage(goal) {
  return REORDER_MESSAGES[goal] || REORDER_MESSAGES.default;
}

// ── Subscription teaser ───────────────────────────────────────────

/**
 * TODO (Phase 7 — Subscription Infrastructure):
 *
 * When activated, this function will return the Shopify Selling Plan
 * details for the customer's stack instead of the static teaser.
 *
 * POST /api/subscription-options
 *   Input:  { product_ids, interval_days }
 *   Output: { discount_pct, monthly_price, annual_savings, plan_id }
 *
 * Customer segments for subscription offers:
 *   stack_premium  → 10% off monthly refill
 *   stack_completo → 8% off monthly refill
 *   stack_balanceado → 5% off monthly refill
 *
 * WhatsApp automation for subscribers (Phase 8):
 *   D-5 before refill: "Tu stack llega en 5 días. ¿Todo listo?"
 *   D-0 refill day:    "Tu stack de [month] fue procesado."
 *   D+3 after refill:  "¿Cómo va el nuevo mes de entrenamiento?"
 */
export function getSubscriptionTeaser(tier) {
  const discountMap = { premium: '10%', completo: '8%', balanceado: '5%', esencial: '5%' };
  const discount = discountMap[tier] || '5%';
  return {
    title:    'Stack mensual automático · Próximamente',
    body:     `Recibí tu stack favorito cada mes. Ahorrá ${discount} en cada pedido.`,
    cta:      'Notificarme cuando esté disponible',
    discount,
  };
}
