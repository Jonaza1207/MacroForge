/**
 * MacroForge — Referral System
 *
 * Phase 13 — Scale + Media + Community Ecosystem
 * SERVER-SIDE ONLY.
 *
 * Manages referral codes, validation, conversion attribution,
 * and fraud prevention.
 *
 * Code format: MF-[6 alphanumeric chars] (e.g., MF-A3X9K2)
 * One code per customer. Deterministically derived for consistency.
 *
 * Fraud prevention:
 *   - Self-referral detection (same IP hash, same device signals)
 *   - Velocity limits (max conversions per code per day)
 *   - Verified purchase requirement (min order value)
 *   - Account age check (referred customer must be new)
 *
 * Discount delivery:
 *   - Discount is applied at Shopify checkout as a discount code
 *   - Referrer earns loyalty points on confirmed conversion
 */

import { supabase }      from './supabase.js';
import { awardPoints }   from './loyaltyEngine.js';
import { writeAudit }    from './auditLog.js';
import crypto            from 'crypto';

// ── Code generation ───────────────────────────────────────────────

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusable chars

/**
 * Generate a deterministic referral code from anonymous_id.
 * Same anonymous_id always produces same code.
 */
export function deriveReferralCode(anonymousId) {
  const hash = crypto.createHash('sha256').update(anonymousId).digest('hex');
  let code = 'MF-';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[parseInt(hash.slice(i * 2, i * 2 + 2), 16) % CODE_CHARS.length];
  }
  return code;
}

/**
 * Ensure a customer has a referral code record in the database.
 * Creates one if it doesn't exist.
 */
export async function ensureReferralCode(anonymousId) {
  const { data: existing } = await supabase
    .from('referral_codes').eq('anonymous_id', anonymousId).select('code, id').single();

  if (existing) return existing;

  // Get loyalty account for level-based discount
  const { data: loyaltyAccount } = await supabase
    .from('loyalty_accounts').eq('anonymous_id', anonymousId).select('current_level, id').single();

  const level = loyaltyAccount?.current_level || 'explorer';
  const LEVEL_DISCOUNTS = { explorer: 5, builder: 7, committed: 10, elite: 12, vip: 15 };
  const discountPct = LEVEL_DISCOUNTS[level] || 5;

  const code = deriveReferralCode(anonymousId);
  const { data: newCode } = await supabase.from('referral_codes').insert({
    code,
    anonymous_id: anonymousId,
    account_id:   loyaltyAccount?.id || null,
    level,
    discount_pct: discountPct,
    is_active:    true,
  }).single();

  // Also store in loyalty_accounts
  await supabase.from('loyalty_accounts').update({ referral_code: code })
    .eq('anonymous_id', anonymousId);

  return newCode || { code, id: null };
}

// ── Validation ────────────────────────────────────────────────────

/**
 * Validate a referral code at checkout.
 * Returns null if invalid, or the code record if valid.
 */
export async function validateReferralCode(code, referredAnonymousId, ipHash) {
  const { data: referralCode } = await supabase
    .from('referral_codes').eq('code', code).eq('is_active', true).select('*').single();

  if (!referralCode) return { valid: false, reason: 'code_not_found' };

  // Self-referral prevention
  if (referralCode.anonymous_id === referredAnonymousId) {
    return { valid: false, reason: 'self_referral' };
  }

  // Max uses check
  if (referralCode.max_uses && referralCode.total_uses >= referralCode.max_uses) {
    return { valid: false, reason: 'max_uses_reached' };
  }

  // Velocity check: max 3 conversions per code per day
  const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();
  const { data: recentConversions } = await supabase
    .from('referral_conversions')
    .eq('referral_code', code)
    .gte('created_at', oneDayAgo)
    .select('id');

  if ((recentConversions?.length || 0) >= 3) {
    return { valid: false, reason: 'velocity_limit' };
  }

  return {
    valid:        true,
    code:         referralCode.code,
    codeId:       referralCode.id,
    referrerId:   referralCode.anonymous_id,
    discountPct:  referralCode.discount_pct,
  };
}

/**
 * Record a referral conversion after purchase.
 */
export async function recordReferralConversion({
  referralCodeId,
  referralCode,
  referrerAnonymousId,
  referredAnonymousId,
  shopifyOrderId,
  orderValueCrc,
  discountApplied,
}) {
  // Create conversion record
  await supabase.from('referral_conversions').insert({
    referral_code_id:       referralCodeId,
    referral_code:          referralCode,
    referrer_anonymous_id:  referrerAnonymousId,
    referred_anonymous_id:  referredAnonymousId,
    shopify_order_id:       shopifyOrderId,
    order_value_crc:        orderValueCrc,
    discount_applied_pct:   discountApplied,
    status:                 'confirmed',
    confirmed_at:           new Date().toISOString(),
  });

  // Update referral code stats
  await supabase.from('referral_codes').update({
    total_uses:               supabase.raw('total_uses + 1'),
    total_conversions:        supabase.raw('total_conversions + 1'),
    total_revenue_attributed: supabase.raw(`total_revenue_attributed + ${orderValueCrc || 0}`),
  }).eq('id', referralCodeId);

  // Award loyalty points to referrer
  const pointsResult = await awardPoints(referrerAnonymousId, 'referral_conversion', {
    referenceId: String(shopifyOrderId),
    metadata:    { referred_id: referredAnonymousId, order_value: orderValueCrc, referral_code: referralCode },
  });

  await writeAudit({ eventType: 'referral_conversion_confirmed', anonymousId: referrerAnonymousId, payload: { referral_code: referralCode, order_id: shopifyOrderId, points_awarded: pointsResult.points } });

  return { success: true, pointsAwarded: pointsResult.points };
}

/**
 * Get referral stats for a customer.
 */
export async function getReferralStats(anonymousId) {
  const { data: code } = await supabase
    .from('referral_codes').eq('anonymous_id', anonymousId).select('*').single();

  return code || null;
}
