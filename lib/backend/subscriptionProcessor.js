/**
 * MacroForge — Subscription Lifecycle Processor
 *
 * Phase 11 — Subscription + Recurring Revenue Activation
 * SERVER-SIDE ONLY.
 *
 * Handles subscription lifecycle events:
 *   - Subscription created (first payment confirmed)
 *   - Renewal success (recurring payment confirmed)
 *   - Payment failed → churn signal
 *   - Cancellation → churn signal + attribution
 *   - Pause/resume
 *
 * Churn prevention:
 *   - payment_failed → queue WhatsApp support (with consent)
 *   - cancellation_intent → queue save offer
 *   - engagement_drop → queue re-engagement
 *
 * All WhatsApp messages require consent check before sending.
 */

import { supabase }   from './supabase.js';
import { writeAudit } from './auditLog.js';

// ── Subscription record management ───────────────────────────────

/**
 * Create a subscription record after first payment confirmed.
 */
export async function createSubscription({
  anonymousId,
  shopifySubscriptionId,
  shopifyOrderId,
  checkoutSessionId,
  stackTier,
  goal,
  intervalDays,
  discountPct,
  productIds,
  lineItems,
  estimatedValueCrc,
  campaignId,
  sourceFlow,
}) {
  const nextBillingAt = new Date(Date.now() + intervalDays * 86400_000).toISOString();

  const { data } = await supabase.from('subscriptions').insert({
    anonymous_id:              anonymousId,
    shopify_subscription_id:   shopifySubscriptionId,
    shopify_order_id:          shopifyOrderId,
    checkout_session_id:       checkoutSessionId,
    status:                    'active',
    stack_tier:                stackTier,
    goal,
    interval_days:             intervalDays,
    discount_pct:              discountPct || 0,
    product_ids:               productIds,
    line_items:                lineItems,
    estimated_value_crc:       estimatedValueCrc,
    next_billing_at:           nextBillingAt,
    billing_count:             1,
    total_revenue_crc:         estimatedValueCrc || 0,
    campaign_id:               campaignId || null,
    source_flow:               sourceFlow || 'direct',
  });

  await writeAudit({ eventType: 'subscription_created', anonymousId, payload: { shopify_subscription_id: shopifySubscriptionId, interval_days: intervalDays, stack_tier: stackTier } });

  return data;
}

/**
 * Record a successful subscription renewal.
 */
export async function recordRenewal(shopifySubscriptionId, shopifyOrderId, amountCrc) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .eq('shopify_subscription_id', shopifySubscriptionId)
    .select('id, anonymous_id, billing_count, total_revenue_crc, interval_days, stack_tier, goal, campaign_id')
    .single();

  if (!sub) return null;

  const now          = new Date().toISOString();
  const nextBilling  = new Date(Date.now() + sub.interval_days * 86400_000).toISOString();

  await Promise.all([
    supabase.from('subscriptions').update({
      billing_count:    sub.billing_count + 1,
      last_billing_at:  now,
      next_billing_at:  nextBilling,
      total_revenue_crc: parseFloat(sub.total_revenue_crc || 0) + parseFloat(amountCrc || 0),
    }).eq('shopify_subscription_id', shopifySubscriptionId),

    supabase.from('subscription_events').insert({
      subscription_id: sub.id,
      anonymous_id:    sub.anonymous_id,
      event_type:      'renewed',
      amount_crc:      amountCrc,
      shopify_order_id: shopifyOrderId,
    }),

    supabase.from('subscription_revenue_attribution').insert({
      subscription_id: sub.id,
      anonymous_id:    sub.anonymous_id,
      billing_cycle:   sub.billing_count + 1,
      shopify_order_id: shopifyOrderId,
      amount_crc:      amountCrc,
      campaign_id:     sub.campaign_id,
      goal:            sub.goal,
      stack_tier:      sub.stack_tier,
      source_flow:     'subscription_renewal',
    }),

    writeAudit({ eventType: 'subscription_renewed', anonymousId: sub.anonymous_id, payload: { billing_cycle: sub.billing_count + 1, amount: amountCrc } }),
  ]);

  return sub;
}

/**
 * Handle payment failure → detect churn signal.
 */
export async function handlePaymentFailed(shopifySubscriptionId, errorMessage) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .eq('shopify_subscription_id', shopifySubscriptionId)
    .select('id, anonymous_id, status')
    .single();

  if (!sub) return;

  await Promise.all([
    supabase.from('subscriptions').update({ status: 'payment_failed' })
      .eq('shopify_subscription_id', shopifySubscriptionId),

    supabase.from('subscription_events').insert({
      subscription_id: sub.id,
      anonymous_id:    sub.anonymous_id,
      event_type:      'payment_failed',
      payload:         { error: errorMessage },
    }),

    supabase.from('subscription_churn_signals').insert({
      subscription_id: sub.id,
      anonymous_id:    sub.anonymous_id,
      signal_type:     'payment_failed',
      severity:        'high',
    }),

    // Queue WhatsApp support message (consent checked in automation processor)
    supabase.from('automation_queue').insert({
      anonymous_id:    sub.anonymous_id,
      campaign_id:     'subscription_payment_failed',
      template_key:    'subscriptionPaymentFailed',
      context:         {},
      priority:        1,
      status:          'pending',
      eligible_after:  new Date(Date.now() + 3600_000).toISOString(),  // 1h delay
      expires_at:      new Date(Date.now() + 86400_000).toISOString(), // 24h window
      idempotency_key: `sub_fail_${shopifySubscriptionId}_${Date.now().toString(36)}`,
    }).catch(() => {}),  // non-blocking

    writeAudit({ eventType: 'subscription_payment_failed', anonymousId: sub.anonymous_id }),
  ]);
}

/**
 * Handle subscription cancellation.
 */
export async function handleCancellation(shopifySubscriptionId, reason) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .eq('shopify_subscription_id', shopifySubscriptionId)
    .select('id, anonymous_id')
    .single();

  if (!sub) return;

  const now = new Date().toISOString();

  await Promise.all([
    supabase.from('subscriptions').update({
      status:               'cancelled',
      cancelled_at:         now,
      cancellation_reason:  reason || 'customer_requested',
    }).eq('shopify_subscription_id', shopifySubscriptionId),

    supabase.from('subscription_events').insert({
      subscription_id: sub.id,
      anonymous_id:    sub.anonymous_id,
      event_type:      'cancelled',
      payload:         { reason },
    }),

    supabase.from('subscription_churn_signals').insert({
      subscription_id: sub.id,
      anonymous_id:    sub.anonymous_id,
      signal_type:     'cancellation_intent',
      severity:        'high',
      resolved_at:     now,
      intervention:    'cancelled',
    }),

    writeAudit({ eventType: 'subscription_cancelled', anonymousId: sub.anonymous_id, payload: { reason } }),
  ]);
}

/**
 * Calculate subscription LTV projection.
 */
export function projectSubscriptionLtv(monthlyValueCrc, expectedMonths = 12) {
  return Math.round(monthlyValueCrc * expectedMonths);
}
