/**
 * MacroForge — Recently Viewed Products
 *
 * Pure localStorage module — no React hooks needed.
 * Products are added to the front of the list on modal open.
 * Deduplication ensures the same product doesn't appear twice.
 * A custom event allows React components to subscribe to changes.
 *
 * Storage: 'mf_recently_viewed' → JSON array of product ID strings
 */

const KEY   = 'mf_recently_viewed';
const MAX   = 12;
const EVENT = 'mf:recently-viewed';

export function addRecentlyViewed(id) {
  try {
    const current = getRecentlyViewedIds();
    const deduped = current.filter(x => x !== String(id));
    deduped.unshift(String(id));
    localStorage.setItem(KEY, JSON.stringify(deduped.slice(0, MAX)));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* storage disabled or full — silent */ }
}

export function getRecentlyViewedIds(n = MAX) {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]').slice(0, n); }
  catch { return []; }
}

export function clearRecentlyViewed() {
  try { localStorage.removeItem(KEY); window.dispatchEvent(new Event(EVENT)); } catch {}
}

export const RECENTLY_VIEWED_EVENT = EVENT;
