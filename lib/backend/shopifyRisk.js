/**
 * MacroForge — Shopify Risk Scoring
 *
 * Phase 10 — Shopify Commerce Activation
 * SERVER-SIDE ONLY.
 *
 * Lightweight risk scoring for checkout sessions.
 * Does NOT fingerprint devices or track invasively.
 * Designed for operational safety — not customer surveillance.
 *
 * Risk signals considered:
 *   - Order velocity (too many orders in short time)
 *   - AOV anomaly (unusually large first order)
 *   - New customer + high-value order combination
 *   - Repeated checkout creation without conversion
 *
 * Risk levels:
 *   low     (0–39)  → proceed normally
 *   medium  (40–69) → flag for manual review, proceed
 *   high    (70+)   → route to WhatsApp concierge review before processing
 */

import { supabase } from './supabase.js';

/**
 * Calculate a risk score for a checkout attempt.
 * Returns 0–100 (higher = higher risk).
 */
export async function calculateRiskScore({ anonymousId, lineItems, estimatedTotal, ipHash }) {
  let score = 0;
  const signals = [];

  // Signal 1: New customer + large order
  const { data: customer } = await supabase
    .from('customers').eq('anonymous_id', anonymousId).select('visit_count, lead_score').single();

  const isNewCustomer = !customer || (customer.visit_count || 0) <= 1;
  if (isNewCustomer && estimatedTotal > 100000) {  // > 100k CRC
    score += 20;
    signals.push('new_customer_high_aov');
  }

  // Signal 2: Checkout velocity — too many checkouts in 1 hour
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { data: recentCheckouts } = await supabase
    .from('checkout_sessions')
    .eq('anonymous_id', anonymousId)
    .gte('created_at', oneHourAgo)
    .select('id');

  if ((recentCheckouts?.length || 0) >= 3) {
    score += 25;
    signals.push('high_checkout_velocity');
  }

  // Signal 3: Many abandoned checkouts (never paid)
  const { data: abandoned } = await supabase
    .from('checkout_sessions')
    .eq('anonymous_id', anonymousId)
    .eq('status', 'abandoned')
    .select('id');

  if ((abandoned?.length || 0) >= 5) {
    score += 15;
    signals.push('repeated_abandonment');
  }

  // Signal 4: Anomalously large stack (8 items, max tier, new customer)
  if (lineItems?.length >= 8 && isNewCustomer) {
    score += 10;
    signals.push('large_stack_new_customer');
  }

  return {
    score:    Math.min(score, 100),
    level:    score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
    signals,
    requires_review: score >= 70,
  };
}

/**
 * For high-risk checkouts: route to WhatsApp concierge instead of direct Shopify.
 * This protects the business without blocking legitimate customers.
 */
export function getRiskRoutingStrategy(riskResult) {
  if (riskResult.level === 'high') {
    return {
      strategy:  'whatsapp_concierge',
      message:   'Para pedidos de alto valor, nuestro equipo los atiende personalmente por WhatsApp.',
      reason:    'high_risk_routing',
    };
  }
  return { strategy: 'direct_checkout' };
}
