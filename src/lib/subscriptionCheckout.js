/**
 * MacroForge — Subscription Checkout Initiator
 *
 * Phase 11 — Subscription + Recurring Revenue Activation
 * FRONTEND-SAFE. No Shopify credentials. No billing secrets.
 *
 * Calls MacroForge's own /api/shopify/subscription endpoint.
 * The backend handles all Shopify Selling Plan + billing logic.
 *
 * Security:
 *   - Never calls Shopify directly
 *   - Never handles billing data
 *   - Shopify manages subscription billing via hosted checkout
 *
 * Failure handling:
 *   - Subscription unavailable → throw WHATSAPP_FALLBACK
 *   - Shopify error → throw WHATSAPP_FALLBACK
 *   - Network error → throw NETWORK_ERROR
 */

import { getAnonymousId }    from './segmentation';
import { CHECKOUT_ERRORS }   from './shopifyCheckout';

// Re-export for convenience
export { CHECKOUT_ERRORS };

/**
 * Get recommended subscription interval based on stack supply estimate.
 */
export function getRecommendedSubscriptionInterval(supplyEstimateDays) {
  if (!supplyEstimateDays || supplyEstimateDays <= 35) {
    return { days: 30, label: '30 días', shortLabel: 'mensual' };
  }
  if (supplyEstimateDays <= 50) {
    return { days: 45, label: '45 días', shortLabel: 'cada 45 días' };
  }
  return { days: 60, label: '60 días', shortLabel: 'cada 2 meses' };
}

/**
 * Get discount for a stack tier (mirrors backend logic).
 */
export function getSubscriptionDiscount(stackTier) {
  const DISCOUNTS = { premium: 10, completo: 8, balanceado: 5, esencial: 5 };
  return DISCOUNTS[stackTier] || 5;
}

/**
 * Initiate a subscription checkout via Shopify Selling Plans.
 *
 * @param {object} params
 * @returns {Promise<{ checkout_url, subscription }>}
 */
export async function initiateSubscriptionCheckout({
  productIds,
  products,
  source,
  tier,
  guidedSelections,
  estimatedTotal,
  supplyEstimateDays,
  intervalPreference,
}) {
  const anonymousId = getAnonymousId();
  const interval    = intervalPreference
    ? { days: intervalPreference }
    : getRecommendedSubscriptionInterval(supplyEstimateDays);

  // Build catalog data for backend product mapping
  const catalogData = {};
  for (const id of productIds) {
    const p = products?.[id];
    if (p) catalogData[id] = { u: p.u, n: p.n, b: p.b, c: p.c };
  }

  const payload = {
    anonymous_id:        anonymousId,
    product_ids:         productIds,
    catalog_data:        catalogData,
    interval_preference: interval.days,
    stack_metadata: {
      stack_tier:      tier?.tier    || null,
      tier_label:      tier?.label   || null,
      goal:            guidedSelections?.goal || null,
      budget:          guidedSelections?.budget || null,
      stack_size:      productIds.length,
      source_flow:     source,
      estimated_total: estimatedTotal || 0,
      supply_days:     supplyEstimateDays || null,
      is_subscription: true,
    },
    attribution: {
      source_flow: source,
      anonymous_id: anonymousId,
    },
  };

  let response;
  try {
    const res = await fetch('/api/shopify/subscription', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(15000),
    });
    response = await res.json();
  } catch (err) {
    const error = new Error('Subscription network error');
    error.code  = CHECKOUT_ERRORS.NETWORK_ERROR;
    throw error;
  }

  // Handle graceful fallback signals
  if (response.status === 'subscription_unavailable' ||
      response.status === 'shopify_unavailable'       ||
      response.status === 'shopify_error'              ||
      response.status === 'no_variants_mapped'         ||
      response.status === 'no_selling_plan') {
    const error = new Error(response.message || 'Subscription unavailable');
    error.code   = CHECKOUT_ERRORS.WHATSAPP_FALLBACK;
    error.reason = response.status;
    throw error;
  }

  if (response.checkout_url) {
    return { checkout_url: response.checkout_url, subscription: response.subscription };
  }

  const error = new Error('Unexpected subscription response');
  error.code   = CHECKOUT_ERRORS.WHATSAPP_FALLBACK;
  throw error;
}
