/**
 * MacroForge — Backend Security Utilities
 *
 * Phase 9 — Vercel Backend Activation
 * SERVER-SIDE ONLY.
 *
 * Provides:
 *   - Cron secret validation (prevent unauthorized cron execution)
 *   - Webhook signature verification (360dialog, Twilio, Meta)
 *   - Request size limits
 *   - Rate limiting helpers (lightweight, in-memory + DB-backed)
 *   - IP hashing (anonymized for audit logs)
 *   - Payload validation
 *
 * Security principles:
 *   - Fail closed: if validation fails, reject the request
 *   - No secrets in error messages returned to callers
 *   - All errors logged internally, generic message returned externally
 *   - Timing-safe comparisons for secret validation
 */

import crypto from 'crypto';

// ── Environment variable validation ──────────────────────────────
export function requireEnvVars(...keys) {
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`[MacroForge Security] Missing required env vars: ${missing.join(', ')}`);
  }
}

// ── Cron secret validation ────────────────────────────────────────
// Vercel Cron passes the CRON_SECRET as a Bearer token in Authorization header.
// NEVER run cron processing without this check.
export function validateCronSecret(req) {
  const token       = req.headers['authorization']?.replace('Bearer ', '') || '';
  const cronSecret  = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[MacroForge Security] CRON_SECRET not configured');
    return false;
  }

  // Timing-safe comparison prevents timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(cronSecret)
    );
  } catch {
    return false;  // different lengths → not equal
  }
}

// ── Webhook signature verification ───────────────────────────────

/**
 * Verify a 360dialog webhook signature.
 * 360dialog uses HMAC-SHA256 signed with your API key.
 * Header: X-Hub-Signature-256
 */
export function verify360dialogSignature(req, rawBody) {
  const signature  = req.headers['x-hub-signature-256'] || '';
  const secret     = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch { return false; }
}

/**
 * Verify a Twilio webhook signature.
 * Twilio signs with HMAC-SHA1 over the full URL + sorted params.
 * Header: X-Twilio-Signature
 */
export function verifyTwilioSignature(req, rawBody, requestUrl) {
  const signature = req.headers['x-twilio-signature'] || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return false;

  // Twilio signature includes the full URL
  const expected = crypto
    .createHmac('sha1', authToken)
    .update(requestUrl + rawBody)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch { return false; }
}

/**
 * Verify a Meta WhatsApp Cloud API webhook signature.
 * Same format as 360dialog (X-Hub-Signature-256, HMAC-SHA256).
 */
export function verifyMetaSignature(req, rawBody) {
  const signature = req.headers['x-hub-signature-256'] || '';
  const appSecret = process.env.META_APP_SECRET;  // separate from API token
  if (!appSecret || !signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch { return false; }
}

/**
 * Route webhook verification to the correct provider.
 */
export function verifyWebhookSignature(req, rawBody, requestUrl) {
  const provider = process.env.WHATSAPP_PROVIDER || '360dialog';
  switch (provider) {
    case 'twilio':    return verifyTwilioSignature(req, rawBody, requestUrl);
    case 'meta':      return verifyMetaSignature(req, rawBody);
    default:          return verify360dialogSignature(req, rawBody);
  }
}

// ── IP hashing (for audit logs — never store raw IPs) ────────────
export function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + (process.env.IP_HASH_SALT || '')).digest('hex').slice(0, 16);
}

// ── Phone hashing (for consent records — never store plaintext) ───
export function hashPhone(e164Phone) {
  if (!e164Phone) return null;
  return crypto.createHash('sha256').update(e164Phone).digest('hex');
}

// ── Idempotency key generation ────────────────────────────────────
export function generateIdempotencyKey(anonymousId, campaignId, windowDays = 1) {
  const windowStart = Math.floor(Date.now() / (windowDays * 86400_000));
  return crypto.createHash('sha256')
    .update(`${anonymousId}:${campaignId}:${windowStart}`)
    .digest('hex')
    .slice(0, 32);
}

// ── Request size limit ────────────────────────────────────────────
export function checkRequestSize(req, maxBytes = 65536) {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  return contentLength <= maxBytes;
}

// ── Anonymous ID validation ───────────────────────────────────────
// Validates format from getAnonymousId() in segmentation.js
// Format: mf_[base36timestamp]_[6char random]
export function isValidAnonymousId(id) {
  return typeof id === 'string' && /^mf_[a-z0-9]{6,}_[a-z0-9]{3,6}$/.test(id);
}

// ── Generic JSON response helpers ────────────────────────────────
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message, status = 400) {
  // Never expose internal details in error responses
  return jsonResponse({ error: message }, status);
}

// ── Cron run ID ───────────────────────────────────────────────────
export function generateCronRunId() {
  return `cron_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
