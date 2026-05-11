/**
 * MacroForge — Frontend Loyalty Status
 *
 * Phase 13 — Scale + Media + Community Ecosystem
 * FRONTEND-SAFE. No secrets. No backend calls required.
 *
 * Derives a loyalty level estimate from local behavioral signals.
 * Used for immediate UI display (no network latency).
 *
 * The actual backend loyalty account (with real points) is synced
 * via GET /api/loyalty/points. This module provides instant local estimates
 * that are accurate enough for displaying the badge and level name.
 *
 * Level progression:
 *   Explorer   → new/casual visitor
 *   Builder    → returning with engagement
 *   Committed  → has WA intent or favorites
 *   Elite      → high lead score + purchase history
 *   VIP        → known VIP from segmentation
 */

import { getCustomerState }  from './customerState';
import { getLeadScore }      from './segmentation';
import { getFavoriteStacks } from './favoriteStacks';
import { analytics }         from './analytics';

// ── Level definitions (mirrored from backend) ─────────────────────
export const LOYALTY_LEVELS = {
  explorer: {
    id:          'explorer',
    rank:        1,
    label:       'Explorador',
    icon:        '🔍',
    color:       '#888888',
    description: 'Comenzando tu viaje en MacroForge.',
    perks:       ['Catálogo completo', 'Stack Builder gratis'],
    pointsMin:   0,
  },
  builder: {
    id:          'builder',
    rank:        2,
    label:       'Constructor',
    icon:        '⚡',
    color:       '#E3001E',
    description: 'Construyendo tu rutina de suplementación.',
    perks:       ['Todo lo anterior', 'Recordatorios de reabastecimiento', 'Stacks favoritos'],
    pointsMin:   100,
  },
  committed: {
    id:          'committed',
    rank:        3,
    label:       'Comprometido',
    icon:        '💪',
    color:       '#00C896',
    description: 'La constancia es lo que hace la diferencia.',
    perks:       ['Todo lo anterior', 'Asesoría prioritaria por WhatsApp', 'Código de referido mejorado'],
    pointsMin:   500,
  },
  elite: {
    id:          'elite',
    rank:        4,
    label:       'Elite',
    icon:        '🏆',
    color:       '#D4A843',
    description: 'En la cima de la comunidad MacroForge.',
    perks:       ['Todo lo anterior', 'Acceso anticipado a nuevos productos', 'Checkout VIP'],
    pointsMin:   1500,
  },
  vip: {
    id:          'vip',
    rank:        5,
    label:       'MacroForge VIP',
    icon:        '💎',
    color:       '#D4A843',
    description: 'El nivel más alto de la comunidad MacroForge.',
    perks:       ['Todo lo anterior', 'Concierge personal', 'Suscripción con máximo descuento', 'VIP permanente'],
    pointsMin:   5000,
  },
};

/**
 * Derive loyalty level from local behavioral signals.
 * Instant — no network call.
 * This is an ESTIMATE; backend is the source of truth.
 */
export function computeLocalLoyaltyLevel() {
  const state      = getCustomerState();
  const score      = getLeadScore();
  const favs       = getFavoriteStacks();
  const visitCount = state.visitCount;

  // VIP: known through segmentation
  if (score >= 70 && favs.some(f => f.tier === 'premium') && visitCount >= 5) {
    return LOYALTY_LEVELS.vip;
  }

  // Elite: high engagement, purchase history
  if (score >= 50 && state.hasWAIntent && visitCount >= 4) {
    return LOYALTY_LEVELS.elite;
  }

  // Committed: has purchased (WA click = purchase signal) and returns
  if (state.hasWAIntent && visitCount >= 2) {
    return LOYALTY_LEVELS.committed;
  }

  // Builder: returning with engagement
  if (visitCount >= 2 && (state.hasFavorites || state.hasRecentlyViewed || favs.length > 0)) {
    return LOYALTY_LEVELS.builder;
  }

  return LOYALTY_LEVELS.explorer;
}

/**
 * Get the next loyalty level milestone.
 */
export function getNextLevelInfo(currentLevel) {
  const levelOrder = ['explorer', 'builder', 'committed', 'elite', 'vip'];
  const currentIdx = levelOrder.indexOf(currentLevel);
  if (currentIdx === -1 || currentIdx >= levelOrder.length - 1) return null;
  return LOYALTY_LEVELS[levelOrder[currentIdx + 1]];
}

/**
 * Get a progress message toward the next level.
 * Motivational but not gamey.
 */
export function getLevelProgressMessage(level, nextLevel) {
  if (!nextLevel) return 'Has alcanzado el nivel más alto de MacroForge.';

  const messages = {
    builder:   'Tu próxima compra te acerca al nivel Constructor.',
    committed: 'La constancia te lleva al nivel Comprometido.',
    elite:     'Los clientes frecuentes alcanzan el nivel Elite.',
    vip:       'El compromiso a largo plazo lleva al nivel VIP.',
  };
  return messages[nextLevel.id] || `Seguí avanzando hacia ${nextLevel.label}.`;
}

/**
 * Track when loyalty badge is shown (for analytics).
 */
export function trackLoyaltyBadgeShown(level) {
  analytics.communityEvent('loyalty_badge_shown', { level: level.id });
}
