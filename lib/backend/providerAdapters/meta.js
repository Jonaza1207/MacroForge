/**
 * MacroForge — Meta WhatsApp Cloud API Provider Adapter
 *
 * Phase 9 — Vercel Backend Activation
 * SERVER-SIDE ONLY.
 *
 * Required env vars (Vercel project settings — NEVER frontend):
 *   WHATSAPP_API_KEY      — Meta System User Access Token (PRIVATE)
 *   WHATSAPP_PHONE_ID     — Phone Number ID from Meta Business Manager
 *   META_APP_SECRET       — Meta App Secret (for webhook verification)
 *
 * Template management: Meta Business Manager → WhatsApp → Message Templates
 * API docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import crypto from 'crypto';

const TEMPLATE_MAP = {
  abandonedStack:       'macroforge_abandoned_stack',
  refillReminder:       'macroforge_refill_reminder',
  vipReorder:           'macroforge_vip_reorder',
  loyaltyFollowup:      'macroforge_loyalty_followup',
  premiumReactivation:  'macroforge_premium_reactivation',
};

export class MetaAdapter {
  constructor({ useBackupKey = false } = {}) {
    this.accessToken = useBackupKey
      ? process.env.BACKUP_WHATSAPP_API_KEY
      : process.env.WHATSAPP_API_KEY;
    this.phoneId     = process.env.WHATSAPP_PHONE_ID;
    this.appSecret   = process.env.META_APP_SECRET;
    this.apiVersion  = 'v17.0';

    if (!this.accessToken || !this.phoneId) {
      throw new Error('[Meta WABA] WHATSAPP_API_KEY and WHATSAPP_PHONE_ID required in Vercel env vars.');
    }
  }

  async sendMessage({ to, templateKey, context, language = 'es' }) {
    const templateName = TEMPLATE_MAP[templateKey];
    if (!templateName) {
      throw Object.assign(
        new Error(`[Meta WABA] No approved template for: ${templateKey}`),
        { providerCode: 'template_not_approved' }
      );
    }

    const url  = `https://graph.facebook.com/${this.apiVersion}/${this.phoneId}/messages`;
    const body = {
      messaging_product: 'whatsapp',
      to,
      type:     'template',
      template: {
        name:     templateName,
        language: { code: language },
        components: buildComponents(context),
      },
    };

    const startTime = Date.now();
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startTime;
    const data      = await res.json();

    if (!res.ok) {
      throw Object.assign(
        new Error(data?.error?.message || `Meta API error ${res.status}`),
        { httpStatus: res.status, providerResponse: data, providerCode: data?.error?.code }
      );
    }

    return {
      messageId:  data.messages?.[0]?.id,
      status:     'sent',
      provider:   'meta',
      latencyMs,
      raw:        data,
    };
  }

  validateWebhook(req, rawBody) {
    const signature = req.headers['x-hub-signature-256'] || '';
    if (!this.appSecret || !signature) return false;
    const expected = 'sha256=' + crypto.createHmac('sha256', this.appSecret).update(rawBody).digest('hex');
    try { return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)); }
    catch { return false; }
  }

  parseWebhookEvent(body) {
    const changes = body?.entry?.[0]?.changes?.[0]?.value;
    if (!changes) return null;

    const status = changes.statuses?.[0];
    if (status) {
      return {
        type:        'status',
        messageId:   status.id,
        phoneNumber: status.recipient_id,
        status:      this.normalizeDeliveryStatus(status.status),
        timestamp:   status.timestamp,
      };
    }

    const message = changes.messages?.[0];
    if (message) {
      return {
        type:        'message',
        phoneNumber: message.from,
        messageId:   message.id,
        text:        message.text?.body || '',
        isStop:      this.isStopCommand({ text: message.text?.body }),
      };
    }
    return null;
  }

  normalizeDeliveryStatus(raw) {
    const map = { sent: 'sent', delivered: 'delivered', read: 'read', failed: 'failed' };
    return map[raw] || 'sent';
  }

  isStopCommand(event) {
    const text = (event?.text || '').trim().toUpperCase();
    return ['STOP', 'DETENER', 'CANCELAR', 'BAJA', 'NO MÁS', 'NO MAS'].includes(text);
  }

  async getProviderHealth() {
    const start = Date.now();
    try {
      const res = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneId}`,
        { headers: { Authorization: `Bearer ${this.accessToken}` }, signal: AbortSignal.timeout(5000) }
      );
      return { latencyMs: Date.now() - start, status: res.ok ? 'healthy' : 'degraded' };
    } catch (err) {
      return { latencyMs: Date.now() - start, status: 'down', error: err.message };
    }
  }
}

function buildComponents(context = {}) {
  const params = [];
  if (context.stack_name)   params.push({ type: 'text', text: context.stack_name });
  if (context.tier_label)   params.push({ type: 'text', text: context.tier_label });
  if (context.product_name) params.push({ type: 'text', text: context.product_name });
  return params.length > 0 ? [{ type: 'body', parameters: params }] : [];
}
