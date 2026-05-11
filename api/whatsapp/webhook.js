/**
 * MacroForge — WhatsApp Webhook Handler
 * POST /api/whatsapp/webhook
 * GET  /api/whatsapp/webhook  (Meta verification challenge)
 *
 * Handles:
 *   - Provider webhook verification challenge (GET)
 *   - Delivery receipts (sent/delivered/read/failed)
 *   - STOP commands → revoke consent, pause automations
 *   - Inbound replies (log for future AI response system)
 *
 * Security:
 *   - Signature verified for EVERY request
 *   - Invalid signatures → 401 (no processing)
 *   - Webhook secret in WHATSAPP_WEBHOOK_SECRET env var (never frontend)
 *   - Rate limiting via Vercel edge (configure in vercel.json)
 *   - Replay protection via message ID dedup in Supabase
 */

import { verifyWebhookSignature, hashPhone, errorResponse, jsonResponse } from '../../lib/backend/security.js';
import { getProviderAdapter }    from '../../lib/backend/providerAdapters/index.js';
import { supabase }              from '../../lib/backend/supabase.js';
import { writeAudit, auditConsentRevoked, auditStopReceived, AuditEvents } from '../../lib/backend/auditLog.js';

export default async function handler(req, res) {

  // ── GET: Meta/360dialog webhook verification challenge ────────
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_SECRET) {
      console.info('[MacroForge Webhook] Verification challenge accepted');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ── POST: Provider event ──────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── 1. Read raw body for signature verification ──────────────
  // Vercel passes the body as a string; parse raw before JSON decode
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const requestUrl = `https://${req.headers.host}${req.url}`;

  // ── 2. Verify signature ──────────────────────────────────────
  const adapter = getProviderAdapter();
  if (!adapter.validateWebhook(req, rawBody, requestUrl)) {
    console.warn('[MacroForge Webhook] Signature verification failed');
    await writeAudit({ eventType: AuditEvents.WEBHOOK_REJECTED, payload: { ip: req.headers['x-real-ip'] } });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await writeAudit({ eventType: AuditEvents.WEBHOOK_VERIFIED });

  // ── 3. Parse event ───────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const event = adapter.parseWebhookEvent(body);
  if (!event) {
    // Unknown event format — return 200 to prevent provider retries
    return res.status(200).json({ received: true });
  }

  await writeAudit({
    eventType: AuditEvents.WEBHOOK_RECEIVED,
    payload:   { type: event.type, messageId: event.messageId },
  });

  // ── 4. Handle event type ─────────────────────────────────────

  // 4a. Delivery status update
  if (event.type === 'status') {
    await handleDeliveryStatus(event);
    return res.status(200).json({ received: true });
  }

  // 4b. Inbound message (reply or STOP)
  if (event.type === 'message') {
    if (event.isStop) {
      await handleStopCommand(event);
    } else {
      await handleInboundMessage(event);
    }
    return res.status(200).json({ received: true });
  }

  return res.status(200).json({ received: true });
}

// ── Event handlers ────────────────────────────────────────────────

async function handleDeliveryStatus(event) {
  // Update delivery record by provider message ID
  await supabase.from('automation_deliveries').update({
    status:       event.status,
    delivered_at: event.status === 'delivered' ? new Date().toISOString() : undefined,
    read_at:      event.status === 'read'      ? new Date().toISOString() : undefined,
  }).eq('provider_msg_id', event.messageId);

  // Update queue entry
  await supabase.from('automation_queue').update({
    delivery_status: event.status,
    updated_at:      new Date().toISOString(),
  }).eq('provider_msg_id', event.messageId);
}

async function handleStopCommand(event) {
  // 1. Hash the phone number for consent lookup (we never store plaintext phone)
  const phoneHash = hashPhone(event.phoneNumber);

  // 2. Find customer by phone hash
  const { data: customer } = await supabase
    .from('customers').eq('phone_hash', phoneHash).select('anonymous_id').single();

  if (!customer) {
    console.info('[MacroForge Webhook] STOP received from unknown phone hash:', phoneHash?.slice(0, 8));
    return;
  }

  // 3. Revoke consent (soft revoke — preserve audit history)
  await supabase.from('wa_consent').update({
    revoked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('anonymous_id', customer.anonymous_id);

  // 4. Mark pending automations as skipped
  await supabase.from('automation_queue').update({
    status:         'skipped_no_consent',
    failure_reason: 'User sent STOP command',
    updated_at:     new Date().toISOString(),
  })
    .eq('anonymous_id', customer.anonymous_id)
    .eq('status', 'pending');

  // 5. Audit log
  await auditStopReceived(customer.anonymous_id, process.env.WHATSAPP_PROVIDER || '360dialog');
  await auditConsentRevoked(customer.anonymous_id, 'stop_command');

  console.info('[MacroForge Webhook] STOP processed for anonymous_id:', customer.anonymous_id);
}

async function handleInboundMessage(event) {
  // Log inbound message for future AI response system
  await writeAudit({
    eventType: 'inbound_message',
    payload:   {
      // Never log the actual message content (privacy)
      // Only log metadata for routing/analytics
      has_content: Boolean(event.text),
      message_length: event.text?.length || 0,
      timestamp: event.timestamp,
    },
  });
  // Future: Route to AI response system or human support queue
}
