/**
 * MacroForge — Automation Intent Queue
 *
 * Phase 8 — WhatsApp Automation Infrastructure
 * Frontend-safe localStorage queue. No real message sending.
 * No PII stored. No secrets. Safe for public deployment.
 *
 * Purpose:
 *   When customer behavior triggers campaign eligibility, store a structured
 *   "automation intent" locally. The backend can later read this queue
 *   and process it — sending the actual WhatsApp message via the provider.
 *
 * The queue is the bridge between frontend intelligence and backend execution.
 * The frontend detects WHEN. The backend decides HOW.
 *
 * ── Security guarantees ───────────────────────────────────────────
 *   - No phone numbers stored
 *   - No emails stored
 *   - No real names stored
 *   - No payment data stored
 *   - Only: anonymous_id, campaign metadata, safe context (stack name, tier, goal)
 *   - Backend enriches with contact data from Supabase (never frontend)
 *
 * ── Intent lifecycle ──────────────────────────────────────────────
 *   pending   → eligible, waiting for backend to process
 *   delivered → backend confirmed delivery (updated by backend webhook)
 *   expired   → eligibleAfter + expiryMs elapsed, no longer relevant
 *   deduped   → same campaign already queued within cooldown window
 *   cleared   → manually cleared by user/system
 *
 * ── Future Supabase table ─────────────────────────────────────────
 * wa_automation_queue (
 *   id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   anonymous_id    text NOT NULL,
 *   campaign_id     text NOT NULL,
 *   template_key    text NOT NULL,
 *   context         jsonb,
 *   status          text DEFAULT 'pending',
 *   priority        int,
 *   created_at      timestamptz DEFAULT now(),
 *   expires_at      timestamptz NOT NULL,
 *   eligible_after  timestamptz NOT NULL,
 *   delivered_at    timestamptz,
 *   delivery_status text,
 *   idempotency_key text UNIQUE   -- intent_id, prevents double-sends
 * )
 * RLS: No direct client access. Backend service role only.
 */

const KEY     = 'mf_automation_queue';
const VERSION = 1;
const MAX     = 10; // max intents in queue (prevents localStorage bloat)

// ── Internal helpers ──────────────────────────────────────────────

function readQueue() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(i => i.version === VERSION) : [];
  } catch { return []; }
}

function writeQueue(intents) {
  try {
    localStorage.setItem(KEY, JSON.stringify(intents.slice(0, MAX)));
  } catch { /* storage full — silent */ }
}

function generateId() {
  return `aq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Dedup check ───────────────────────────────────────────────────
// Returns true if this campaign already has a pending intent within cooldown.
function isWithinCooldown(campaignId, cooldownMs) {
  const intents = readQueue();
  const existing = intents.find(
    i => i.campaignId === campaignId && i.status === 'pending'
  );
  if (!existing) return false;
  return (Date.now() - existing.createdAt) < cooldownMs;
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Create and store a new automation intent.
 * Returns null if deduped (same campaign already pending within cooldown).
 *
 * @param {string} campaignId    — campaign identifier
 * @param {object} payload       — safe automation payload (no PII)
 * @param {object} campaignMeta  — campaign definition from lifecycleCampaigns.js
 * @returns {object|null}        — created intent or null if deduped
 */
export function createIntent(campaignId, payload, campaignMeta) {
  if (isWithinCooldown(campaignId, campaignMeta.cooldownMs)) return null;

  const now    = Date.now();
  const intent = {
    id:             generateId(),
    version:        VERSION,
    campaignId,
    status:         'pending',
    priority:       campaignMeta.priority,
    payload,                               // safe context, no PII
    createdAt:      now,
    expiresAt:      now + campaignMeta.expiryMs,
    eligibleAfter:  now + campaignMeta.eligibleAfterMs,
  };

  const intents = readQueue().filter(i => i.status !== 'expired');
  writeQueue([intent, ...intents]);
  return intent;
}

/**
 * Get all intents in the queue (all statuses).
 */
export function getIntents() {
  return readQueue();
}

/**
 * Get only pending intents eligible for processing.
 */
export function getPendingIntents() {
  const now = Date.now();
  return readQueue().filter(
    i => i.status === 'pending' && i.eligibleAfter <= now && i.expiresAt > now
  );
}

/**
 * Expire stale intents — removes entries past their expiryMs window.
 * Call on page load to keep the queue clean.
 */
export function expireStaleIntents() {
  const now     = Date.now();
  const intents = readQueue();
  const updated = intents.map(i =>
    i.expiresAt < now && i.status === 'pending'
      ? { ...i, status: 'expired' }
      : i
  );
  // Remove expired entries older than 30 days (no longer useful for reporting)
  const cleaned = updated.filter(
    i => !(i.status === 'expired' && (now - i.createdAt) > 30 * 86400_000)
  );
  writeQueue(cleaned);
  return cleaned.filter(i => i.status === 'pending').length; // return pending count
}

/**
 * Mark an intent as delivered (called by backend webhook sync, not frontend logic).
 * Frontend never sends — this is only for future backend status sync.
 */
export function markDelivered(intentId, deliveryStatus) {
  const intents = readQueue().map(i =>
    i.id === intentId ? { ...i, status: 'delivered', deliveryStatus, deliveredAt: Date.now() } : i
  );
  writeQueue(intents);
}

/**
 * Clear a specific intent by ID.
 */
export function clearIntent(intentId) {
  writeQueue(readQueue().filter(i => i.id !== intentId));
}

/**
 * Clear all intents from the queue.
 * Dev tool and user-initiated only. Not called automatically.
 */
export function clearAllIntents() {
  try { localStorage.removeItem(KEY); } catch {}
}

/**
 * Get a summary of queue status — useful for dev console and analytics.
 */
export function getQueueStatus() {
  expireStaleIntents();
  const intents  = readQueue();
  const now      = Date.now();
  const pending  = intents.filter(i => i.status === 'pending').length;
  const eligible = intents.filter(i => i.status === 'pending' && i.eligibleAfter <= now && i.expiresAt > now).length;
  const expired  = intents.filter(i => i.status === 'expired').length;
  const delivered = intents.filter(i => i.status === 'delivered').length;

  return {
    total:      intents.length,
    pending,
    eligible,
    expired,
    delivered,
    campaigns:  [...new Set(intents.filter(i => i.status === 'pending').map(i => i.campaignId))],
  };
}

/**
 * Pretty-print the queue status to the browser console.
 */
export function logQueueReport() {
  const status = getQueueStatus();
  const intents = getPendingIntents();

  console.groupCollapsed('%c[MacroForge Automation Queue]', 'color:#D4A843;font-weight:800;font-size:14px');
  console.log(`Pending: ${status.pending} | Eligible: ${status.eligible} | Expired: ${status.expired} | Delivered: ${status.delivered}`);
  if (intents.length > 0) {
    console.table(intents.map(i => ({
      campaign:   i.campaignId,
      status:     i.status,
      priority:   i.priority,
      eligible_at: new Date(i.eligibleAfter).toLocaleString('es-CR'),
      expires_at:  new Date(i.expiresAt).toLocaleString('es-CR'),
    })));
  } else {
    console.log('No eligible intents in queue.');
  }
  console.groupEnd();
  return status;
}
