/**
 * MacroForge — Shopify Selling Plans Manager
 *
 * Phase 11 — Subscription + Recurring Revenue Activation
 * SERVER-SIDE ONLY.
 *
 * Manages Shopify Selling Plans for supplement subscriptions.
 *
 * Selling Plan architecture:
 *   One Selling Plan Group: "MacroForge Refill Subscription"
 *   Plans per interval (30/45/60 days) × tier discount
 *
 * Plan IDs are stored in Supabase selling_plans table after one-time setup.
 * This avoids real-time Shopify API lookups on every subscription checkout.
 *
 * Discount tiers:
 *   premium   → 10% off
 *   completo  → 8% off
 *   balanceado → 5% off
 *   esencial  → 5% off
 *
 * TODO (activation):
 *   1. Create Selling Plan Group in Shopify Admin
 *   2. Insert plan IDs into Supabase selling_plans table
 *   3. Set subscription_enabled='true' in global_settings
 *
 * ── Security ─────────────────────────────────────────────────────
 * All Shopify API calls use SHOPIFY_ADMIN_API_TOKEN env var.
 * Never exposed to frontend. Never logged. Never committed.
 */

import { supabase } from './supabase.js';
import { shopifyRequest } from './shopify.js';

// ── Discount tier map ─────────────────────────────────────────────
const TIER_DISCOUNTS = {
  premium:    10.00,
  completo:    8.00,
  balanceado:  5.00,
  esencial:    5.00,
};

/**
 * Get the recommended subscription interval for a stack.
 * Based on the shortest product supply cycle.
 */
export function getRecommendedInterval(supplyEstimateDays) {
  if (!supplyEstimateDays) return { days: 30, label: '30 días' };
  if (supplyEstimateDays <= 35) return { days: 30, label: '30 días' };
  if (supplyEstimateDays <= 50) return { days: 45, label: '45 días' };
  return { days: 60, label: '60 días' };
}

/**
 * Get the discount percentage for a stack tier.
 */
export function getTierDiscount(stackTier) {
  return TIER_DISCOUNTS[stackTier] || TIER_DISCOUNTS.esencial;
}

/**
 * Look up Selling Plan ID from Supabase cache for a given interval + tier.
 * Returns null if no matching plan is found (subscription unavailable).
 */
export async function getSellingPlanId(intervalDays, stackTier) {
  // Try tier-specific plan first
  const { data: tierPlan } = await supabase
    .from('selling_plans')
    .eq('interval_days', intervalDays)
    .eq('stack_tier', stackTier)
    .eq('is_active', true)
    .select('shopify_selling_plan_id, discount_pct')
    .single();

  if (tierPlan) return tierPlan;

  // Fall back to universal plan (stack_tier IS NULL)
  const { data: universalPlan } = await supabase
    .from('selling_plans')
    .eq('interval_days', intervalDays)
    .is('stack_tier', null)
    .eq('is_active', true)
    .select('shopify_selling_plan_id, discount_pct')
    .single();

  return universalPlan || null;
}

/**
 * Check if subscriptions are globally enabled.
 */
export async function isSubscriptionEnabled() {
  const { data } = await supabase
    .from('global_settings')
    .eq('key', 'subscription_enabled')
    .select('value').single();
  return data?.value === 'true';
}

/**
 * Build Shopify draft order line items WITH selling plan attached.
 * This is what makes the checkout create a subscription instead of one-time purchase.
 */
export function attachSellingPlanToLineItems(lineItems, sellingPlanId) {
  return lineItems.map(item => ({
    ...item,
    selling_plan_id: sellingPlanId,
  }));
}

/**
 * Create or retrieve a Selling Plan Group in Shopify.
 * Called once during store setup — NOT on every checkout.
 *
 * Future: run this via POST /api/shopify/order-sync?action=setup_selling_plans
 */
export async function createSellingPlanGroup() {
  const INTERVAL_DAYS = [30, 45, 60];
  const DISCOUNTS      = [10.0, 8.0, 5.0];  // corresponding discounts

  const sellingPlans = INTERVAL_DAYS.map((days, i) => ({
    name:     `MacroForge Refill — Cada ${days} días (${DISCOUNTS[i]}% off)`,
    category: 'SUBSCRIPTION',
    billing_policy: {
      interval:       days <= 30 ? 'MONTH' : days <= 45 ? 'MONTH' : 'MONTH',
      interval_count: days <= 30 ? 1 : days <= 45 ? 2 : 2,
    },
    delivery_policy: {
      interval:       days <= 30 ? 'MONTH' : 'MONTH',
      interval_count: days <= 30 ? 1 : 2,
    },
    pricing_policies: [{
      adjustment_type:  'PERCENTAGE',
      adjustment_value: { percentage: DISCOUNTS[i] },
    }],
    options: [{ name: 'Delivery every', value: `${days} days` }],
  }));

  const response = await shopifyRequest('selling_plan_groups.json', {
    method: 'POST',
    body: {
      selling_plan_group: {
        name:          'MacroForge Refill Subscription',
        merchant_code: 'macroforge-refill',
        options:       [{ name: 'Delivery interval' }],
        selling_plans: sellingPlans,
      },
    },
  });

  return response.selling_plan_group;
}

/**
 * Get discount display string for UI.
 */
export function getDiscountDisplay(discountPct) {
  return discountPct > 0 ? `${discountPct}% off` : 'sin descuento';
}
