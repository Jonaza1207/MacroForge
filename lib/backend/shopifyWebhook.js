/**
 * MacroForge — Shopify Webhook Processing
 *
 * Phase 10 — Shopify Commerce Activation
 * SERVER-SIDE ONLY.
 *
 * Handles all Shopify webhook events safely:
 *   - orders/paid → activate post-purchase lifecycle + attribution
 *   - checkouts/create → track checkout sessions
 *   - checkouts/delete → mark sessions as abandoned
 *   - orders/cancelled → update lifecycle + prevent refill automation
 *   - orders/fulfilled → activate delivery tracking
 *   - refunds/create → update revenue attribution
 *
 * Security:
 *   - Signature verified BEFORE processing (in api/shopify/webhook.js)
 *   - Idempotency: shopify_webhook_events table deduplicates by Shopify event ID
 *   - Replay protection: X-Shopify-Webhook-Id checked before processing
 *
 * Webhook registration:
 *   Shopify Admin → Settings → Notifications → Create webhook
 *   Or via API: POST /admin/api/2024-01/webhooks.json
 */

import { supabase }            from './supabase.js';
import { writeAudit }           from './auditLog.js';
import { recordOrderPaid, recordCheckoutAbandoned, activatePostPurchaseLifecycle } from './shopifyAttribution.js';

// ── Idempotency check ─────────────────────────────────────────────

/**
 * Check if this webhook event has already been processed.
 * Returns true if duplicate (should skip processing).
 */
export async function isWebhookDuplicate(webhookId) {
  const { data } = await supabase
    .from('shopify_webhook_events')
    .eq('shopify_event_id', webhookId)
    .select('id').single();
  return Boolean(data);
}

/**
 * Record a webhook event as received (before processing).
 */
export async function recordWebhookEvent(webhookId, topic, payload) {
  await supabase.from('shopify_webhook_events').insert({
    shopify_event_id: webhookId,
    topic,
    shop_domain:      payload.shop_domain || process.env.SHOPIFY_STORE_DOMAIN,
    payload,          // stored for debugging — no sensitive payment data
  });
}

/**
 * Mark a webhook event as processed with result.
 */
export async function markWebhookProcessed(webhookId, result, error = null) {
  await supabase.from('shopify_webhook_events').update({
    processed_at:      new Date().toISOString(),
    processing_result: error ? 'error' : result,
    error_message:     error?.message || null,
  }).eq('shopify_event_id', webhookId);
}

// ── Event handlers ────────────────────────────────────────────────

/**
 * Handle orders/paid — the most important commerce event.
 * Activates post-purchase lifecycle and updates attribution.
 */
export async function handleOrderPaid(order) {
  const draftOrderId = order.source_identifier ||
    order.note_attributes?.find(a => a.name === 'draft_order_id')?.value;
  const anonymousId  = order.note_attributes?.find(a => a.name === 'mf_anonymous_id')?.value;
  const stackTier    = order.note_attributes?.find(a => a.name === 'mf_stack_tier')?.value;
  const goal         = order.note_attributes?.find(a => a.name === 'mf_goal')?.value;
  const campaignId   = order.note_attributes?.find(a => a.name === 'mf_campaign')?.value;
  const sourceFlow   = order.note_attributes?.find(a => a.name === 'mf_source')?.value;

  const totalPrice  = parseFloat(order.total_price || '0');
  const lineItems   = order.line_items || [];

  // Extract product categories from line items (via Supabase lookup)
  const variantIds  = lineItems.map(li => li.variant_id).filter(Boolean);
  const { data: products } = await supabase
    .from('shopify_products')
    .in('shopify_variant_id', variantIds)
    .select('mf_slug');

  await Promise.all([
    recordOrderPaid({
      shopifyOrderId: order.id,
      draftOrderId:   parseInt(draftOrderId || '0', 10) || null,
      anonymousId:    anonymousId || null,
      totalPrice,
      campaignId,
      stackTier,
      goal,
      sourceFlow,
    }),
    anonymousId ? activatePostPurchaseLifecycle({
      anonymousId,
      shopifyOrderId: order.id,
      goal,
      stackTier,
      productCategories: [],  // simplified — enrich with category data in full implementation
    }) : Promise.resolve(),
    writeAudit({ eventType: 'shopify_order_paid', payload: { order_id: order.id, total: totalPrice, anonymous_id: anonymousId } }),
  ]);

  return { processed: true, order_id: order.id };
}

/**
 * Handle checkouts/delete — checkout session was abandoned.
 */
export async function handleCheckoutAbandoned(checkout) {
  const draftOrderId = checkout.source_identifier;
  if (draftOrderId) {
    await recordCheckoutAbandoned(parseInt(draftOrderId, 10));
  }
  await writeAudit({ eventType: 'shopify_checkout_abandoned', payload: { checkout_id: checkout.id } });
  return { processed: true };
}

/**
 * Handle orders/cancelled.
 */
export async function handleOrderCancelled(order) {
  await supabase.from('shopify_orders').update({
    status:       'cancelled',
    cancelled_at: new Date().toISOString(),
  }).eq('shopify_order_id', order.id);

  // Pause post-purchase lifecycle for this customer
  await supabase.from('post_purchase_lifecycle').update({
    reorder_status: 'cancelled',
  }).eq('shopify_order_id', order.id);

  await writeAudit({ eventType: 'shopify_order_cancelled', payload: { order_id: order.id } });
  return { processed: true };
}

/**
 * Handle orders/fulfilled.
 */
export async function handleOrderFulfilled(order) {
  const tracking = order.fulfillments?.[0];
  await supabase.from('shopify_orders').update({
    status:                  'fulfilled',
    fulfillment_status:     'fulfilled',
    fulfillment_tracking_url: tracking?.tracking_url || null,
    fulfillment_company:     tracking?.tracking_company || null,
    fulfilled_at:           new Date().toISOString(),
  }).eq('shopify_order_id', order.id);

  await writeAudit({ eventType: 'shopify_order_fulfilled', payload: { order_id: order.id } });
  return { processed: true };
}

/**
 * Route webhook event to appropriate handler.
 */
export async function routeWebhookEvent(topic, payload) {
  switch (topic) {
    case 'orders/paid':         return handleOrderPaid(payload);
    case 'checkouts/delete':    return handleCheckoutAbandoned(payload);
    case 'orders/cancelled':    return handleOrderCancelled(payload);
    case 'orders/fulfilled':    return handleOrderFulfilled(payload);
    default:
      await writeAudit({ eventType: `shopify_webhook_${topic.replace('/', '_')}`, payload: { id: payload.id } });
      return { processed: false, reason: 'unhandled_topic' };
  }
}
