/**
 * MacroForge — Customer Profile Sync
 * POST /api/customer/profile
 *
 * Syncs anonymized behavioral profile from frontend to Supabase.
 * No PII. No phone. No email. Behavioral data only.
 *
 * Called by: frontend (after significant behavioral events)
 * Called when: stack built, checkout viewed, journey state detected
 *
 * Request body:
 * {
 *   anonymous_id:    string,
 *   segment:         string,
 *   lead_score:      number,
 *   journey_state:   string,
 *   visit_count:     number,
 *   goals:           string[],
 *   budget_tier:     string,
 *   experience:      string,
 *   favorite_count:  number,
 *   automation_intents: AutomationIntent[], — from localStorage queue
 * }
 *
 * Also syncs any pending automation intents for backend processing.
 */

import { supabase }         from '../../lib/backend/supabase.js';
import { isValidAnonymousId } from '../../lib/backend/security.js';
import { writeAudit, AuditEvents } from '../../lib/backend/auditLog.js';

const MAX_PAYLOAD_BYTES = 32768;  // 32KB max
const MAX_INTENTS       = 10;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Size check ────────────────────────────────────────────────
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { anonymous_id, automation_intents, ...profileData } = body || {};

  // ── Validate anonymous_id ─────────────────────────────────────
  if (!isValidAnonymousId(anonymous_id)) {
    return res.status(400).json({ error: 'Invalid anonymous_id' });
  }

  const now = new Date().toISOString();

  try {
    // ── Upsert customer profile ───────────────────────────────
    await supabase.from('customers').upsert({
      anonymous_id,
      segment:        sanitizeString(profileData.segment),
      lead_score:     clampInt(profileData.lead_score, 0, 100),
      journey_state:  sanitizeString(profileData.journey_state),
      visit_count:    clampInt(profileData.visit_count, 0, 9999),
      goals:          sanitizeArray(profileData.goals, 10),
      budget_tier:    sanitizeString(profileData.budget_tier),
      experience:     sanitizeString(profileData.experience),
      favorite_count: clampInt(profileData.favorite_count, 0, 999),
      last_seen_at:   now,
      updated_at:     now,
    }, { onConflict: 'anonymous_id' });

    // ── Sync automation intents (up to MAX_INTENTS) ────────────
    let syncedIntents = 0;
    if (Array.isArray(automation_intents) && automation_intents.length > 0) {
      const safeIntents = automation_intents
        .slice(0, MAX_INTENTS)
        .filter(i => i.campaignId && i.payload?.anonymous_id === anonymous_id);

      for (const intent of safeIntents) {
        // Only upsert pending intents — don't overwrite delivered/dead-lettered
        const { data: existing } = await supabase
          .from('automation_queue')
          .eq('idempotency_key', intent.id)
          .select('status').single();

        if (!existing || existing.status === 'pending') {
          await supabase.from('automation_queue').upsert({
            anonymous_id,
            campaign_id:     intent.campaignId,
            template_key:    intent.payload?.template_key || '',
            context:         sanitizeContext(intent.payload?.context),
            priority:        intent.priority || 5,
            status:          'pending',
            eligible_after:  new Date(intent.eligibleAfter || Date.now()).toISOString(),
            expires_at:      new Date(intent.expiresAt || Date.now() + 86400000).toISOString(),
            idempotency_key: intent.id,
          }, { onConflict: 'idempotency_key' });

          syncedIntents++;
        }
      }
    }

    await writeAudit({
      eventType:   AuditEvents.PROFILE_SYNCED,
      anonymousId: anonymous_id,
      payload:     { synced_intents: syncedIntents, journey_state: sanitizeString(profileData.journey_state) },
    });

    return res.status(200).json({
      ok:             true,
      synced_profile: true,
      synced_intents: syncedIntents,
    });

  } catch (err) {
    console.error('[MacroForge Profile] Error:', err.message);
    return res.status(500).json({ error: 'Failed to sync profile' });
  }
}

// ── Sanitization helpers ──────────────────────────────────────────

function sanitizeString(val) {
  if (typeof val !== 'string') return null;
  return val.slice(0, 64).replace(/[<>"']/g, '');
}

function sanitizeArray(val, max) {
  if (!Array.isArray(val)) return [];
  return val.slice(0, max).map(s => sanitizeString(s)).filter(Boolean);
}

function clampInt(val, min, max) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return 0;
  return Math.min(Math.max(n, min), max);
}

function sanitizeContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return {};
  // Only allow known safe keys — never pass through arbitrary data
  return {
    stack_name:     sanitizeString(ctx.stack_name),
    tier_label:     sanitizeString(ctx.tier_label),
    product_name:   sanitizeString(ctx.product_name),
    goal:           sanitizeString(ctx.goal),
    refill_urgency: sanitizeString(ctx.refill_urgency),
    visit_count:    clampInt(ctx.visit_count, 0, 9999),
    segment:        sanitizeString(ctx.segment),
    is_test:        Boolean(ctx.is_test),
  };
}
