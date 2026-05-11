/**
 * MacroForge — 360dialog Provider Adapter
 *
 * Phase 9 — Vercel Backend Activation
 * SERVER-SIDE ONLY.
 *
 * Required env vars (Vercel project settings — NEVER frontend):
 *   WHATSAPP_API_KEY      — your 360dialog API key
 *   WHATSAPP_PHONE_ID     — your WhatsApp Business Account phone number ID
 *   WHATSAPP_WEBHOOK_SECRET — for signature verification
 *
 * Template requirement:
 *   All templates must be pre-approved via Meta Business Manager.
 *   Upload templates via 360dialog partner portal.
 *   Template names must match TEMPLATE_MAP below.
 *
 * Template approval timeline: 24–72 hours.
 * Templates are per-language — Spanish (es) templates for Costa Rica.
 *
 * 360dialog documentation: https://docs.360dialog.com/
 */

import crypto from 'crypto';

// ── Template name mapping ─────────────────────────────────────────
// Maps MacroForge template keys → approved Meta template names
// Template names are set in Meta Business Manager and must be exact
const TEMPLATE_MAP = {
  abandonedStack:       'macroforge_abandoned_stack',
  refillReminder:       'macroforge_refill_reminder',
  vipReorder:           'macroforge_vip_reorder',
  loyaltyFollowup:      'macroforge_loyalty_followup',
  premiumReactivation:  'macroforge_premium_reactivation',
};

const BASE_URL  = 'https://waba.360dialog.io/v1';
const LANG_CODE = 'es';

export class Dialog360Adapter {
  constructor({ useBackupKey = false } = {}) {
    this.apiKey   = useBackupKey
      ? process.env.BACKUP_WHATSAPP_API_KEY
      : process.env.WHATSAPP_API_KEY;
    this.phoneId  = process.env.WHATSAPP_PHONE_ID;

    if (!this.apiKey) {
      throw new Error('[360dialog] WHATSAPP_API_KEY not configured in Vercel env vars.');
    }
  }

  // ── sendMessage ─────────────────────────────────────────────────
  async sendMessage({ to, templateKey, context, language = LANG_CODE }) {
    const templateName = TEMPLATE_MAP[templateKey];
    if (!templateName) {
      throw Object.assign(
        new Error(`[360dialog] No approved template for key: ${templateKey}`),
        { providerCode: 'template_not_approved' }
      );
    }

    const components = buildTemplateComponents(context);

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name:       templateName,
        language:   { code: language },
        components: components.length > 0 ? components : undefined,
      },
    };

    const startTime = Date.now();
    const res = await fetch(`${BASE_URL}/messages`, {
      method:  'POST',
      headers: {
        'D360-API-KEY':  this.apiKey,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startTime;
    const data      = await res.json();

    if (!res.ok) {
      const err = Object.assign(
        new Error(data?.error?.message || `360dialog API error ${res.status}`),
        { httpStatus: res.status, providerResponse: data }
      );
      throw err;
    }

    return {
      messageId:  data.messages?.[0]?.id,
      status:     'sent',
      provider:   '360dialog',
      latencyMs,
      raw:        data,
    };
  }

  // ── Webhook verification ─────────────────────────────────────────
  validateWebhook(req, rawBody) {
    const signature = req.headers['x-hub-signature-256'] || '';
    const secret    = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!secret || !signature) return false;

    const expected = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch { return false; }
  }

  // ── Webhook parsing ──────────────────────────────────────────────
  parseWebhookEvent(body) {
    const entry   = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    if (!value) return null;

    // Status update (delivery receipt)
    const status = value.statuses?.[0];
    if (status) {
      return {
        type:           'status',
        messageId:      status.id,
        phoneNumber:    status.recipient_id,
        status:         this.normalizeDeliveryStatus(status.status),
        timestamp:      status.timestamp,
      };
    }

    // Inbound message (reply or STOP)
    const message = value.messages?.[0];
    if (message) {
      return {
        type:        'message',
        phoneNumber: message.from,
        messageId:   message.id,
        text:        message.text?.body || '',
        timestamp:   message.timestamp,
        isStop:      this.isStopCommand({ text: message.text?.body }),
      };
    }

    return null;
  }

  // ── Status normalization ─────────────────────────────────────────
  normalizeDeliveryStatus(rawStatus) {
    const map = {
      sent:      'sent',
      delivered: 'delivered',
      read:      'read',
      failed:    'failed',
    };
    return map[rawStatus] || 'sent';
  }

  // ── STOP detection ───────────────────────────────────────────────
  isStopCommand(event) {
    const text = (event?.text || '').trim().toUpperCase();
    return ['STOP', 'DETENER', 'CANCELAR', 'BAJA', 'NO MÁS', 'NO MAS'].includes(text);
  }

  // ── Provider health check ────────────────────────────────────────
  async getProviderHealth() {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/configs/templates`, {
        headers: { 'D360-API-KEY': this.apiKey },
        signal: AbortSignal.timeout(5000),  // 5s timeout
      });
      return { latencyMs: Date.now() - start, status: res.ok ? 'healthy' : 'degraded', httpStatus: res.status };
    } catch (err) {
      return { latencyMs: Date.now() - start, status: 'down', error: err.message };
    }
  }
}

// ── Template component builder ────────────────────────────────────
// Maps MacroForge context → 360dialog template component format
function buildTemplateComponents(context = {}) {
  const params = [];

  if (context.stack_name)   params.push({ type: 'text', text: context.stack_name });
  if (context.tier_label)   params.push({ type: 'text', text: context.tier_label });
  if (context.product_name) params.push({ type: 'text', text: context.product_name });

  if (params.length === 0) return [];

  return [{
    type:       'body',
    parameters: params,
  }];
}
