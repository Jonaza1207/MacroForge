/**
 * MacroForge — Shopify Draft Order Creation
 * POST /api/shopify/draft-order
 *
 * The central Shopify commerce endpoint.
 * Creates a Shopify draft order from a MacroForge stack and
 * returns a hosted Shopify checkout URL for direct payment.
 *
 * Flow:
 *   Frontend stack → POST /api/shopify/draft-order
 *   → Validate payload
 *   → Check kill switch + Shopify health
 *   → Map products to Shopify variants
 *   → Risk scoring
 *   → High risk? → WhatsApp concierge routing
 *   → Check idempotency (prevent duplicate draft orders)
 *   → Create Shopify draft order
 *   → Store in checkout_sessions table
 *   → Return { checkout_url, session_id, status }
 *
 * Security:
 *   - Shopify Admin API token: SHOPIFY_ADMIN_API_TOKEN env var (never frontend)
 *   - All Shopify API calls: server-side only
 *   - PCI: MacroForge never handles card data
 *   - Input: validated + sanitized
 *   - Idempotent: same stack in same hour → same checkout URL
 *
 * MacroForge products catalog is passed in the request body (product_ids).
 * The backend maps these to Shopify variant IDs from Supabase.
 */

import { validateDraftOrderPayload, checkShopifyEnabled, generateCheckoutIdempotencyKey, checkCheckoutIdempotency } from '../../lib/backend/shopifyValidation.js';
import { mapProductsToLineItems }     from '../../lib/backend/shopifyMapping.js';
import { calculateRiskScore, getRiskRoutingStrategy } from '../../lib/backend/shopifyRisk.js';
import { createDraftOrder, checkShopifyHealth, ShopifyError } from '../../lib/backend/shopify.js';
import { buildOrderTags, buildNoteAttributes, buildOrderNote, recordCheckoutCreated } from '../../lib/backend/shopifyAttribution.js';
import { hashIp, errorResponse }      from '../../lib/backend/security.js';
import { writeAudit }                 from '../../lib/backend/auditLog.js';
import { supabase }                   from '../../lib/backend/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── 1. Parse + validate payload ──────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const validation = validateDraftOrderPayload(body);
  if (!validation.valid) {
    return res.status(400).json({ error: 'Validation failed', details: validation.errors });
  }

  const {
    anonymous_id,
    product_ids,
    stack_metadata = {},
    attribution    = {},
  } = body;

  const ipHash = hashIp(req.headers['x-real-ip'] || req.headers['x-forwarded-for']);

  // ── 2. Check kill switch + Shopify enabled ────────────────────
  const enabledCheck = await checkShopifyEnabled();
  if (!enabledCheck.enabled) {
    // Graceful degradation: tell frontend to use WhatsApp
    return res.status(200).json({
      status:       'shopify_unavailable',
      reason:       enabledCheck.reason,
      fallback:     'whatsapp',
      message:      'El checkout directo no está disponible temporalmente. Por favor usá WhatsApp.',
    });
  }

  // ── 3. Check Shopify API health ───────────────────────────────
  const health = await checkShopifyHealth();
  if (!health.ok) {
    await writeAudit({ eventType: 'shopify_health_failed', payload: { status: health.status, latency: health.latencyMs } });
    return res.status(200).json({
      status:   'shopify_unavailable',
      reason:   'provider_health',
      fallback: 'whatsapp',
      message:  'Servicio de pago temporalmente inactivo. Por favor usá WhatsApp.',
    });
  }

  // ── 4. Load product catalog data (from Supabase for mapping) ─
  // We need product URL data to extract slugs for Shopify variant mapping.
  // In production, frontend sends product_ids; we look up catalog from DB.
  // For now, fetch from Supabase or accept catalog_data in body.
  const catalogData = body.catalog_data || {};  // frontend can optionally send product URL/name data

  // ── 5. Map products to Shopify variant IDs ─────────────────────
  let lineItems, mapped, unmapped;
  try {
    ({ lineItems, mapped, unmapped } = await mapProductsToLineItems(product_ids, catalogData));
  } catch (err) {
    if (err instanceof ShopifyError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }

  if (lineItems.length === 0) {
    return res.status(200).json({
      status:    'no_variants_mapped',
      reason:    'Products not yet in Shopify catalog',
      fallback:  'whatsapp',
      unmapped:  unmapped.map(u => u.slug),
      message:   'Productos no disponibles aún en checkout directo. Por favor usá WhatsApp.',
    });
  }

  // ── 6. Risk scoring ───────────────────────────────────────────
  const estimatedTotal = stack_metadata.estimated_total || 0;
  const riskResult     = await calculateRiskScore({ anonymous_id, lineItems, estimatedTotal, ipHash });
  const riskRouting    = getRiskRoutingStrategy(riskResult);

  // Route high-risk orders to WhatsApp concierge
  if (riskRouting.strategy === 'whatsapp_concierge') {
    await writeAudit({ eventType: 'checkout_high_risk_routed', anonymousId: anonymous_id, payload: { risk_score: riskResult.score, signals: riskResult.signals } });
    return res.status(200).json({
      status:    'high_risk_routing',
      fallback:  'whatsapp_concierge',
      message:   riskRouting.message,
      risk_level: riskResult.level,
    });
  }

  // ── 7. Idempotency check ──────────────────────────────────────
  const idempotencyKey = generateCheckoutIdempotencyKey(anonymous_id, product_ids);
  const dupCheck       = await checkCheckoutIdempotency(idempotencyKey);

  if (dupCheck.duplicate && dupCheck.status !== 'abandoned') {
    // Return existing checkout URL (don't create duplicate draft order)
    return res.status(200).json({
      status:       'checkout_exists',
      checkout_url: dupCheck.checkout_url,
      session_status: dupCheck.status,
    });
  }

  // ── 8. Build draft order payload ──────────────────────────────
  const tags       = buildOrderTags({ ...stack_metadata, ...attribution });
  const noteAttrs  = buildNoteAttributes({ anonymous_id, ...stack_metadata, ...attribution });
  const note       = buildOrderNote(stack_metadata, unmapped);

  const draftOrderInput = {
    line_items:        lineItems,
    note,
    note_attributes:   noteAttrs,
    tags:              tags.join(','),
    // DO NOT add customer email/phone here — customer fills in Shopify checkout
    // DO NOT add payment info — Shopify handles all payment securely
    use_customer_default_address: false,
  };

  // ── 9. Create Shopify draft order ─────────────────────────────
  let draftOrder;
  try {
    const response = await createDraftOrder(draftOrderInput);
    draftOrder     = response.draft_order;
  } catch (err) {
    console.error('[MacroForge Shopify] Draft order creation failed:', err.message);
    await writeAudit({ eventType: 'shopify_draft_order_failed', anonymousId: anonymous_id, payload: { error: err.message } });

    return res.status(200).json({
      status:   'shopify_error',
      fallback: 'whatsapp',
      message:  'No pudimos procesar el checkout directo. Por favor usá WhatsApp.',
    });
  }

  // ── 10. Record in Supabase ────────────────────────────────────
  await recordCheckoutCreated({
    anonymousId:    anonymous_id,
    draftOrderId:   draftOrder.id,
    checkoutUrl:    draftOrder.invoice_url,  // Shopify hosted checkout URL
    lineItems,
    productIds:     product_ids,
    estimatedTotal,
    stackMetadata:  stack_metadata,
    attribution,
    riskScore:      riskResult.score,
    idempotencyKey,
  });

  await writeAudit({ eventType: 'shopify_draft_order_created', anonymousId: anonymous_id, payload: { draft_id: draftOrder.id, line_items: lineItems.length } });

  // ── 11. Return checkout URL ───────────────────────────────────
  return res.status(200).json({
    status:       'checkout_created',
    checkout_url: draftOrder.invoice_url,  // Shopify's hosted, PCI-compliant checkout
    session_id:   idempotencyKey,
    products: {
      mapped:   mapped.length,
      unmapped: unmapped.length,
    },
    // Note: unmapped products should be offered via WhatsApp as supplementary
    unmapped_fallback: unmapped.length > 0 ? {
      message: `${unmapped.length} producto(s) adicionales disponibles por WhatsApp.`,
      products: unmapped.map(u => u.name || u.slug),
    } : null,
  });
}
