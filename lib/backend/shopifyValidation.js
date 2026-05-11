/**
 * MacroForge — Shopify Checkout Validation
 *
 * Phase 10 — Shopify Commerce Activation
 * SERVER-SIDE ONLY.
 *
 * Validates all inputs before creating draft orders.
 * Fails loudly for invalid data, gracefully for unavailable products.
 */

import { isValidAnonymousId } from './security.js';
import { supabase }           from './supabase.js';

const MAX_PRODUCT_IDS = 10;
const MIN_PRODUCT_IDS = 1;
const MAX_SLUG_LENGTH = 128;

// ── Payload validation ────────────────────────────────────────────

export function validateDraftOrderPayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  // Anonymous ID
  if (!isValidAnonymousId(body.anonymous_id)) {
    errors.push('Invalid or missing anonymous_id');
  }

  // Product IDs
  if (!Array.isArray(body.product_ids) || body.product_ids.length < MIN_PRODUCT_IDS) {
    errors.push(`product_ids must be a non-empty array (min ${MIN_PRODUCT_IDS})`);
  } else if (body.product_ids.length > MAX_PRODUCT_IDS) {
    errors.push(`product_ids exceeds maximum of ${MAX_PRODUCT_IDS}`);
  } else if (!body.product_ids.every(id => typeof id === 'string' && id.length < MAX_SLUG_LENGTH)) {
    errors.push('product_ids must be an array of strings');
  }

  // Stack metadata (optional but validated if present)
  if (body.stack_metadata) {
    const meta = body.stack_metadata;
    if (meta.stack_tier && !['premium','completo','balanceado','esencial'].includes(meta.stack_tier)) {
      errors.push('Invalid stack_tier');
    }
    if (meta.goal && !['muscle','cut','performance','wellness','recovery','sleep'].includes(meta.goal)) {
      errors.push('Invalid goal');
    }
    if (meta.source_flow && !['guided','manual','automation_recovery','whatsapp'].includes(meta.source_flow)) {
      errors.push('Invalid source_flow');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── Kill switch check ─────────────────────────────────────────────

export async function checkShopifyEnabled() {
  const { data: enabled } = await supabase
    .from('global_settings')
    .eq('key', 'shopify_checkout_enabled')
    .select('value').single();

  if (enabled?.value !== 'true') {
    return { enabled: false, reason: 'Shopify checkout not yet configured' };
  }

  const { data: killSwitch } = await supabase
    .from('global_settings')
    .eq('key', 'checkout_kill_switch')
    .select('value').single();

  if (killSwitch?.value === 'true') {
    return { enabled: false, reason: 'Checkout temporarily disabled (kill switch)' };
  }

  return { enabled: true };
}

// ── Idempotency ───────────────────────────────────────────────────

import crypto from 'crypto';

export function generateCheckoutIdempotencyKey(anonymousId, productIds) {
  const sorted = [...productIds].sort().join(',');
  const window = Math.floor(Date.now() / (60 * 60 * 1000));  // 1-hour window
  return crypto.createHash('sha256')
    .update(`${anonymousId}:${sorted}:${window}`)
    .digest('hex')
    .slice(0, 32);
}

export async function checkCheckoutIdempotency(idempotencyKey) {
  const { data } = await supabase
    .from('checkout_sessions')
    .eq('idempotency_key', idempotencyKey)
    .neq('status', 'failed')
    .select('checkout_url, status').single();

  if (data?.checkout_url) {
    return { duplicate: true, checkout_url: data.checkout_url, status: data.status };
  }
  return { duplicate: false };
}
