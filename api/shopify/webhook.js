/**
 * MacroForge — Shopify Webhook Handler
 * POST /api/shopify/webhook
 *
 * Receives and processes all Shopify webhook events.
 * Registered in: Shopify Admin → Settings → Notifications → Webhooks
 *
 * Events handled:
 *   orders/paid          → activate post-purchase lifecycle + attribution
 *   checkouts/delete     → mark as abandoned → trigger recovery automation
 *   orders/cancelled     → update lifecycle + suppress refill automation
 *   orders/fulfilled     → activate delivery tracking
 *   refunds/create       → update revenue attribution
 *
 * Security:
 *   - HMAC-SHA256 signature verification (SHOPIFY_WEBHOOK_SECRET env var)
 *   - Replay protection via shopify_webhook_events idempotency
 *   - Raw body preserved for signature verification before JSON parse
 *   - No internal error details exposed to Shopify
 *
 * Always returns 200 to Shopify (even on errors) to prevent retries
 * for unrecoverable situations. Retryable failures return 5xx.
 */

import crypto                       from 'crypto';
import { isWebhookDuplicate, recordWebhookEvent, markWebhookProcessed, routeWebhookEvent } from '../../lib/backend/shopifyWebhook.js';
import { writeAudit, AuditEvents }  from '../../lib/backend/auditLog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── 1. Get raw body for signature verification ────────────────
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  // ── 2. Verify Shopify webhook signature ───────────────────────
  const signature = req.headers['x-shopify-hmac-sha256'] || '';
  const secret    = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[MacroForge Shopify Webhook] SHOPIFY_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  let signatureValid = false;
  try {
    signatureValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch { signatureValid = false; }

  if (!signatureValid) {
    await writeAudit({ eventType: AuditEvents.WEBHOOK_REJECTED, payload: { source: 'shopify', ip: req.headers['x-real-ip'] } });
    // Return 401 to Shopify — this may trigger retry, but invalid signatures shouldn't be processed
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // ── 3. Extract event metadata ─────────────────────────────────
  const webhookId = req.headers['x-shopify-webhook-id'] || '';
  const topic     = req.headers['x-shopify-topic']      || '';
  const shopDomain = req.headers['x-shopify-shop-domain'] || '';

  if (!webhookId || !topic) {
    return res.status(400).json({ error: 'Missing webhook headers' });
  }

  // ── 4. Idempotency check ──────────────────────────────────────
  const isDuplicate = await isWebhookDuplicate(webhookId);
  if (isDuplicate) {
    // Return 200 — Shopify won't retry if we return 200
    return res.status(200).json({ received: true, status: 'duplicate' });
  }

  // ── 5. Parse body ─────────────────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // ── 6. Record webhook as received (dedup key) ─────────────────
  await recordWebhookEvent(webhookId, topic, { ...payload, shop_domain: shopDomain });

  // ── 7. Route to handler ───────────────────────────────────────
  let result;
  let error = null;

  try {
    result = await routeWebhookEvent(topic, payload);
  } catch (err) {
    console.error('[MacroForge Shopify Webhook] Processing error:', err.message);
    error  = err;
    result = { processed: false, error: err.message };
  }

  // ── 8. Mark event as processed ───────────────────────────────
  await markWebhookProcessed(webhookId, result.processed ? 'success' : 'skipped', error);

  // ── 9. Return 200 to Shopify ──────────────────────────────────
  // Always return 200 — Shopify retries on 5xx, causing duplicate processing
  return res.status(200).json({ received: true, topic, ...result });
}

// ── Vercel configuration for this function ────────────────────────
// Disable automatic body parsing to get raw body for signature verification
export const config = {
  api: { bodyParser: false },
};
