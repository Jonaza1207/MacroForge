/**
 * MacroForge — Click tracking (localStorage-based)
 *
 * Tracks product interactions for dynamic badging and future analytics.
 * Fully client-side — no backend, no personal data.
 *
 * Storage key:  'mf_analytics'
 * Structure:    { [slug]: { views: number, cta: number } }
 *
 * "views" = card click (modal open)
 * "cta"   = Consultar/WhatsApp button click
 */

const STORAGE_KEY = 'mf_analytics';

// ── Write helpers ─────────────────────────────────────────────

/** Record a product card click (modal view) */
export function trackView(slug) {
  if (!slug) return;
  try {
    const data = _read();
    if (!data[slug]) data[slug] = { views: 0, cta: 0 };
    data[slug].views = (data[slug].views || 0) + 1;
    _write(data);
  } catch {}
}

/** Record a "Consultar" / WhatsApp CTA click */
export function trackCta(slug) {
  if (!slug) return;
  try {
    const data = _read();
    if (!data[slug]) data[slug] = { views: 0, cta: 0 };
    data[slug].cta = (data[slug].cta || 0) + 1;
    _write(data);
  } catch {}
}

// ── Read helpers ──────────────────────────────────────────────

/** Return interaction counts for a single slug */
export function getProductClicks(slug) {
  if (!slug) return { views: 0, cta: 0 };
  try {
    return _read()[slug] || { views: 0, cta: 0 };
  } catch {
    return { views: 0, cta: 0 };
  }
}

/** Check if a slug meets the threshold for "Popular" via clicks */
export function isDynamicPopular(slug, threshold = 3) {
  const { views, cta } = getProductClicks(slug);
  return (views + cta) >= threshold;
}

/** Return top N clicked products, sorted by total interactions */
export function getTopClicked(n = 10) {
  try {
    return Object.entries(_read())
      .map(([slug, d]) => ({
        slug,
        views: d.views || 0,
        cta:   d.cta   || 0,
        total: (d.views || 0) + (d.cta || 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, n);
  } catch {
    return [];
  }
}

/** Clear all analytics data (dev helper) */
export function clearAnalytics() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ── Dev-only logging ──────────────────────────────────────────

/**
 * Logs top clicked products to the browser console.
 * Only runs in development mode — invisible to end users.
 * Call from App.jsx useEffect or browser console:  __mfAnalytics.log()
 */
export function devLogAnalytics() {
  if (!import.meta.env.DEV) return;
  const top = getTopClicked(10);
  if (top.length === 0) {
    console.log('[MacroForge Analytics] No click data yet.');
    return;
  }
  console.groupCollapsed('%c[MacroForge Analytics] Top products', 'color:#E3001E;font-weight:700');
  console.table(top);
  console.groupEnd();
}

// ── Internal ──────────────────────────────────────────────────

function _read() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}
function _write(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
