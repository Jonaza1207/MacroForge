/**
 * MacroForge — Customer Journey State System
 *
 * Phase 7 — CRM + Automated Reactivation Engine
 * Pure logic module. No React. No DOM. No side effects.
 *
 * Derives a single, prioritized journey state from all available
 * behavioral signals. The journey state drives:
 *   - ReactivationCenter display logic
 *   - CustomerJourneyStatus badge content
 *   - WhatsApp lifecycle message selection
 *   - Future CRM segmentation and automation triggers
 *
 * Priority waterfall (highest → lowest commercial value):
 *   1. refill_ready   — imminent reorder (highest recurring revenue signal)
 *   2. premium        — VIP customer (highest LTV signal)
 *   3. high_intent    — clicked WA (conversion signal)
 *   4. recovering     — checkout viewed but not completed (recovery signal)
 *   5. saved          — has stacks/favorites (retention signal)
 *   6. returning      — 3+ visits, engaged (loyalty signal)
 *   7. building       — browsed products (early engagement)
 *   8. exploring      — 2nd visit, minimal history
 *   null              — new visitor — show nothing
 *
 * ── Future CRM evolution (Phase 8) ──────────────────────────────
 * TODO: POST /api/crm/journey-update
 *   Sync journey state to Supabase on each state change.
 *   Table: retention_events(user_id, journey_state, prev_state, created_at)
 *   Trigger: WhatsApp automation via 360dialog when state = 'refill_ready'
 *   Requires: Supabase + WhatsApp Business API (server-side only)
 */

import { getCustomerState }              from './customerState';
import { hasFavoriteStacks, getFavoriteStacks } from './favoriteStacks';
import { hasSavedStack }                 from './stackPersistence';
import { getRefillCandidates }           from './retention';
import { getLeadScore }                  from './segmentation';
import { analytics }                     from './analytics';

// ── Journey state definitions ─────────────────────────────────────
export const JOURNEY_STATES = {
  refill_ready: {
    id:          'refill_ready',
    icon:        '🔄',
    label:       'Listo para reponer',
    desc:        'Tus suplementos pueden estar próximos a terminarse.',
    color:       '#00C896',
    crmTag:      'refill_candidate',
    priority:    1,
  },
  premium: {
    id:          'premium',
    icon:        '💎',
    label:       'Cliente Premium MacroForge',
    desc:        'Tu selección avanzada está activa.',
    color:       '#D4A843',
    crmTag:      'vip_customer',
    priority:    2,
  },
  high_intent: {
    id:          'high_intent',
    icon:        '🎯',
    label:       'Alta intención',
    desc:        'Tu pedido anterior está en nuestro registro.',
    color:       '#E3001E',
    crmTag:      'hot_lead_wa',
    priority:    3,
  },
  recovering: {
    id:          'recovering',
    icon:        '↩️',
    label:       'Continuando',
    desc:        'Tu stack sigue listo donde lo dejaste.',
    color:       '#E3001E',
    crmTag:      'checkout_abandoned',
    priority:    4,
  },
  saved: {
    id:          'saved',
    icon:        '📦',
    label:       'Stack guardado',
    desc:        'Tu selección sigue activa.',
    color:       '#888888',
    crmTag:      'has_saved_stack',
    priority:    5,
  },
  returning: {
    id:          'returning',
    icon:        '⭐',
    label:       'Cliente recurrente',
    desc:        'Bienvenido de vuelta.',
    color:       '#888888',
    crmTag:      'repeat_visitor',
    priority:    6,
  },
  building: {
    id:          'building',
    icon:        '⚡',
    label:       'Construyendo tu stack',
    desc:        'Seguís donde lo dejaste.',
    color:       '#888888',
    crmTag:      'stack_in_progress',
    priority:    7,
  },
  exploring: {
    id:          'exploring',
    icon:        '🔍',
    label:       'Explorando el catálogo',
    desc:        'Tu historial sigue aquí.',
    color:       '#888888',
    crmTag:      'casual_browser',
    priority:    8,
  },
};

// ── Abandonment detection ─────────────────────────────────────────
// Reads from the event buffer — was checkout viewed but not continued?
function detectCheckoutAbandonment() {
  try {
    const events = analytics.getBuffer();
    const viewed    = events.some(e => e.n === 'checkout_layer' && e.p?.action === 'viewed');
    const continued = events.some(e => e.n === 'checkout_layer' && e.p?.action === 'continue');
    return viewed && !continued;
  } catch { return false; }
}

// ── Premium detection ─────────────────────────────────────────────
function detectPremium() {
  const score = getLeadScore();
  const favs  = getFavoriteStacks();
  const hasPremiumFav  = favs.some(f => f.tier === 'premium');
  const hasFrequentFav = favs.some(f => (f.openCount || 0) >= 2);
  return score >= 70 || (hasPremiumFav && favs.length >= 1) || (hasFrequentFav && score >= 35);
}

// ── Main journey state derivation ─────────────────────────────────

/**
 * Derive the customer's current journey state.
 * Returns null for new visitors — show nothing, keep the page clean.
 *
 * @returns {string|null} — journey state ID or null
 */
export function deriveJourneyState() {
  const state      = getCustomerState();
  const refillCandidates = getRefillCandidates();
  const hasFavs    = hasFavoriteStacks();
  const hasSaved   = hasSavedStack();
  const wasAbandoned = detectCheckoutAbandonment();

  // 1. Refill ready — highest recurring revenue signal
  if (refillCandidates.length > 0 && state.visitCount >= 2) {
    return 'refill_ready';
  }

  // 2. Premium VIP customer
  if (detectPremium()) {
    return 'premium';
  }

  // 3. High intent — clicked WhatsApp at some point
  if (state.hasWAIntent) {
    return 'high_intent';
  }

  // 4. Abandoned checkout — build a stack, saw checkout, didn't finish
  if (wasAbandoned && (hasFavs || hasSaved)) {
    return 'recovering';
  }

  // 5. Has saved stacks or favorites
  if (hasFavs || hasSaved) {
    return 'saved';
  }

  // 6. Returning visitor (3+ visits, engaged)
  if (state.visitCount >= 3) {
    return 'returning';
  }

  // 7. Has browsed products or used stack builder
  if (state.isStackExplorer) {
    return 'building';
  }

  // 8. 2nd visit with some history
  if (state.visitCount === 2 && state.hasRecentlyViewed) {
    return 'exploring';
  }

  // New visitor — return null (show nothing)
  return null;
}

/**
 * Get the full metadata for a journey state.
 * @param {string} stateId
 * @returns {object|null}
 */
export function getJourneyMeta(stateId) {
  return JOURNEY_STATES[stateId] || null;
}

/**
 * Get the current journey state + its metadata in one call.
 * @returns {{ stateId: string|null, meta: object|null }}
 */
export function getJourneyProfile() {
  const stateId = deriveJourneyState();
  return {
    stateId,
    meta: stateId ? JOURNEY_STATES[stateId] : null,
  };
}
