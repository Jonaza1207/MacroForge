/**
 * MacroForge — Product Identity Resolver
 *
 * Single source of truth for product identity across:
 *   add/remove, selected state, duplicate detection,
 *   checkout handoff, favorites, persistence, analytics,
 *   subscriptions, referrals, loyalty.
 *
 * Priority chain:
 *   1. Numeric catalog ID   — always preferred, deterministic
 *   2. URL slug extracted   — from product.u
 *   3. Normalized brand+name — fallback identity
 *   4. Hash fallback         — last resort, deterministic
 *
 * Security: No secrets. No PII. Pure logic.
 */

// ── Helpers ───────────────────────────────────────────────────────

function _extractSlug(url) {
  if (!url) return null;
  const m = url.match(/\/tienda\/([^/?#]+)/);
  return m ? m[1] : null;
}

function _normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function _hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Get a stable, deterministic identity key for a product.
 *
 * @param {object} product  — Product object from PRODUCTS catalog (may be null)
 * @param {string|number} id — Numeric catalog ID (if known)
 * @returns {string}         — Stable identity key
 */
export function getStableProductIdentity(product, id) {
  // 1. Numeric catalog ID — always the canonical key
  if (id != null && id !== '') return String(id);

  if (!product) return 'unknown';

  // 2. URL slug extracted from product.u
  const slug = _extractSlug(product.u);
  if (slug) return `slug:${slug}`;

  // 3. Normalized brand + name
  const brand = _normalize(product.b);
  const name  = _normalize(product.n);
  if (brand && name) return `brand-name:${brand}|${name}`;

  // 4. Deterministic hash fallback
  return `fallback:${_hashCode(`${product.b || ''}|${product.n || ''}|${product.c || ''}`)}`;
}

/**
 * Check if two product references resolve to the same product.
 *
 * @param {{ product?: object, id?: string|number }} a
 * @param {{ product?: object, id?: string|number }} b
 * @returns {boolean}
 */
export function isSameProduct(a, b) {
  return (
    getStableProductIdentity(a.product, a.id) ===
    getStableProductIdentity(b.product, b.id)
  );
}

/**
 * Deduplicate a product ID array using stable identity.
 * Preserves first-seen order.
 *
 * @param {string[]} ids       — Array of catalog IDs
 * @param {object}   products  — PRODUCTS catalog map
 * @returns {string[]}
 */
export function deduplicateProductIds(ids, products) {
  const seen = new Set();
  return ids.filter(id => {
    const key = getStableProductIdentity(products?.[id], id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
