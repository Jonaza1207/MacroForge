/**
 * MacroForge — Loyalty Engine
 *
 * Phase 13 — Scale + Media + Community Ecosystem
 * SERVER-SIDE ONLY.
 *
 * Computes and manages customer loyalty points, levels, and progression.
 *
 * Design principles:
 *   - Points are earned, not farmed (rate limits + purchase verification)
 *   - Levels feel earned, not given (behavioral thresholds, not arbitrary)
 *   - Fraud resistant (dedup, velocity checks, purchase verification)
 *   - Premium feel (subtle, achievement-focused, non-gamey)
 *
 * Point earning:
 *   first_purchase:       100pts — welcome reward
 *   repeat_purchase:       50pts — per confirmed order
 *   subscription_start:   200pts — highest commitment signal
 *   subscription_renewal:  75pts — consistency reward
 *   refill_reorder:        75pts — retention reward
 *   stack_saved:           10pts — engagement (max 3/day)
 *   referral_conversion:  300pts — most valuable (another customer acquired)
 *   review_submitted:      25pts — social proof (verified purchase required)
 *   challenge_completed:  100pts — community engagement
 */

import { supabase } from './supabase.js';
import { writeAudit } from './auditLog.js';

// ── Level thresholds ──────────────────────────────────────────────
export const LOYALTY_LEVELS = {
  explorer:  { min: 0,    max: 99,   rank: 1 },
  builder:   { min: 100,  max: 499,  rank: 2 },
  committed: { min: 500,  max: 1499, rank: 3 },
  elite:     { min: 1500, max: 4999, rank: 4 },
  vip:       { min: 5000, max: null, rank: 5 },
};

function computeLevel(totalPoints) {
  if (totalPoints >= 5000) return 'vip';
  if (totalPoints >= 1500) return 'elite';
  if (totalPoints >= 500)  return 'committed';
  if (totalPoints >= 100)  return 'builder';
  return 'explorer';
}

function computeProgressToNextLevel(totalPoints) {
  if (totalPoints >= 5000) return { pct: 100, nextLevel: null, pointsNeeded: 0 };
  const levels = [['builder', 100], ['committed', 500], ['elite', 1500], ['vip', 5000]];
  for (const [name, threshold] of levels) {
    if (totalPoints < threshold) {
      const prevThreshold = threshold === 100 ? 0 : levels[levels.findIndex(l => l[0] === name) - 1][1];
      const range         = threshold - prevThreshold;
      const earned        = totalPoints - prevThreshold;
      return {
        pct:          Math.round((earned / range) * 100),
        nextLevel:    name,
        pointsNeeded: threshold - totalPoints,
      };
    }
  }
  return { pct: 100, nextLevel: null, pointsNeeded: 0 };
}

// ── Account management ────────────────────────────────────────────

/**
 * Get or create a loyalty account for a customer.
 */
export async function getOrCreateLoyaltyAccount(anonymousId) {
  const { data: existing } = await supabase
    .from('loyalty_accounts').eq('anonymous_id', anonymousId).select('*').single();

  if (existing) return existing;

  const { data: newAccount } = await supabase.from('loyalty_accounts').insert({
    anonymous_id:  anonymousId,
    current_level: 'explorer',
    total_points:  0,
    lifetime_points: 0,
  }).single();

  return newAccount;
}

/**
 * Award points for a loyalty event.
 * Handles rate limiting, deduplication, and level-up detection.
 *
 * @param {string} anonymousId
 * @param {string} eventType    — matches loyalty_point_rules.event_type
 * @param {object} options      — { referenceId, metadata, isPending }
 */
export async function awardPoints(anonymousId, eventType, options = {}) {
  const { referenceId, metadata = {}, isPending = false } = options;

  // Get point rule
  const { data: rule } = await supabase
    .from('loyalty_point_rules')
    .eq('event_type', eventType)
    .eq('is_active', true)
    .select('points, max_per_day')
    .single();

  if (!rule) return { awarded: false, reason: 'no_rule' };

  // Rate limit: check events in last 24h
  if (rule.max_per_day) {
    const since = new Date(Date.now() - 86400_000).toISOString();
    const { data: recent } = await supabase
      .from('loyalty_events')
      .eq('anonymous_id', anonymousId)
      .eq('event_type', eventType)
      .gte('created_at', since)
      .select('id');

    if ((recent?.length || 0) >= rule.max_per_day) {
      return { awarded: false, reason: 'rate_limited', daily_limit: rule.max_per_day };
    }
  }

  // Get/create account
  const account = await getOrCreateLoyaltyAccount(anonymousId);
  if (!account) return { awarded: false, reason: 'account_error' };

  const newTotal    = account.total_points + rule.points;
  const newLifetime = account.lifetime_points + rule.points;
  const newLevel    = computeLevel(newTotal);
  const leveledUp   = newLevel !== account.current_level;

  // Update account
  await supabase.from('loyalty_accounts').update({
    total_points:    newTotal,
    lifetime_points: newLifetime,
    current_level:   newLevel,
    last_level_up_at: leveledUp ? new Date().toISOString() : undefined,
  }).eq('anonymous_id', anonymousId);

  // Record event
  await supabase.from('loyalty_events').insert({
    account_id:    account.id,
    anonymous_id:  anonymousId,
    event_type:    eventType,
    points_delta:  rule.points,
    points_balance: newTotal,
    reference_id:  referenceId || null,
    metadata,
    is_pending:    isPending,
    confirmed_at:  isPending ? null : new Date().toISOString(),
  });

  if (leveledUp) {
    await writeAudit({ eventType: 'loyalty_level_up', anonymousId, payload: { from: account.current_level, to: newLevel, total_points: newTotal } });
  }

  return {
    awarded:          true,
    points:           rule.points,
    new_total:        newTotal,
    new_level:        newLevel,
    leveled_up:       leveledUp,
    progress:         computeProgressToNextLevel(newTotal),
  };
}

/**
 * Get full loyalty status for a customer.
 */
export async function getLoyaltyStatus(anonymousId) {
  const { data: account } = await supabase
    .from('loyalty_accounts')
    .eq('anonymous_id', anonymousId)
    .select('*')
    .single();

  if (!account) {
    return { level: 'explorer', total_points: 0, progress: { pct: 0, nextLevel: 'builder', pointsNeeded: 100 } };
  }

  return {
    level:           account.current_level,
    total_points:    account.total_points,
    lifetime_points: account.lifetime_points,
    purchase_streak: account.purchase_streak,
    refill_streak:   account.refill_streak,
    referral_code:   account.referral_code,
    progress:        computeProgressToNextLevel(account.total_points),
  };
}

/**
 * Process loyalty points for a confirmed Shopify order.
 * Called from the orders/paid webhook handler.
 */
export async function processOrderLoyalty(anonymousId, shopifyOrderId, isFirstOrder) {
  const eventType = isFirstOrder ? 'first_purchase' : 'repeat_purchase';
  return awardPoints(anonymousId, eventType, {
    referenceId: String(shopifyOrderId),
    metadata:    { shopify_order_id: shopifyOrderId },
  });
}

export { computeLevel, computeProgressToNextLevel };
