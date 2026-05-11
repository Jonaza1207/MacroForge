/**
 * MacroForge — CRC Price Formatter
 *
 * Single source of truth for ALL price formatting.
 * Costa Rica Colón: ₡ (U+20A1)
 * Thousands separator: dot  (₡23.500, not ₡23,500 or ₡23 500)
 *
 * Product prices in PRODUCTS catalog are stored as raw strings like:
 *   "₡ 23 500 1lb"   — spaces as thousands, with size descriptor
 *   "₡ 23 500"       — spaces as thousands, no descriptor
 *
 * Two steps for correct display:
 *   1. parseCRCPrice() — extract the numeric value from the raw string
 *   2. formatCRC()     — format as ₡XX.XXX with dot thousands
 */

// ── Parser ────────────────────────────────────────────────────────

/**
 * Parse a raw CRC price string to a number.
 *
 * Handles:
 *   "₡ 23 500 1lb"  → 23500
 *   "₡ 23 500"      → 23500
 *   "₡23,500"       → 23500
 *   "₡23.500"       → 23500
 *   "₡1 450 000"    → 1450000
 *
 * @param {string} priceStr
 * @returns {number}
 */
export function parseCRCPrice(priceStr) {
  const s = (priceStr || '').replace(/[₡¢]/g, '').trim();
  // Match a formatted thousands pattern: 1–3 digits followed by groups of sep+3digits
  // e.g. "23 500", "1 450 000", "23.500", "23,500"
  const formatted = s.match(/\d{1,3}(?:[\s,.]\d{3})+/);
  if (formatted) return parseInt(formatted[0].replace(/[\s,.]/g, ''), 10) || 0;
  // Bare 4+ digit number (no separator): "23500"
  const bare = s.match(/\d{4,}/);
  if (bare) return parseInt(bare[0], 10) || 0;
  return 0;
}

// ── Formatter ─────────────────────────────────────────────────────

/**
 * Format a numeric value as a ₡ price with dot thousands separator.
 * Deterministic — no locale dependency (safe on all Vercel/Node environments).
 *
 * @param {number|null|undefined} value
 * @param {string} [fallback]  — returned when value is 0 / null / NaN
 * @returns {string}
 *
 * @example
 *   formatCRC(12000)   → "₡12.000"
 *   formatCRC(23500)   → "₡23.500"
 *   formatCRC(1450000) → "₡1.450.000"
 *   formatCRC(0)       → "Consultar precio"
 *   formatCRC(null)    → "Consultar precio"
 */
export function formatCRC(value, fallback = 'Consultar precio') {
  if (value == null || value <= 0 || isNaN(value)) return fallback;
  const n = Math.round(value);
  return `₡${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

// ── Convenience ───────────────────────────────────────────────────

/**
 * Parse a raw price string and reformat it with dot thousands.
 * Convenience wrapper for display use — parse + format in one call.
 *
 * @param {string} priceStr
 * @param {string} [fallback]
 * @returns {string}
 *
 * @example
 *   normalizePriceDisplay("₡ 23 500 1lb") → "₡23.500"
 *   normalizePriceDisplay("₡ 23 500")     → "₡23.500"
 *   normalizePriceDisplay("")             → "Consultar precio"
 *   normalizePriceDisplay(undefined, "")  → ""
 */
export function normalizePriceDisplay(priceStr, fallback = 'Consultar precio') {
  return formatCRC(parseCRCPrice(priceStr), fallback);
}
