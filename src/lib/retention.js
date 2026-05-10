/**
 * MacroForge — Retention Engine
 *
 * Passive retention architecture — no accounts, no gamification.
 * Creates the feeling: "This is MY supplement store."
 *
 * Systems:
 *   1. Visit intelligence  — count, recency, first/last seen
 *   2. Refill cycle hooks  — remind returning users when consumables may be running low
 *   3. Recognition signals — export signals for personalized UI copy
 *
 * All storage is local. Zero backend.
 *
 * Usage:
 *   import { getVisitorProfile, getRefillCandidates, shouldShowRefillHint } from '../lib/retention';
 */

import { getRecentlyViewedIds } from '../hooks/useRecentlyViewed';

// Re-export from hooks so callers only need one lib import
export { getRecentlyViewedIds };

// ── Storage keys ──────────────────────────────────────────────────
const KEYS = {
  visitCount:   'mf_visit_count',    // number of sessions
  firstVisit:   'mf_first_visit',    // timestamp of first visit
  lastVisit:    'mf_last_visit',     // timestamp of most recent visit
  refillLog:    'mf_refill_log',     // { productId: lastPurchaseIntentTs }
};

// ── Typical refill cycles (days) ─────────────────────────────────
// Based on standard supplement serving sizes.
// These are used to surface passive refill hints to returning users.
export const REFILL_CYCLES = {
  // GYM
  'Creatinas':             30,   // 5g/day → 300g = ~60 days; 150g = ~30 days
  'Proteínas Whey':        30,   // 2 scoops/day → 5lb = ~35 days
  'Proteínas Isoladas':    30,
  'Pre-Entrenamientos':    45,   // 1 scoop/day, 3–4x week → 30 servings = ~45 days
  'BCAA':                  30,
  'Glutamina':             30,
  'Gainers de Masa':       21,   // 3 scoops/day → 12lb = ~21 days
  'Electrolitos':          30,
  'Aminoácidos Esenciales':30,
  // VITA
  'Magnesio':              60,   // 1 capsule/day → 120 caps = 120 days; 60 caps = 60 days
  'Vitaminas Esenciales':  30,
  'Multivitamínicos':      30,
  'Omega y Grasas Saludables': 30,
  'Sueño y Relajación':    45,
  'Probióticos':           30,
  'Colágeno y Belleza':    30,
  'Salud Mental y Cognitiva': 30,
  'Control Metabólico':    30,
};

// ── Visitor profile ───────────────────────────────────────────────

/**
 * Full visitor profile based on localStorage signals.
 * Call once on app mount — cheap read operation.
 */
export function getVisitorProfile() {
  try {
    const visitCount = parseInt(localStorage.getItem(KEYS.visitCount) || '1', 10);
    const firstVisit = parseInt(localStorage.getItem(KEYS.firstVisit) || '0', 10);
    const lastVisit  = parseInt(localStorage.getItem(KEYS.lastVisit)  || '0', 10);
    const now        = Date.now();

    // On first-ever visit, stamp timestamps
    if (!firstVisit) {
      localStorage.setItem(KEYS.firstVisit, String(now));
      localStorage.setItem(KEYS.lastVisit,  String(now));
    } else {
      localStorage.setItem(KEYS.lastVisit, String(now));
    }

    const daysSinceFirst = firstVisit ? Math.floor((now - firstVisit) / 86400000) : 0;
    const daysSinceLast  = lastVisit  ? Math.floor((now - lastVisit)  / 86400000) : 0;

    return {
      visitCount,
      isNew:       visitCount === 1,
      isReturning: visitCount > 1,
      isRegular:   visitCount >= 5,
      daysSinceFirst,
      daysSinceLast,
      // Segment: 'new' | 'occasional' | 'regular' | 'loyal'
      segment: visitCount === 1   ? 'new'
             : visitCount < 5     ? 'occasional'
             : visitCount < 15    ? 'regular'
             : 'loyal',
    };
  } catch {
    return { visitCount: 1, isNew: true, isReturning: false, isRegular: false, segment: 'new' };
  }
}

// ── Refill cycle engine ───────────────────────────────────────────

/**
 * Record a purchase intent event for a product.
 * Called when a user clicks WhatsApp CTA for a product.
 * Used later to estimate refill timing.
 *
 * @param {string} productId
 * @param {string} categoryName
 */
export function recordPurchaseIntent(productId, categoryName) {
  if (!productId || !categoryName) return;
  if (!REFILL_CYCLES[categoryName]) return; // only track refillable categories
  try {
    const log = JSON.parse(localStorage.getItem(KEYS.refillLog) || '{}');
    log[String(productId)] = { ts: Date.now(), category: categoryName };
    localStorage.setItem(KEYS.refillLog, JSON.stringify(log));
  } catch {}
}

/**
 * Get products that are likely due for a refill.
 * Returns products where (now - purchaseIntentTs) >= refillCycleDays * 0.75
 * (Surface the hint at 75% of the cycle to catch them before they run out.)
 *
 * @returns {Array<{ productId, category, daysSincePurchase, refillDays }>}
 */
export function getRefillCandidates() {
  try {
    const log = JSON.parse(localStorage.getItem(KEYS.refillLog) || '{}');
    const now = Date.now();
    const candidates = [];

    for (const [productId, entry] of Object.entries(log)) {
      const cycle   = REFILL_CYCLES[entry.category];
      if (!cycle) continue;
      const elapsed = Math.floor((now - entry.ts) / 86400000);
      if (elapsed >= cycle * 0.75) {
        candidates.push({
          productId,
          category:           entry.category,
          daysSincePurchase:  elapsed,
          refillDays:         cycle,
        });
      }
    }
    return candidates.sort((a, b) => b.daysSincePurchase - a.daysSincePurchase);
  } catch { return []; }
}

/**
 * Whether to show a passive refill hint to this visitor.
 * True only if: returning + has refill candidates.
 */
export function shouldShowRefillHint() {
  const profile = getVisitorProfile();
  if (!profile.isReturning) return false;
  return getRefillCandidates().length > 0;
}

// ── Recognition signals ───────────────────────────────────────────

/**
 * UI copy based on visitor segment.
 * Used to make the platform feel personalized without accounts.
 */
export const RECOGNITION_COPY = {
  new: {
    heroSub:    'Más de 649 productos originales en Costa Rica.',
    returnHint: null,
  },
  occasional: {
    heroSub:    'Bienvenido de vuelta. Tus favoritos y vistos recientes están esperándote.',
    returnHint: 'Continuá donde lo dejaste',
  },
  regular: {
    heroSub:    'Hola de nuevo. Seguís en el lugar correcto.',
    returnHint: 'Tu historial · Tus favoritos',
  },
  loyal: {
    heroSub:    'Bienvenido de vuelta. Este es tu espacio.',
    returnHint: 'Tus favoritos · ¿Hora de reponer?',
  },
};

export function getRecognitionCopy(segment) {
  return RECOGNITION_COPY[segment] || RECOGNITION_COPY.new;
}
