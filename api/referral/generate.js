/**
 * MacroForge — Referral Code Generation
 * POST /api/referral/generate
 *
 * Generates or retrieves a customer's referral code.
 * Safe for authenticated frontend calls.
 */

import { ensureReferralCode }  from '../../lib/backend/referralSystem.js';
import { isValidAnonymousId }  from '../../lib/backend/security.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { anonymous_id } = body || {};
  if (!isValidAnonymousId(anonymous_id)) {
    return res.status(400).json({ error: 'Invalid anonymous_id' });
  }

  try {
    const code = await ensureReferralCode(anonymous_id);
    return res.status(200).json({
      ok:            true,
      referral_code: code?.code,
      discount_pct:  code?.discount_pct || 5,
    });
  } catch (err) {
    console.error('[MacroForge Referral] Error:', err.message);
    return res.status(500).json({ error: 'Failed to generate referral code' });
  }
}
