/**
 * MacroForge — Referral Code Validation
 * POST /api/referral/validate
 *
 * Validates a referral code before checkout.
 * Returns discount percentage if valid.
 */

import { validateReferralCode } from '../../lib/backend/referralSystem.js';
import { isValidAnonymousId, hashIp } from '../../lib/backend/security.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { code, anonymous_id } = body || {};

  if (!code || typeof code !== 'string' || !/^MF-[A-Z0-9]{5,6}$/.test(code)) {
    return res.status(400).json({ error: 'Invalid referral code format' });
  }
  if (!isValidAnonymousId(anonymous_id)) {
    return res.status(400).json({ error: 'Invalid anonymous_id' });
  }

  const ipHash = hashIp(req.headers['x-real-ip'] || req.headers['x-forwarded-for']);

  try {
    const result = await validateReferralCode(code, anonymous_id, ipHash);
    if (!result.valid) {
      return res.status(200).json({ valid: false, reason: result.reason });
    }
    return res.status(200).json({
      valid:        true,
      discount_pct: result.discountPct,
      message:      `Código válido — ${result.discountPct}% de descuento aplicado`,
    });
  } catch (err) {
    console.error('[MacroForge Referral Validate] Error:', err.message);
    return res.status(500).json({ error: 'Failed to validate referral code' });
  }
}
