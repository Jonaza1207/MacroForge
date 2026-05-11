/**
 * MacroForge — Favorite Stacks System
 *
 * Phase 6 — Retention + Recurring Revenue Engine
 * Allows customers to save multiple named stacks for quick reorder.
 *
 * This is the core of the repeat-purchase flywheel:
 *   - Customer builds a stack
 *   - Customer saves it as "Mi Stack Músculo"
 *   - Customer returns next month
 *   - One tap → full stack restored → checkout → WhatsApp → done
 *
 * Storage: 'mf_favorite_stacks' → array of stack objects (max 5)
 * No accounts, no backend, no PII.
 *
 * Stack object format:
 *   id:          string   — unique ID (generated on save)
 *   name:        string   — user-given name (e.g., "Mi Stack Músculo")
 *   type:        'guided' | 'manual'
 *   selections:  object   — { goal, experience, budget, frequency } (guided only)
 *   productIds:  string[] — resolved product IDs at save time
 *   tier:        string   — 'premium' | 'completo' | 'balanceado' | 'esencial'
 *   savedAt:     number   — timestamp
 *   lastOpened:  number   — timestamp of last restore
 *   openCount:   number   — how many times restored (loyalty signal)
 *
 * ── Future backend evolution (Phase 7) ──────────────────────────
 * TODO: POST /api/stacks/save (Vercel Edge Function)
 *   Body: { anonymous_id, name, type, selections, product_ids, tier }
 *   Table: customer_preferences(id, user_id, name, stack_data, open_count, last_opened)
 *   Enables: cross-device sync, push notifications, email reminders
 *   Requires: Supabase (server-side service key — never frontend)
 *
 * TODO: Shopify customer metafield sync
 *   Tag Shopify customers with their saved stacks for retargeting
 *   Via: Shopify Admin API (server-side only)
 */

const KEY     = 'mf_favorite_stacks';
const VERSION = 1;
const MAX     = 5; // max saved favorite stacks

/** Custom event dispatched whenever favorites change — for reactive UI */
export const FAVORITE_STACKS_EVENT = 'mf:favorite-stacks-changed';

// ── Internal helpers ──────────────────────────────────────────────
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(s => s.version === VERSION) : [];
  } catch { return []; }
}

function write(stacks) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stacks));
    window.dispatchEvent(new Event(FAVORITE_STACKS_EVENT));
  } catch {}
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Save a new favorite stack.
 * Oldest stack is dropped if the max limit is reached.
 *
 * @param {string} name       — user-given label
 * @param {object} stackData  — { type, selections, productIds, tier }
 * @returns {string}          — generated stack ID
 */
export function saveFavoriteStack(name, stackData) {
  const existing = read();
  const id       = `fav_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  const entry    = {
    id,
    name:       (name || '').trim() || 'Mi Stack',
    version:    VERSION,
    type:       stackData.type,
    selections: stackData.selections || null,
    productIds: Array.isArray(stackData.productIds) ? [...stackData.productIds] : [],
    tier:       stackData.tier || 'esencial',
    savedAt:    Date.now(),
    lastOpened: null,
    openCount:  0,
  };
  // Put newest first, cap at MAX
  write([entry, ...existing].slice(0, MAX));
  return id;
}

/**
 * Get all favorite stacks (newest first).
 * Returns empty array if nothing is saved.
 */
export function getFavoriteStacks() {
  return read();
}

/**
 * Returns true if at least one favorite stack is saved.
 */
export function hasFavoriteStacks() {
  return read().length > 0;
}

/**
 * Get a single favorite stack by ID.
 * Returns null if not found.
 */
export function getFavoriteStack(id) {
  return read().find(s => s.id === id) || null;
}

/**
 * Mark a favorite as opened (increments openCount, updates lastOpened).
 * Returns the stack data so the caller can restore it.
 */
export function openFavoriteStack(id) {
  const stacks = read();
  const idx    = stacks.findIndex(s => s.id === id);
  if (idx === -1) return null;
  stacks[idx] = {
    ...stacks[idx],
    openCount:  (stacks[idx].openCount || 0) + 1,
    lastOpened: Date.now(),
  };
  write(stacks);
  return stacks[idx];
}

/**
 * Rename a favorite stack.
 */
export function renameFavoriteStack(id, newName) {
  const trimmed = (newName || '').trim();
  if (!trimmed) return;
  write(read().map(s => s.id === id ? { ...s, name: trimmed } : s));
}

/**
 * Delete a favorite stack.
 */
export function deleteFavoriteStack(id) {
  write(read().filter(s => s.id !== id));
}

/**
 * Tier-based default stack name suggestions.
 * Helps users name stacks quickly without thinking.
 */
export function getDefaultStackName(goal, tier) {
  const GOAL_NAMES = {
    muscle:      'Músculo',
    cut:         'Definición',
    performance: 'Rendimiento',
    wellness:    'Bienestar',
    recovery:    'Recuperación',
    sleep:       'Sueño',
  };
  const TIER_PREFIX = { premium: '💎', completo: '⚡', balanceado: '✓', esencial: '→' };
  const goalLabel   = GOAL_NAMES[goal] || '';
  const prefix      = TIER_PREFIX[tier] || '';
  if (goalLabel) return `${prefix} Mi Stack ${goalLabel}`.trim();
  return 'Mi Stack Personalizado';
}
