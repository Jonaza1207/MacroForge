/**
 * MacroForge — Shopify Checkout Initiator
 *
 * Phase 10 — Shopify Commerce Activation
 * FRONTEND-SAFE. No Shopify Admin credentials. No payment data.
 *
 * This module calls MacroForge's own /api/shopify/draft-order endpoint.
 * MacroForge's backend (not the frontend) communicates with Shopify.
 *
 * Security:
 *   - NEVER calls Shopify Admin API directly from frontend
 *   - NEVER handles card numbers, CVV, or payment data
 *   - NEVER exposes Shopify Admin credentials
 *   - Calls only MacroForge's own secure API
 *
 * Failure handling:
 *   - API error → throw with WHATSAPP_FALLBACK signal
 *   - Shopify unavailable → throw with WHATSAPP_FALLBACK signal
 *   - High-risk routing → throw with WHATSAPP_CONCIERGE signal
 *   - No variants mapped → throw with WHATSAPP_FALLBACK signal
 *
 * The caller (StackCheckoutLayer.jsx) handles the error signals
 * and gracefully falls back to the WhatsApp flow.
 */

import { getAnonymousId } from './segmentation';

export const CHECKOUT_ERRORS = {
  WHATSAPP_FALLBACK:   'WHATSAPP_FALLBACK',    // use WA as primary
  WHATSAPP_CONCIERGE:  'WHATSAPP_CONCIERGE',   // VIP WA concierge routing
  NETWORK_ERROR:       'NETWORK_ERROR',
};

/**
 * Initiate Shopify checkout for a MacroForge stack.
 *
 * @param {object} params
 * @param {string[]} params.productIds   — MacroForge product IDs
 * @param {object}   params.products     — PRODUCTS catalog (for slug extraction)
 * @param {string}   params.source       — 'guided' | 'manual'
 * @param {object}   params.tier         — stack tier from checkoutPsychology
 * @param {string[]} params.coverage     — stack coverage pillars
 * @param {object}   params.guidedSelections — { goal, experience, budget, frequency }
 * @param {number}   params.estimatedTotal — total CRC value
 * @returns {Promise<string>}            — Shopify hosted checkout URL
 * @throws {Error}                       — with code in CHECKOUT_ERRORS
 */
export async function initiateShopifyCheckout({
  productIds,
  products,
  source,
  tier,
  coverage,
  guidedSelections,
  estimatedTotal,
}) {
  const anonymousId = getAnonymousId();

  // Build catalog data for backend product mapping
  // We pass product URL data so the backend can extract slugs → Shopify variant IDs
  const catalogData = {};
  for (const id of productIds) {
    const p = products?.[id];
    if (p) {
      catalogData[id] = { u: p.u, n: p.n, b: p.b, c: p.c };
    }
  }

  const payload = {
    anonymous_id:  anonymousId,
    product_ids:   productIds,
    catalog_data:  catalogData,
    stack_metadata: {
      stack_tier:      tier?.tier    || null,
      tier_label:      tier?.label   || null,
      goal:            guidedSelections?.goal     || null,
      experience:      guidedSelections?.experience || null,
      budget:          guidedSelections?.budget   || null,
      stack_size:      productIds.length,
      source_flow:     source,
      coverage:        (coverage || []).slice(0, 3),
      estimated_total: estimatedTotal || 0,
    },
    attribution: {
      source_flow:   source,
      anonymous_id:  anonymousId,
      // Future: add GA4 session ID, Meta click ID
    },
  };

  let response;
  try {
    const res = await fetch('/api/shopify/draft-order', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(15000),  // 15s timeout
    });

    response = await res.json();
  } catch (err) {
    const error = new Error('Checkout network error');
    error.code  = CHECKOUT_ERRORS.NETWORK_ERROR;
    throw error;
  }

  // Handle graceful fallback signals from backend
  if (response.status === 'shopify_unavailable' ||
      response.status === 'shopify_error'        ||
      response.status === 'no_variants_mapped') {
    const error = new Error(response.message || 'Checkout unavailable');
    error.code    = CHECKOUT_ERRORS.WHATSAPP_FALLBACK;
    error.reason  = response.reason || response.status;
    throw error;
  }

  // Route high-risk orders to WhatsApp concierge
  if (response.status === 'high_risk_routing') {
    const error = new Error(response.message || 'High-value order: WhatsApp concierge');
    error.code   = CHECKOUT_ERRORS.WHATSAPP_CONCIERGE;
    throw error;
  }

  // Return existing checkout if already created (idempotency)
  if (response.status === 'checkout_exists' && response.checkout_url) {
    return response.checkout_url;
  }

  // Happy path: return checkout URL
  if (response.checkout_url) {
    return response.checkout_url;
  }

  // Unexpected response — fall back to WhatsApp
  const error = new Error('Unexpected checkout response');
  error.code  = CHECKOUT_ERRORS.WHATSAPP_FALLBACK;
  throw error;
}
