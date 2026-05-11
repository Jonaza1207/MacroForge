/**
 * MacroForge — Shopify Subscription Checkout
 * POST /api/shopify/subscription
 *
 * Creates a Shopify subscription checkout (draft order with Selling Plan).
 * Returns a hosted Shopify checkout URL where customer subscribes.
 *
 * Flow:
 *   Frontend → POST /api/shopify/subscription
 *   → Validate payload
 *   → Check subscription enabled
 *   → Check Shopify health
 *   → Map products to Shopify variants
 *   → Get Selling Plan ID for (interval, tier)
 *   → Attach selling plan to line items
 *   → Create draft order (subscription checkout)
 *   → Record in checkout_sessions + subscription_offer_logs
 *   → Return { checkout_url, interval, discount }
 *
 * Security:
 *   - Shopify Admin credentials: backend-only (Vercel env vars)
 *   - Selling Plan IDs: looked up from Supabase (not from frontend)
 *   - Frontend only sends: product_ids, interval_preference, anonymous_id, metadata
 *
 * PCI compliance:
 *   - MacroForge never handles card data
 *   - Shopify manages subscription billing securely
 */

import { validateDraftOrderPayload, checkShopifyEnabled, generateCheckoutIdempotencyKey, checkCheckoutIdempotency } from '../../lib/backend/shopifyValidation.js';
import { mapProductsToLineItems }              from '../../lib/backend/shopifyMapping.js';
import { getSellingPlanId, isSubscriptionEnabled, attachSellingPlanToLineItems, getTierDiscount, getRecommendedInterval } from '../../lib/backend/shopifySellingPlans.js';
import { createDraftOrder, checkShopifyHealth } from '../../lib/backend/shopify.js';
import { buildOrderTags, buildNoteAttributes, buildOrderNote, recordCheckoutCreated } from '../../lib/backend/shopifyAttribution.js';
import { hashIp }       from '../../lib/backend/security.js';
import { writeAudit }   from '../../lib/backend/auditLog.js';
import { supabase }     from '../../lib/backend/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // ── 1. Validate payload ───────────────────────────────────────
  const validation = validateDraftOrderPayload(body);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Validation failed', details: validation.errors });
  }

  const { anonymous_id, product_ids, catalog_data = {}, stack_metadata = {}, attribution = {}, interval_preference } = body;

  // ── 2. Check subscription + Shopify enabled ───────────────────
  const [subscriptionEnabled, shopifyEnabled] = await Promise.all([
    isSubscriptionEnabled(),
    checkShopifyEnabled(),
  ]);

  if (!subscriptionEnabled || !shopifyEnabled.enabled) {
    return res.status(200).json({
      status:   'subscription_unavailable',
      fallback: 'whatsapp',
      message:  'La suscripción automática no está disponible aún. Podés consultar por WhatsApp para armarla manualmente.',
    });
  }

  // ── 3. Shopify health ─────────────────────────────────────────
  const health = await checkShopifyHealth();
  if (!health.ok) {
    return res.status(200).json({
      status:   'shopify_unavailable',
      fallback: 'whatsapp',
      message:  'Servicio temporalmente inactivo. Por favor usá WhatsApp.',
    });
  }

  // ── 4. Map products to Shopify variants ───────────────────────
  let lineItems, mapped, unmapped;
  try {
    ({ lineItems, mapped, unmapped } = await mapProductsToLineItems(product_ids, catalog_data));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (lineItems.length === 0) {
    return res.status(200).json({
      status:   'no_variants_mapped',
      fallback: 'whatsapp',
      message:  'Productos no disponibles para suscripción aún. Consultá por WhatsApp.',
    });
  }

  // ── 5. Determine interval + discount ─────────────────────────
  const stackTier      = stack_metadata.stack_tier || 'esencial';
  const supplyDays     = stack_metadata.supply_days || null;
  const recommended    = getRecommendedInterval(supplyDays);
  const intervalDays   = interval_preference || recommended.days;
  const discountPct    = getTierDiscount(stackTier);

  // ── 6. Get Selling Plan ID ────────────────────────────────────
  const sellingPlan = await getSellingPlanId(intervalDays, stackTier);
  if (!sellingPlan) {
    return res.status(200).json({
      status:   'no_selling_plan',
      fallback: 'whatsapp',
      message:  `No hay plan de suscripción configurado para ${intervalDays} días. Consultá por WhatsApp.`,
    });
  }

  // ── 7. Idempotency ────────────────────────────────────────────
  const idempotencyKey = `sub_${generateCheckoutIdempotencyKey(anonymous_id, product_ids)}`;
  const dupCheck       = await checkCheckoutIdempotency(idempotencyKey);
  if (dupCheck.duplicate && dupCheck.status !== 'abandoned') {
    return res.status(200).json({
      status:       'checkout_exists',
      checkout_url: dupCheck.checkout_url,
    });
  }

  // ── 8. Attach Selling Plan to line items ──────────────────────
  const subscriptionLineItems = attachSellingPlanToLineItems(
    lineItems,
    Number(sellingPlan.shopify_selling_plan_id)
  );

  // ── 9. Build draft order (subscription checkout) ──────────────
  const tags          = buildOrderTags({ ...stack_metadata, ...attribution, is_subscription: true });
  const noteAttrs     = buildNoteAttributes({ anonymous_id, ...stack_metadata, ...attribution, interval_days: intervalDays, discount_pct: discountPct });
  const note          = buildOrderNote({ ...stack_metadata, interval_days: intervalDays, subscription: true }, unmapped);

  let draftOrder;
  try {
    const response = await createDraftOrder({
      line_items:       subscriptionLineItems,
      note,
      note_attributes:  noteAttrs,
      tags:             [...tags, 'subscription', `interval_${intervalDays}d`].join(','),
    });
    draftOrder = response.draft_order;
  } catch (err) {
    console.error('[MacroForge Subscription] Draft order failed:', err.message);
    await writeAudit({ eventType: 'subscription_draft_order_failed', anonymousId: anonymous_id, payload: { error: err.message } });
    return res.status(200).json({
      status:   'shopify_error',
      fallback: 'whatsapp',
      message:  'No pudimos procesar la suscripción. Por favor usá WhatsApp.',
    });
  }

  // ── 10. Record session + offer log ────────────────────────────
  const estimatedTotal = stack_metadata.estimated_total || 0;
  await Promise.all([
    recordCheckoutCreated({
      anonymousId:    anonymous_id,
      draftOrderId:   draftOrder.id,
      checkoutUrl:    draftOrder.invoice_url,
      lineItems:      subscriptionLineItems,
      productIds:     product_ids,
      estimatedTotal,
      stackMetadata:  { ...stack_metadata, is_subscription: true, interval_days: intervalDays },
      attribution,
      riskScore:      0,
      idempotencyKey,
    }),
    supabase.from('subscription_offer_logs').insert({
      anonymous_id:    anonymous_id,
      offer_type:      'checkout_upsell',
      stack_tier:      stackTier,
      interval_days:   intervalDays,
      discount_pct:    discountPct,
      clicked_at:      new Date().toISOString(),
    }),
  ]);

  await writeAudit({ eventType: 'subscription_checkout_created', anonymousId: anonymous_id, payload: { draft_id: draftOrder.id, interval: intervalDays, discount: discountPct } });

  // ── 11. Return subscription checkout URL ──────────────────────
  return res.status(200).json({
    status:       'subscription_checkout_created',
    checkout_url: draftOrder.invoice_url,
    subscription: {
      interval_days:  intervalDays,
      interval_label: `Cada ${intervalDays} días`,
      discount_pct:   discountPct,
      discount_label: `${discountPct}% de descuento`,
      stack_tier:     stackTier,
    },
    unmapped_fallback: unmapped.length > 0 ? {
      message:  `${unmapped.length} producto(s) no disponibles en suscripción. Se agregarán cuando estén activos.`,
    } : null,
  });
}
