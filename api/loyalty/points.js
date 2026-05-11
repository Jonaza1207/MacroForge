/**
 * MacroForge — Loyalty Points API
 * GET /api/loyalty/points
 *
 * Returns loyalty status for a customer (identified by anonymous_id).
 * Safe for frontend to call — returns only public loyalty data.
 */

import { getLoyaltyStatus }  from '../../lib/backend/loyaltyEngine.js';
import { ensureReferralCode } from '../../lib/backend/referralSystem.js';
import { isValidAnonymousId } from '../../lib/backend/security.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const anonymousId = req.query.anonymous_id || '';
  if (!isValidAnonymousId(anonymousId)) {
    return res.status(400).json({ error: 'Invalid anonymous_id' });
  }

  try {
    const [loyaltyStatus, referralCode] = await Promise.all([
      getLoyaltyStatus(anonymousId),
      ensureReferralCode(anonymousId),
    ]);

    return res.status(200).json({
      ok: true,
      ...loyaltyStatus,
      referral_code: referralCode?.code || null,
    });
  } catch (err) {
    console.error('[MacroForge Loyalty] Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch loyalty status' });
  }
}
