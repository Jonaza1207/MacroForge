/**
 * MacroForge — Shopify Order Attribution + Tagging
 *
 * Phase 10 — Shopify Commerce Activation
 * SERVER-SIDE ONLY.
 *
 * Attaches MacroForge intelligence to every Shopify order:
 *   - Stack tier, goal, source flow → order tags
 *   - Anonymous ID, campaign → note attributes
 *   - Revenue → Supabase revenue_attribution table
 *
 * Tags enable future Shopify segmentation, Klaviyo flows, and
 * subscription targeting without custom app development.
 */

import { supabase } from './supabase.js';

// ── Order tag builder ─────────────────────────────────────────────

/**
 * Build Shopify order tags from MacroForge stack metadata.
 * Tags appear in Shopify admin and power future automation.
 */
export function buildOrderTags(metadata = {}) {
  const tags = ['macroforge'];

  if (metadata.stack_tier)   tags.push(`tier_${metadata.stack_tier}`);
  if (metadata.goal)         tags.push(`goal_${metadata.goal}`);
  if (metadata.source_flow)  tags.push(`src_${metadata.source_flow}`);
  if (metadata.campaign_id)  tags.push(`campaign_${metadata.campaign_id.replace('_', '-')}`);
  if (metadata.vip)          tags.push('vip_customer');
  if (metadata.stack_size) {
    if (metadata.stack_size >= 5)      tags.push('aov_premium');
    else if (metadata.stack_size >= 3) tags.push('aov_mid');
    else                               tags.push('aov_basic');
  }

  // Attribution source
  if (metadata.source_flow === 'automation_recovery') tags.push('recovered_order');
  if (metadata.is_refill)     tags.push('refill_order');
  if (metadata.repeat_buyer)  tags.push('repeat_buyer');

  return [...new Set(tags)];  // deduplicate
}

/**
 * Build Shopify note attributes from attribution data.
 * Note attributes are searchable in Shopify Admin.
 * NEVER include sensitive data (phone, email, payment info).
 */
export function buildNoteAttributes(metadata = {}) {
  const attrs = [];

  if (metadata.anonymous_id)  attrs.push({ name: 'mf_anonymous_id',  value: metadata.anonymous_id });
  if (metadata.stack_tier)    attrs.push({ name: 'mf_stack_tier',    value: metadata.stack_tier });
  if (metadata.goal)          attrs.push({ name: 'mf_goal',          value: metadata.goal });
  if (metadata.stack_size)    attrs.push({ name: 'mf_stack_size',    value: String(metadata.stack_size) });
  if (metadata.source_flow)   attrs.push({ name: 'mf_source',        value: metadata.source_flow });
  if (metadata.campaign_id)   attrs.push({ name: 'mf_campaign',      value: metadata.campaign_id });
  if (metadata.journey_state) attrs.push({ name: 'mf_journey_state', value: metadata.journey_state });

  return attrs;
}

/**
 * Build Shopify draft order note (visible in Admin order notes).
 */
export function buildOrderNote(metadata = {}, unmappedProducts = []) {
  const prefix = process.env.DRAFT_ORDER_NOTE_PREFIX || 'MacroForge Stack Builder | ';
  const parts  = [`${prefix}${metadata.stack_tier || 'Stack'}`];

  if (metadata.goal)       parts.push(`Goal: ${metadata.goal}`);
  if (metadata.source_flow) parts.push(`Source: ${metadata.source_flow}`);
  if (metadata.stack_size)  parts.push(`Stack size: ${metadata.stack_size}`);

  if (unmappedProducts.length > 0) {
    parts.push(`Note: ${unmappedProducts.length} product(s) unavailable for direct checkout — offered via WhatsApp.`);
  }

  return parts.join(' | ');
}

// ── Revenue attribution ───────────────────────────────────────────

/**
 * Record checkout session creation in Supabase.
 */
export async function recordCheckoutCreated({
  anonymousId,
  draftOrderId,
  checkoutUrl,
  lineItems,
  productIds,
  estimatedTotal,
  stackMetadata,
  attribution,
  riskScore,
  idempotencyKey,
}) {
  const { data } = await supabase.from('checkout_sessions').insert({
    anonymous_id:       anonymousId,
    shopify_draft_id:   draftOrderId,
    checkout_url:       checkoutUrl,
    status:             'created',
    stack_metadata:     stackMetadata,
    attribution,
    product_ids:        productIds,
    line_items:         lineItems,
    estimated_total:    estimatedTotal,
    risk_score:         riskScore || 0,
    risk_level:         riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
    idempotency_key:    idempotencyKey,
    expires_at:         new Date(Date.now() + 180 * 86400_000).toISOString(), // 180 days
  });
  return data;
}

/**
 * Record when a checkout URL is opened by the customer.
 */
export async function recordCheckoutOpened(draftOrderId) {
  await supabase.from('checkout_sessions').update({
    status:     'opened',
    opened_at:  new Date().toISOString(),
  }).eq('shopify_draft_id', draftOrderId);
}

/**
 * Record order payment (from order/paid webhook).
 * Updates both checkout_sessions and revenue_attribution.
 */
export async function recordOrderPaid({
  shopifyOrderId,
  draftOrderId,
  anonymousId,
  totalPrice,
  campaignId,
  stackTier,
  goal,
  sourceFlow,
}) {
  const now = new Date().toISOString();

  await Promise.all([
    // Update checkout session
    supabase.from('checkout_sessions').update({
      status:          'completed',
      shopify_order_id: shopifyOrderId,
      completed_at:    now,
    }).eq('shopify_draft_id', draftOrderId),

    // Update revenue attribution
    supabase.from('revenue_attribution').update({
      converted_at:   now,
      actual_value:   Math.round(totalPrice),
      order_id:       String(shopifyOrderId),
    }).eq('anonymous_id', anonymousId).is('converted_at', null),

    // Create Shopify order record
    supabase.from('shopify_orders').upsert({
      shopify_order_id: shopifyOrderId,
      anonymous_id:     anonymousId,
      status:          'paid',
      total_price:     totalPrice,
      stack_tier:      stackTier,
      goal,
      campaign_id:     campaignId || null,
      source_flow:     sourceFlow || 'direct',
      paid_at:         now,
    }, { onConflict: 'shopify_order_id' }),
  ]);
}

/**
 * Record checkout abandonment (draft order created but not paid).
 */
export async function recordCheckoutAbandoned(draftOrderId) {
  await supabase.from('checkout_sessions').update({
    status:       'abandoned',
    abandoned_at: new Date().toISOString(),
  }).eq('shopify_draft_id', draftOrderId)
    .neq('status', 'completed');
}

/**
 * Activate post-purchase lifecycle for a completed order.
 */
export async function activatePostPurchaseLifecycle({
  anonymousId,
  shopifyOrderId,
  goal,
  stackTier,
  productCategories,
}) {
  // Estimate supply duration (shortest cycle in the stack)
  const SUPPLY_DAYS_MAP = {
    'Creatinas': 30, 'Proteínas Whey': 30, 'Proteínas Isoladas': 30,
    'Pre-Entrenamientos': 45, 'Magnesio': 60, 'Gainers de Masa': 21,
    'Sueño y Relajación': 45, 'Multivitamínicos': 30, 'Omega y Grasas Saludables': 30,
  };

  let minSupplyDays = 30;  // default
  for (const cat of (productCategories || [])) {
    const days = SUPPLY_DAYS_MAP[cat];
    if (days && days < minSupplyDays) minSupplyDays = days;
  }

  const refillAt   = new Date(Date.now() + minSupplyDays * 0.75 * 86400_000).toISOString();
  const reorderAt  = new Date(Date.now() + minSupplyDays * 86400_000).toISOString();

  await supabase.from('post_purchase_lifecycle').insert({
    anonymous_id:          anonymousId,
    shopify_order_id:      shopifyOrderId,
    goal,
    stack_tier:            stackTier,
    product_categories:    productCategories || [],
    estimated_supply_days: minSupplyDays,
    refill_reminder_at:    refillAt,
    reorder_eligible_at:   reorderAt,
    reorder_status:       'pending',
  });
}
