/**
 * MacroForge — Retry Strategy + Dead-Letter Queue
 *
 * Phase 9 — Vercel Backend Activation
 * SERVER-SIDE ONLY.
 *
 * Implements exponential backoff with jitter for failed automation sends.
 * Classifies errors as retryable or permanent (dead-letter).
 *
 * Retryable errors:
 *   - Provider temporary unavailability (503, 429, 5xx)
 *   - Network timeouts
 *   - Rate limit exhaustion (with backoff)
 *
 * Non-retryable (dead-letter) errors:
 *   - Invalid phone number (400)
 *   - Template not approved (400)
 *   - User has blocked (403 from Meta)
 *   - Invalid provider credentials (401)
 *   - Max retries exceeded
 *   - Consent not found
 */

import { supabase } from './supabase.js';

const MAX_RETRIES      = 3;
const BASE_DELAY_MS    = 5_000;   // 5 seconds
const MAX_DELAY_MS     = 300_000; // 5 minutes

// ── Error classification ──────────────────────────────────────────

const NON_RETRYABLE_CODES = new Set([
  'invalid_phone_number',
  'template_not_approved',
  'user_blocked_sender',
  'invalid_credentials',
  'consent_missing',
  'phone_not_found',
  'template_rejected',
  'message_undeliverable',
]);

const NON_RETRYABLE_HTTP = new Set([400, 401, 403, 404]);

/**
 * Determine if an error is worth retrying.
 */
export function isRetryableError(error) {
  if (error.providerCode && NON_RETRYABLE_CODES.has(error.providerCode)) return false;
  if (error.httpStatus && NON_RETRYABLE_HTTP.has(error.httpStatus)) return false;
  // Timeout, 5xx, 429 = retryable
  return true;
}

// ── Backoff calculation ───────────────────────────────────────────

/**
 * Calculate next retry delay using exponential backoff with jitter.
 * Prevents thundering herd when provider recovers.
 *
 * Formula: min(base * 2^attempt, maxDelay) + jitter(0–1000ms)
 */
export function getRetryDelayMs(attempt) {
  const exponential = BASE_DELAY_MS * Math.pow(2, attempt);
  const capped      = Math.min(exponential, MAX_DELAY_MS);
  const jitter      = Math.floor(Math.random() * 1000);
  return capped + jitter;
}

// ── Queue management ──────────────────────────────────────────────

/**
 * Schedule a retry for a failed entry.
 */
export async function scheduleRetry(queueId, retryCount, error) {
  if (retryCount >= MAX_RETRIES || !isRetryableError(error)) {
    return moveToDeadLetter(queueId, error);
  }

  const delayMs   = getRetryDelayMs(retryCount);
  const nextRetry = new Date(Date.now() + delayMs).toISOString();

  await supabase.from('automation_queue').update({
    status:         'failed',
    retry_count:    retryCount + 1,
    last_attempt_at: new Date().toISOString(),
    next_retry_at:   nextRetry,
    failure_reason:  error.message || 'Unknown error',
  }).eq('id', queueId);

  return { scheduled: true, nextRetry, retryCount: retryCount + 1 };
}

/**
 * Move an entry to the dead-letter queue (max retries exceeded or permanent failure).
 */
export async function moveToDeadLetter(queueId, error) {
  const { data: entry } = await supabase
    .from('automation_queue')
    .eq('id', queueId)
    .select('campaign_id, anonymous_id, retry_count')
    .single();

  // Update queue entry
  await supabase.from('automation_queue').update({
    status:         'dead_lettered',
    failure_reason:  error.message || 'Max retries exceeded',
    last_attempt_at: new Date().toISOString(),
  }).eq('id', queueId);

  // Create dead-letter record
  await supabase.from('automation_failures').insert({
    queue_id:          queueId,
    campaign_id:       entry?.campaign_id,
    anonymous_id:      entry?.anonymous_id,
    failure_reason:    error.message || 'Max retries exceeded',
    provider_response: error.providerResponse || null,
    retry_count:       entry?.retry_count || 0,
    is_retryable:      false,
    is_dead_lettered:  true,
  });

  return { deadLettered: true };
}

/**
 * Fetch pending entries eligible for retry.
 */
export async function getPendingRetries(limit = 50) {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('automation_queue')
    .eq('status', 'failed')
    .lte('next_retry_at', now)
    .gt('expires_at', now)
    .lt('retry_count', MAX_RETRIES)
    .order('priority', { ascending: true })
    .limit(limit)
    .select('*');

  return data || [];
}
