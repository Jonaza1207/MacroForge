/**
 * MacroForge — Twilio WhatsApp Provider Adapter
 *
 * Phase 9 — Vercel Backend Activation
 * SERVER-SIDE ONLY.
 *
 * Required env vars (Vercel project settings — NEVER frontend):
 *   TWILIO_ACCOUNT_SID    — your Twilio Account SID
 *   TWILIO_AUTH_TOKEN     — your Twilio Auth Token (PRIVATE)
 *   TWILIO_WHATSAPP_FROM  — your Twilio WhatsApp number (e.g., whatsapp:+14155238886)
 *
 * Twilio Content Templates: https://www.twilio.com/docs/content
 * Content SIDs are created in the Twilio Console.
 */

import crypto from 'crypto';

const CONTENT_SID_MAP = {
  abandonedStack:       process.env.TWILIO_CONTENT_SID_ABANDONED_STACK      || '',
  refillReminder:       process.env.TWILIO_CONTENT_SID_REFILL_REMINDER       || '',
  vipReorder:           process.env.TWILIO_CONTENT_SID_VIP_REORDER           || '',
  loyaltyFollowup:      process.env.TWILIO_CONTENT_SID_LOYALTY_FOLLOWUP      || '',
  premiumReactivation:  process.env.TWILIO_CONTENT_SID_PREMIUM_REACTIVATION  || '',
};

export class TwilioAdapter {
  constructor({ useBackupKey = false } = {}) {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken  = useBackupKey
      ? process.env.BACKUP_TWILIO_AUTH_TOKEN
      : process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM;

    if (!this.accountSid || !this.authToken) {
      throw new Error('[Twilio] TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required in Vercel env vars.');
    }
  }

  async sendMessage({ to, templateKey, context }) {
    const contentSid = CONTENT_SID_MAP[templateKey];
    if (!contentSid) {
      throw Object.assign(
        new Error(`[Twilio] No Content SID for template: ${templateKey}`),
        { providerCode: 'template_not_approved' }
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const formData = new URLSearchParams({
      To:          `whatsapp:${to}`,
      From:        this.fromNumber,
      ContentSid:  contentSid,
      ContentVariables: JSON.stringify(buildVariables(context)),
    });

    const startTime = Date.now();
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const latencyMs = Date.now() - startTime;
    const data      = await res.json();

    if (!res.ok) {
      throw Object.assign(
        new Error(data?.message || `Twilio API error ${res.status}`),
        { httpStatus: res.status, providerResponse: data }
      );
    }

    return {
      messageId:  data.sid,
      status:     'sent',
      provider:   'twilio',
      latencyMs,
      raw:        data,
    };
  }

  validateWebhook(req, rawBody) {
    const signature  = req.headers['x-twilio-signature'] || '';
    const requestUrl = req.headers['x-forwarded-proto'] + '://' + req.headers['host'] + req.url;
    const expected   = crypto
      .createHmac('sha1', this.authToken)
      .update(requestUrl + rawBody)
      .digest('base64');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch { return false; }
  }

  parseWebhookEvent(body) {
    if (body.MessageStatus) {
      return {
        type:        'status',
        messageId:   body.SmsSid || body.MessageSid,
        phoneNumber: body.To?.replace('whatsapp:', ''),
        status:      this.normalizeDeliveryStatus(body.MessageStatus),
        timestamp:   Math.floor(Date.now() / 1000).toString(),
      };
    }
    if (body.Body) {
      return {
        type:        'message',
        phoneNumber: body.From?.replace('whatsapp:', ''),
        messageId:   body.SmsSid,
        text:        body.Body,
        isStop:      this.isStopCommand({ text: body.Body }),
      };
    }
    return null;
  }

  normalizeDeliveryStatus(raw) {
    const map = {
      accepted: 'sent', queued: 'sent', sending: 'sent', sent: 'sent',
      delivered: 'delivered', read: 'read', failed: 'failed', undelivered: 'failed',
    };
    return map[raw] || 'sent';
  }

  isStopCommand(event) {
    const text = (event?.text || '').trim().toUpperCase();
    return ['STOP', 'DETENER', 'CANCELAR', 'BAJA', 'NO MÁS', 'NO MAS'].includes(text);
  }

  async getProviderHealth() {
    const start = Date.now();
    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const res  = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}.json`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(5000),
      });
      return { latencyMs: Date.now() - start, status: res.ok ? 'healthy' : 'degraded' };
    } catch (err) {
      return { latencyMs: Date.now() - start, status: 'down', error: err.message };
    }
  }
}

function buildVariables(context = {}) {
  const vars = {};
  let i = 1;
  if (context.stack_name)   vars[i++] = context.stack_name;
  if (context.tier_label)   vars[i++] = context.tier_label;
  if (context.product_name) vars[i++] = context.product_name;
  return vars;
}
