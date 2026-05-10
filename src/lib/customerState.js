/**
 * MacroForge — Customer State Engine
 *
 * Derives behavioral state from local signals (localStorage only).
 * No accounts. No server. No tracking beyond the device.
 *
 * State drives subtle adaptations:
 *   - What sections surface first on the home screen
 *   - What consultation style the WhatsApp flows use
 *   - What editorial sections appear
 *   - What trust signals to emphasize
 *   - What the hero subtitle says
 *
 * States (in order of progression):
 *   new           → first-ever visit, no history
 *   exploring     → 2nd visit, has some recently viewed, no favorites
 *   considering   → has favorites, low WA intent
 *   highIntent    → has clicked WA at least once (purchase signal)
 *   returning     → 3–7 visits, engaged but not converted
 *   regular       → 8–20 visits
 *   loyal         → 21+ visits
 *
 * Usage:
 *   import { getCustomerState } from '../lib/customerState';
 *   const state = getCustomerState(); // pure read, no side effects
 */

import { getFavoriteIds } from '../hooks/useFavorites';
import { getRecentlyViewedIds } from '../hooks/useRecentlyViewed';

const KEYS = {
  visitCount: 'mf_visit_count',
  events:     'mf_events',
  refillLog:  'mf_refill_log',
};

function readVisitCount() {
  try { return parseInt(localStorage.getItem(KEYS.visitCount) || '1', 10); }
  catch { return 1; }
}

function hasWaIntent(events) {
  return events.some(e => e.n === 'whatsapp_click' && e.p?.source === 'modal');
}

function hasStackExplored(events) {
  return events.some(e => e.n === 'stack_cta_click');
}

function hasRefillCandidates() {
  try {
    const log = JSON.parse(localStorage.getItem(KEYS.refillLog) || '{}');
    const now = Date.now();
    return Object.values(log).some(entry => {
      const CYCLES = {
        'Creatinas': 30, 'Proteínas Whey': 30, 'Proteínas Isoladas': 30,
        'Pre-Entrenamientos': 45, 'Magnesio': 60, 'Vitaminas Esenciales': 30,
        'Multivitamínicos': 30, 'Omega y Grasas Saludables': 30,
        'Sueño y Relajación': 45, 'Gainers de Masa': 21,
      };
      const cycle = CYCLES[entry.category];
      if (!cycle) return false;
      const elapsed = (now - entry.ts) / 86400000;
      return elapsed >= cycle * 0.75;
    });
  } catch { return false; }
}

function readEvents() {
  try { return JSON.parse(localStorage.getItem(KEYS.events) || '[]'); }
  catch { return []; }
}

/**
 * Derive the customer's behavioral state.
 * Pure read — no localStorage writes, no side effects.
 *
 * @returns {CustomerState}
 */
export function getCustomerState() {
  const visitCount      = readVisitCount();
  const favoriteIds     = getFavoriteIds();
  const recentIds       = getRecentlyViewedIds(12);
  const events          = readEvents();
  const hasFavorites    = favoriteIds.length > 0;
  const hasRecentlyViewed = recentIds.length >= 2;
  const hasWA           = hasWaIntent(events);
  const hasStack        = hasStackExplored(events);
  const hasRefill       = hasRefillCandidates();

  // Segment
  let segment;
  if      (visitCount >= 21)  segment = 'loyal';
  else if (visitCount >= 8)   segment = 'regular';
  else if (visitCount >= 3)   segment = 'returning';
  else if (visitCount === 2)  segment = 'exploring';
  else                        segment = 'new';

  // Behavioral tags (composable — multiple can be true)
  const tags = new Set();
  if (hasFavorites)       tags.add('hasFavorites');
  if (hasRecentlyViewed)  tags.add('hasRecentlyViewed');
  if (hasWA)              tags.add('highIntent');
  if (hasStack)           tags.add('stackExplorer');
  if (hasRefill)          tags.add('refillReady');
  if (visitCount > 1)     tags.add('returning');

  // Consultation style: what WhatsApp flow to surface
  let consultationStyle;
  if      (hasWA && visitCount >= 3) consultationStyle = 'reorder';
  else if (hasStack)                 consultationStyle = 'stack';
  else if (visitCount === 1)         consultationStyle = 'beginner';
  else                               consultationStyle = 'standard';

  // Hero subtitle: subtle personalization, no invasiveness
  let heroSubtitle;
  if      (segment === 'loyal')     heroSubtitle = 'Tu espacio. Tus suplementos.';
  else if (segment === 'regular')   heroSubtitle = 'Bienvenido de vuelta.';
  else if (segment === 'returning') heroSubtitle = 'Continuá donde lo dejaste.';
  else if (segment === 'exploring') heroSubtitle = 'Tus favoritos y recientes están aquí.';
  else                              heroSubtitle = null; // default copy

  // Editorial sections to surface on home (ordered by priority)
  const editorialPriority = [];
  if (hasRefill)              editorialPriority.push('refill');
  if (hasFavorites)           editorialPriority.push('favorites');
  if (hasRecentlyViewed)      editorialPriority.push('recentlyViewed');
  if (hasStack)               editorialPriority.push('stackContinuation');
  if (visitCount === 1)       editorialPriority.push('beginnerGuide');
  if (!hasFavorites && !hasRecentlyViewed) editorialPriority.push('essentials');

  return {
    segment,
    visitCount,
    hasFavorites,
    hasRecentlyViewed,
    hasFavoriteIds:  favoriteIds,
    hasWAIntent:     hasWA,
    isStackExplorer: hasStack,
    isRefillReady:   hasRefill,
    isReturning:     visitCount > 1,
    isHighIntent:    hasWA,
    tags:            [...tags],
    consultationStyle,
    heroSubtitle,
    editorialPriority,
  };
}

/**
 * @typedef {Object} CustomerState
 * @property {'new'|'exploring'|'returning'|'regular'|'loyal'} segment
 * @property {number}   visitCount
 * @property {boolean}  hasFavorites
 * @property {boolean}  hasRecentlyViewed
 * @property {string[]} hasFavoriteIds
 * @property {boolean}  hasWAIntent
 * @property {boolean}  isStackExplorer
 * @property {boolean}  isRefillReady
 * @property {boolean}  isReturning
 * @property {boolean}  isHighIntent
 * @property {string[]} tags
 * @property {'beginner'|'standard'|'stack'|'reorder'} consultationStyle
 * @property {string|null}  heroSubtitle
 * @property {string[]} editorialPriority
 */
