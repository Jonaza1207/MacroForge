/**
 * MacroForge — Lifecycle Campaign Definitions
 *
 * Phase 8 — WhatsApp Automation Infrastructure
 * Pure data module. No React. No DOM. No side effects.
 *
 * Defines all lifecycle campaigns — their triggers, timing, templates,
 * cooldowns, and future backend endpoint mappings.
 *
 * This file is the single source of truth for automation logic.
 * When the backend activates, these definitions drive everything.
 *
 * ── Architecture overview ─────────────────────────────────────────
 *
 * Frontend (current):
 *   evaluateCampaignEligibility() → createIntent() → localStorage queue
 *   Queue is read-only from frontend. Never sends messages.
 *
 * Backend (Phase 9):
 *   Vercel Cron: GET /api/whatsapp/process-queue
 *     → reads Supabase wa_automation_queue
 *     → checks consent + cooldown
 *     → calls 360dialog/Twilio API
 *     → updates delivery status
 *
 * ── Security model ────────────────────────────────────────────────
 *
 * ALL provider credentials are server-side only.
 *
 * Environment variables in Vercel (NEVER in frontend):
 *   WHATSAPP_PROVIDER          = '360dialog' | 'twilio' | 'meta'
 *   WHATSAPP_API_KEY           = [provider API key]
 *   WHATSAPP_PHONE_NUMBER_ID   = [Meta phone number ID]
 *   TWILIO_ACCOUNT_SID         = [Twilio SID]
 *   TWILIO_AUTH_TOKEN          = [Twilio token]
 *   SUPABASE_SERVICE_ROLE_KEY  = [Supabase service key]
 *
 * Frontend only sees: anonymous_id, campaign metadata, template context
 * Backend enriches: phone number, customer name (from Supabase, with consent)
 *
 * ── Provider-agnostic payload format ──────────────────────────────
 *
 * Template payloads are provider-agnostic. Backend adapts to provider:
 *   360dialog: POST /v1/messages with type: 'template'
 *   Twilio:    POST to Messages API with ContentSid
 *   Meta WABA: POST /v17.0/{phone-number-id}/messages
 *
 * All providers require pre-approved template IDs for marketing messages.
 * Template approval process: Meta Business Manager → 24–72h review
 *
 * ── Consent requirements (Phase 9) ──────────────────────────────
 *
 * NEVER send automation without explicit user consent.
 * Consent must be:
 *   - Informed (user knows they'll receive WhatsApp messages)
 *   - Specific (fitness supplement recommendations via MacroForge)
 *   - Revocable (must support STOP/unsubscribe commands)
 *   - Logged (stored in Supabase with timestamp and IP hash)
 *
 * Future consent UI: "¿Querés recibir recordatorios de reabastecimiento por WhatsApp?"
 * Required before any automated message is sent.
 */

// ── Campaign timing constants ─────────────────────────────────────
const H  = 3600_000;   // 1 hour in ms
const D  = 86400_000;  // 1 day in ms

/**
 * Lifecycle campaign definitions.
 *
 * Fields:
 *   id              — unique campaign identifier
 *   name            — human-readable name
 *   description     — what triggers this and why
 *   priority        — 1 = highest priority (sent first if multiple eligible)
 *   cooldownMs      — minimum time between sends of same campaign to same user
 *   expiryMs        — how long the intent stays in the queue before expiring
 *   eligibleAfterMs — how long after trigger the backend should wait before sending
 *   templateKey     — key in WA_TEMPLATES for the message
 *   triggerSignal   — which reactivationEngine signal triggers this
 *   messageTone     — guidance for copywriting / template selection
 *   sendWindow      — when to send (human-readable)
 *   consentRequired — must user have opted into marketing WhatsApp?
 *
 * Future backend mapping:
 *   endpoint      — POST /api/whatsapp/send
 *   schedulerType — 'cron' | 'trigger' | 'manual'
 */
export const CAMPAIGNS = {

  /**
   * Campaign 1: Abandoned Stack Recovery
   * Highest commercial priority — recovers near-conversion customers.
   */
  abandoned_stack_24h: {
    id:              'abandoned_stack_24h',
    name:            'Abandoned Stack Recovery',
    description:     'User viewed the checkout summary but did not send to WhatsApp. ' +
                     'Follow up 24–48h later with a warm, non-desperate recovery message.',
    priority:        1,
    cooldownMs:      1 * D,    // don't resend within 24h of same campaign
    expiryMs:        2 * D,    // intent expires if unprocessed after 48h
    eligibleAfterMs: 1 * H,    // wait 1h to avoid interrupting active sessions
    templateKey:     'abandonedStack',
    triggerSignal:   'checkout_abandoned',
    messageTone:     'helpful, premium, non-desperate, creates continuity',
    sendWindow:      '24h–48h after checkout abandonment',
    consentRequired: true,
    // Future backend:
    // POST /api/whatsapp/send
    // Body: { intent_id, anonymous_id, template: 'abandonedStack', context: { stackName, tierLabel } }
    // Cooldown enforced in Supabase wa_automation_queue table
    // Idempotency: intent_id prevents duplicate sends
  },

  /**
   * Campaign 2: Refill Reminder — 75% of supply cycle
   * Highest recurring revenue value — captures the reorder window.
   */
  refill_reminder_75: {
    id:              'refill_reminder_75',
    name:            'Refill Reminder (75% Cycle)',
    description:     'Customer has purchase intent history for a refillable supplement ' +
                     'and 75% of its standard supply cycle has elapsed. Send refill nudge.',
    priority:        2,
    cooldownMs:      7 * D,    // one refill reminder per 7 days max
    expiryMs:        14 * D,   // expires after 14 days (user likely already reordered)
    eligibleAfterMs: 2 * H,    // slight delay to avoid same-session spam
    templateKey:     'refillReminder',
    triggerSignal:   'refill_ready',
    messageTone:     'continuity-focused, progress-oriented, warm, educational',
    sendWindow:      'Day 20–23 of a 30-day stack (75% of cycle)',
    consentRequired: true,
    // Future: Vercel Cron job checks Supabase refill_log daily at 09:00 CRC
    // Calculates eligible customers by: savedAt + (cycle_days * 0.75) <= now
  },

  /**
   * Campaign 3: VIP Reorder
   * Premium customer re-engagement. Exclusive tone. High LTV potential.
   */
  vip_reorder: {
    id:              'vip_reorder',
    name:            'VIP Customer Reorder',
    description:     'Premium buyer (lead score ≥70, premium tier favorites) ' +
                     'has not placed a reorder in recent session history.',
    priority:        3,
    cooldownMs:      14 * D,   // max once per 2 weeks for VIP
    expiryMs:        21 * D,
    eligibleAfterMs: 3 * H,
    templateKey:     'vipReorder',
    triggerSignal:   'vip',
    messageTone:     'exclusive, direct, premium, recognition-focused',
    sendWindow:      '48h–72h after VIP signal detected on return visit',
    consentRequired: true,
    // Future: VIP segment query in Supabase
    // WHERE lead_score >= 70 AND last_reorder_at < NOW() - INTERVAL '14 days'
  },

  /**
   * Campaign 4: Loyalty Follow-Up
   * Warm relationship maintenance for engaged non-converting customers.
   */
  loyalty_followup_7d: {
    id:              'loyalty_followup_7d',
    name:            'Loyalty Follow-Up (7-Day Inactivity)',
    description:     'Returning customer with 3+ visits has not taken action ' +
                     'in 7+ days. Send a warm, low-pressure check-in.',
    priority:        4,
    cooldownMs:      10 * D,
    expiryMs:        14 * D,
    eligibleAfterMs: 24 * H,   // minimum 24h since last visit
    templateKey:     'loyaltyFollowup',
    triggerSignal:   'returning',
    messageTone:     'warm, relationship-based, light touch, no pressure',
    sendWindow:      '7–10 days after last detected activity',
    consentRequired: true,
  },

  /**
   * Campaign 5: Premium Reactivation
   * High-value dormant customer recovery. Highest stakes, longest window.
   */
  premium_reactivation_14d: {
    id:              'premium_reactivation_14d',
    name:            'Premium Customer Reactivation (14-Day Dormancy)',
    description:     'Customer with premium stack saved has been inactive for 14+ days. ' +
                     'Recover with a high-value, exclusive tone.',
    priority:        5,
    cooldownMs:      21 * D,
    expiryMs:        30 * D,
    eligibleAfterMs: 48 * H,
    templateKey:     'premiumReactivation',
    triggerSignal:   'premium',
    messageTone:     'premium recovery, exclusive, direct, references their stack',
    sendWindow:      '14–21 days after last active session',
    consentRequired: true,
    // Future: Segment from Supabase
    // WHERE tier = 'premium' AND last_seen_at < NOW() - INTERVAL '14 days'
    //   AND consent_marketing = true
  },
};

/** Sorted by priority (ascending = higher priority first) */
export const CAMPAIGNS_BY_PRIORITY = Object.values(CAMPAIGNS)
  .sort((a, b) => a.priority - b.priority);

/** Get a campaign definition by ID */
export function getCampaign(id) {
  return CAMPAIGNS[id] || null;
}
