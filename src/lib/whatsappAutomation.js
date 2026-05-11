/**
 * MacroForge — WhatsApp Automation Engine
 *
 * Phase 8 — WhatsApp Automation Infrastructure
 * Frontend-safe automation layer. Pure logic. No real message sending.
 *
 * Responsibilities:
 *   1. Build safe automation payloads (no PII, no phone numbers)
 *   2. Evaluate campaign eligibility from reactivation profile
 *   3. Register automation intents into the queue
 *   4. Initialize automation on every return visit (idempotent)
 *   5. Expose dev tools for queue inspection
 *
 * What this does NOT do:
 *   - Send WhatsApp messages directly (frontend is public — secrets forbidden)
 *   - Store phone numbers or personal data
 *   - Require any backend to function (degrades gracefully)
 *   - Block page rendering (all reads are synchronous + fast)
 *
 * ── Complete security model ───────────────────────────────────────
 *
 * ❌ FORBIDDEN in frontend code (this file and all dependencies):
 *   Twilio Auth Token, Account SID used as secret
 *   360dialog API key
 *   Meta Graph API access token
 *   Supabase service_role key
 *   Shopify Admin API key
 *   Any private backend credential
 *
 * ✅ ALLOWED in frontend code:
 *   Anonymous session ID (generated locally, no PII)
 *   Campaign metadata (IDs, timing, template keys)
 *   Customer behavior context (stack name, tier, goal) — anonymized
 *   Automation intent queue (localStorage, no PII)
 *
 * ── Future server API contract ────────────────────────────────────
 *
 * POST /api/whatsapp/queue
 *   Called by: frontend (future — after user consent)
 *   Auth:      Supabase anonymous auth JWT
 *   Purpose:   Sync local intent queue to Supabase for backend processing
 *   Body:      { anonymous_id: string, intents: AutomationIntent[] }
 *   Returns:   { synced: number, errors: string[] }
 *   Security:
 *     - Rate limit: 10 req/min per IP + anonymous_id
 *     - Request validation: Zod schema on server
 *     - PII check: server rejects if phone/email found in body
 *     - Supabase RLS: user can only write their own rows
 *     - CORS: only allow macroforge.cr origin
 *
 * POST /api/whatsapp/send (internal — NOT called from frontend)
 *   Called by: Vercel Cron at 09:00, 12:00, 18:00 CRC
 *   Auth:      Internal service-to-service (Vercel env secrets)
 *   Purpose:   Process eligible intents and send WhatsApp messages
 *   Providers: 360dialog | Twilio | Meta WhatsApp Cloud API
 *   Flow:
 *     1. Query Supabase: WHERE status='pending' AND eligible_after <= NOW()
 *     2. Check consent: WHERE consent_marketing = true
 *     3. Lookup phone: JOIN users ON anonymous_id (from Supabase)
 *     4. Check cooldown: last_sent_at + cooldown_ms > NOW()
 *     5. Build template: provider-specific format
 *     6. Send via provider API
 *     7. Update status: 'delivered' | 'failed'
 *     8. Log to audit table
 *   Credentials (Vercel env vars — never frontend):
 *     WHATSAPP_PROVIDER, WHATSAPP_API_KEY, SUPABASE_SERVICE_ROLE_KEY
 *
 * POST /api/whatsapp/webhook
 *   Called by: WhatsApp provider (delivery receipts + replies)
 *   Auth:      Provider webhook signature (verified server-side)
 *   Purpose:   Update delivery status, handle STOP/unsubscribe commands
 *   Security:  Signature verification before processing
 *
 * POST /api/customer/consent
 *   Called by: frontend (when user explicitly opts in)
 *   Auth:      Supabase anonymous auth JWT
 *   Purpose:   Record marketing consent before any automation
 *   Body:      { anonymous_id, consent_type: 'whatsapp_marketing', granted_at, locale }
 *   NOTE:      Phone number is NOT collected here — added only at purchase time
 *   Future:    Integrate with WhatsApp opt-in button in checkout flow
 *
 * POST /api/customer/profile
 *   Called by: frontend (periodically for CRM sync)
 *   Auth:      Supabase anonymous auth JWT
 *   Purpose:   Sync behavioral profile to Supabase for backend enrichment
 *   Body:      { anonymous_id, segment, lead_score, goals, tier, stack_count }
 *   NOTE:      Never includes phone, email, or name
 *
 * ── Provider integration notes ────────────────────────────────────
 *
 * 360dialog (recommended for LATAM):
 *   Base URL: https://waba.360dialog.io/v1/messages
 *   Auth:     D360-API-KEY header (server-side env var only)
 *   Pricing:  Per conversation (utility: ~$0.008, marketing: ~$0.011)
 *   Template: Pre-approved by Meta, submitted via 360dialog portal
 *   LATAM support: ✓ Spanish templates, local numbers available
 *
 * Twilio WhatsApp:
 *   Base URL: https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json
 *   Auth:     Basic Auth with AccountSID:AuthToken (server-side only)
 *   Content:  Twilio Content Templates (ContentSid)
 *   Pricing:  Per message (~$0.005 + WhatsApp conversation cost)
 *
 * Meta WhatsApp Cloud API (direct):
 *   Base URL: https://graph.facebook.com/v17.0/{phone-number-id}/messages
 *   Auth:     Bearer token (system user access token — server-side only)
 *   Templates: Managed in Meta Business Manager
 *   Pricing:  WhatsApp Business pricing directly
 *
 * ── Future Supabase tables ────────────────────────────────────────
 *
 * wa_automation_queue (id, anonymous_id, campaign_id, template_key, context,
 *   status, priority, created_at, expires_at, eligible_after, delivered_at,
 *   delivery_status, idempotency_key, provider_message_id)
 *
 * wa_consent (id, anonymous_id, consent_type, granted_at, revoked_at, locale,
 *   ip_hash, channel)
 *
 * wa_delivery_log (id, intent_id, provider, template_id, status, error,
 *   sent_at, delivered_at, read_at)
 *
 * lifecycle_events (id, anonymous_id, event_type, campaign_id, journey_state,
 *   created_at)
 */

import { analytics }              from './analytics';
import { getCustomerState }       from './customerState';
import { getAnonymousId }         from './segmentation';
import { getReactivationProfile } from './reactivationEngine';
import { CAMPAIGNS, getCampaign } from './lifecycleCampaigns';
import {
  createIntent,
  expireStaleIntents,
  getQueueStatus,
  getIntents,
  getPendingIntents,
  clearAllIntents,
  logQueueReport,
} from './automationQueue';

// ── Payload builder ───────────────────────────────────────────────

/**
 * Build a safe automation payload.
 * NO PII included. Backend enriches with contact data from Supabase.
 *
 * @param {string} campaignId
 * @param {object} context    — { stackName, tierLabel, productName, goal, refillUrgency, visitCount, segment }
 * @returns {object|null}     — structured payload or null
 */
export function buildAutomationPayload(campaignId, context = {}) {
  const campaign = getCampaign(campaignId);
  if (!campaign) return null;

  const now = Date.now();
  return {
    // Identity (anonymous — backend resolves contact from Supabase)
    anonymous_id:   getAnonymousId(),
    campaign_id:    campaignId,
    campaign_name:  campaign.name,
    template_key:   campaign.templateKey,
    priority:       campaign.priority,

    // Safe behavioral context — no PII
    context: {
      stack_name:     context.stackName     || null,
      tier_label:     context.tierLabel     || null,
      product_name:   context.productName   || null,
      goal:           context.goal          || null,
      refill_urgency: context.refillUrgency || null,
      visit_count:    context.visitCount    || 0,
      segment:        context.segment       || null,
      is_test:        Boolean(context.test),
    },

    // Timing
    created_at:     now,
    expires_at:     now + campaign.expiryMs,
    eligible_after: now + campaign.eligibleAfterMs,

    // Backend notes (documentation for server-side enrichment)
    _backend_notes: {
      phone_lookup:   'Resolve from Supabase users.phone WHERE anonymous_id = payload.anonymous_id',
      consent_check:  'Verify wa_consent.granted_at IS NOT NULL AND wa_consent.revoked_at IS NULL',
      provider:       'Read WHATSAPP_PROVIDER from Vercel env vars (server-side only)',
      send_endpoint:  'POST /api/whatsapp/send (internal cron, never frontend)',
    },
  };
}

// ── Campaign eligibility evaluation ──────────────────────────────

/**
 * Evaluate which campaigns are eligible based on the current reactivation profile.
 * Returns a list of { campaignId, context } objects ready for queue registration.
 *
 * @param {object} profile — from getReactivationProfile()
 * @param {object} state   — from getCustomerState()
 * @returns {Array}
 */
export function evaluateCampaignEligibility(profile, state) {
  const eligible = [];

  // 1. Abandoned checkout → campaign: abandoned_stack_24h
  if (profile.abandonment?.type === 'checkout_abandoned') {
    eligible.push({
      campaignId: 'abandoned_stack_24h',
      context: {
        stackName:  profile.abandonment.stackName,
        tierLabel:  profile.abandonment.tierLabel,
        visitCount: state.visitCount,
        segment:    state.segment,
      },
    });
  }

  // 2. Refill ready → campaign: refill_reminder_75
  if (profile.refill) {
    eligible.push({
      campaignId: 'refill_reminder_75',
      context: {
        productName:   profile.refill.productNames?.[0] || null,
        refillUrgency: profile.refill.urgency,
        visitCount:    state.visitCount,
        segment:       state.segment,
      },
    });
  }

  // 3. VIP customer → campaign: vip_reorder
  if (profile.vip?.level === 'vip') {
    eligible.push({
      campaignId: 'vip_reorder',
      context: {
        stackName:  profile.abandonment?.stackName || null,
        tierLabel:  'Stack Premium',
        visitCount: state.visitCount,
        segment:    state.segment,
      },
    });
  }

  // 4. Premium tier, no higher-priority signal → campaign: premium_reactivation_14d
  if (profile.vip?.level === 'frequent' && !profile.refill && !profile.abandonment) {
    eligible.push({
      campaignId: 'premium_reactivation_14d',
      context: {
        stackName:  profile.reorder?.stackName || null,
        tierLabel:  'Stack Completo',
        visitCount: state.visitCount,
        segment:    state.segment,
      },
    });
  }

  // 5. General returning customer → campaign: loyalty_followup_7d
  if (state.visitCount >= 3 && !profile.abandonment && !profile.vip && !profile.refill) {
    eligible.push({
      campaignId: 'loyalty_followup_7d',
      context: {
        visitCount: state.visitCount,
        segment:    state.segment,
      },
    });
  }

  return eligible;
}

// ── Intent registration ───────────────────────────────────────────

/**
 * Register an automation intent for a specific campaign.
 * Dedup-safe: skips if same campaign is already pending within cooldown.
 *
 * @param {string} campaignId
 * @param {object} context    — safe behavioral context (no PII)
 * @returns {object|null}     — created intent or null if deduped/invalid
 */
export function registerAutomationIntent(campaignId, context = {}) {
  const campaign = getCampaign(campaignId);
  if (!campaign) return null;

  const payload = buildAutomationPayload(campaignId, context);
  if (!payload) return null;

  const intent = createIntent(campaignId, payload, campaign);

  if (intent) {
    analytics.automationEvent('automation_intent_created', {
      campaign_id: campaignId,
      priority:    campaign.priority,
      segment:     context.segment || null,
    });
  } else {
    analytics.automationEvent('automation_intent_deduped', { campaign_id: campaignId });
  }

  return intent;
}

// ── Initialization ────────────────────────────────────────────────

/**
 * Initialize automation on page load.
 * Safe to call on every visit — dedup prevents intent spam.
 * Exits immediately for new visitors (nothing to reactivate).
 *
 * Call this once in App.jsx useEffect after analytics initialization.
 */
export function initAutomation() {
  try {
    const state = getCustomerState();

    // Skip new visitors entirely — nothing to reactivate
    if (!state.isReturning) return;

    // Clean expired intents first
    const pendingCount = expireStaleIntents();

    // Evaluate eligibility from current behavioral state
    const profile  = getReactivationProfile();
    const eligible = evaluateCampaignEligibility(profile, state);

    // Register all eligible campaigns (dedup prevents duplicates)
    let created = 0;
    for (const { campaignId, context } of eligible) {
      const intent = registerAutomationIntent(campaignId, context);
      if (intent) created++;
    }

    // Fire summary analytics
    if (eligible.length > 0) {
      analytics.automationEvent('automation_campaign_eligible', {
        eligible_count: eligible.length,
        created_count:  created,
        campaigns:      eligible.map(e => e.campaignId),
        segment:        state.segment,
      });
    }

    // Dev console summary
    if (import.meta.env?.DEV) {
      const status = getQueueStatus();
      if (status.pending > 0) {
        // eslint-disable-next-line no-console
        console.info(
          `%c[MacroForge Automation] ${status.pending} intent(s) queued | ${status.eligible} eligible for backend`,
          'color:#D4A843;font-weight:600;font-size:11px'
        );
      }
    }
  } catch {
    // Never crash the page — automation is supplemental
  }
}

// ── Status + reporting ────────────────────────────────────────────

/**
 * Get the current automation system status.
 * Safe to call from anywhere.
 */
export function getAutomationStatus() {
  const queueStatus = getQueueStatus();
  const campaigns   = Object.values(CAMPAIGNS).map(c => ({
    id:       c.id,
    name:     c.name,
    priority: c.priority,
    template: c.templateKey,
    cooldown: `${Math.round(c.cooldownMs / 86400_000)}d`,
  }));

  return {
    queue:     queueStatus,
    campaigns: campaigns.length,
    provider:  'not configured (frontend-safe mode)',
    mode:      'intent_queue_only',
    note:      'Real sending requires backend. See whatsappAutomation.js for API contract.',
  };
}

/**
 * Pretty-print the full automation report to the browser console.
 */
export function logAutomationReport() {
  const status = getAutomationStatus();
  const h      = label => console.log(`%c── ${label}`, 'color:#D4A843;font-weight:700;font-size:12px');

  console.groupCollapsed('%c[MacroForge WhatsApp Automation Report]', 'color:#D4A843;font-weight:800;font-size:14px');

  h('Status');           console.log(status);
  h('Queue');            logQueueReport();
  h('Campaigns');        console.table(Object.values(CAMPAIGNS).map(c => ({ id: c.id, priority: c.priority, template: c.templateKey, cooldown: `${Math.round(c.cooldownMs / 86400_000)}d`, consent: c.consentRequired })));
  h('Security');         console.log('No secrets in frontend. Provider credentials required in Vercel env vars (server-side only).');
  h('Backend Contract'); console.log('See src/lib/whatsappAutomation.js for full API contract documentation.');

  console.groupEnd();
  return status;
}

// Re-export queue utilities for dev console convenience
export { getIntents, getPendingIntents, clearAllIntents, getQueueStatus };
export { CAMPAIGNS } from './lifecycleCampaigns';
