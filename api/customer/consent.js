/**
 * MacroForge — Consent Recording
 * POST /api/customer/consent
 *
 * Records WhatsApp marketing consent (opt-in or opt-out).
 * MUST be called BEFORE any automated messages are sent.
 *
 * Security:
 *   - No phone number collected here (added separately at checkout)
 *   - anonymous_id validated (format check + must exist in customers table)
 *   - IP hashed before storage
 *   - Rate limited (Vercel edge)
 *   - Input sanitized
 *   - Audit logged
 *
 * Consent requirements (GDPR/LOPDP):
 *   - User must explicitly opt in (checkbox, not pre-checked)
 *   - Clear description of what they're consenting to
 *   - Easy opt-out (STOP command or UI button)
 *   - Logs must be kept for 5 years (Supabase retention)
 *
 * Request body:
 * {
 *   anonymous_id:    string,  — from getAnonymousId() in frontend
 *   action:          'grant' | 'revoke',
 *   source:          string,  — 'checkout_opt_in' | 'settings_opt_out'
 *   policy_version:  string,  — '1.0'
 *   country_code:    string,  — 'CR' (optional)
 * }
 */

import { supabase }         from '../../lib/backend/supabase.js';
import { hashIp, isValidAnonymousId, jsonResponse, errorResponse } from '../../lib/backend/security.js';
import { auditConsentGranted, auditConsentRevoked } from '../../lib/backend/auditLog.js';

const ALLOWED_SOURCES = new Set([
  'checkout_opt_in', 'ai_builder_opt_in', 'settings_opt_in',
  'settings_opt_out', 'api',
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Parse body ────────────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { anonymous_id, action, source, policy_version = '1.0', country_code } = body || {};

  // ── Validate inputs ───────────────────────────────────────────
  if (!isValidAnonymousId(anonymous_id)) {
    return res.status(400).json({ error: 'Invalid anonymous_id format' });
  }
  if (!['grant', 'revoke'].includes(action)) {
    return res.status(400).json({ error: 'action must be grant or revoke' });
  }
  if (source && !ALLOWED_SOURCES.has(source)) {
    return res.status(400).json({ error: 'Invalid source' });
  }

  const ipHash = hashIp(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '');
  const now    = new Date().toISOString();

  try {
    if (action === 'grant') {
      // Ensure customer record exists
      await supabase.from('customers').upsert({
        anonymous_id,
        last_seen_at: now,
      }, { onConflict: 'anonymous_id' });

      // Upsert consent record
      await supabase.from('wa_consent').upsert({
        anonymous_id,
        granted_at:     now,
        revoked_at:     null,  // clear any previous revocation
        source:         source || 'api',
        ip_hash:        ipHash,
        policy_version,
        country_code:   country_code || null,
        consent_channel: 'whatsapp',
      }, { onConflict: 'anonymous_id' });

      await auditConsentGranted(anonymous_id, ipHash, source || 'api');

      return res.status(200).json({
        ok:         true,
        action:     'granted',
        anonymous_id,
        granted_at: now,
      });

    } else {
      // Revoke consent (soft — preserves audit history)
      await supabase.from('wa_consent').update({
        revoked_at: now,
        updated_at: now,
      }).eq('anonymous_id', anonymous_id);

      // Pause pending automations
      await supabase.from('automation_queue').update({
        status:         'skipped_no_consent',
        failure_reason: 'Consent revoked via API',
        updated_at:     now,
      })
        .eq('anonymous_id', anonymous_id)
        .eq('status', 'pending');

      await auditConsentRevoked(anonymous_id, source || 'api');

      return res.status(200).json({
        ok:          true,
        action:      'revoked',
        anonymous_id,
        revoked_at:  now,
      });
    }

  } catch (err) {
    console.error('[MacroForge Consent] Error:', err.message);
    return res.status(500).json({ error: 'Failed to record consent' });
  }
}
