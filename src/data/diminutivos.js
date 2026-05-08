/**
 * MacroForge — Diminutivos Normalization System
 *
 * Official abbreviation table from inventory specification.
 * Used for: image filename matching, catalog sync, unit display.
 *
 * Rule: "Todos los precios tienen que decir +iva"
 * → +iva is appended at the UI layer (ProductCard, ProductModal).
 */

export const DIMINUTIVOS = {
  'lbs': 'libras',
  'c':   'cápsulas',
  's':   'servidas',
  't':   'tabletas',
  'g':   'gomitas',
  'ss':  'servidas sin sabor',
  'sc':  'servidas con sabor',
  'ml':  'mililitros',
  'l':   'litros',
  '-':   'gramos',
  'b':   'billones',
  'k':   'kilos',
};

// Reverse map: full form → abbreviation (for display normalization)
export const DIMINUTIVOS_REVERSE = Object.fromEntries(
  Object.entries(DIMINUTIVOS).map(([k, v]) => [v, k])
);

/**
 * Expand a raw price/quantity string using the Diminutivos table.
 * Example: "30c" → "30 cápsulas"
 *          "2lbs" → "2 libras"
 *          "60ss" → "60 servidas sin sabor"
 */
export function expandUnit(str) {
  if (!str) return str;
  const normalized = str.trim().toLowerCase();

  // Try multi-char abbreviations first (ss, sc) before single-char
  for (const abbr of ['ss', 'sc', 'lbs', 'ml', 'lbs']) {
    const re = new RegExp(`^(\\d+)\\s*${abbr}$`, 'i');
    if (re.test(normalized)) {
      return normalized.replace(re, `$1 ${DIMINUTIVOS[abbr]}`);
    }
  }
  // Single-char abbreviations
  for (const abbr of ['c', 's', 't', 'g', 'l', 'b', 'k']) {
    const re = new RegExp(`^(\\d+)\\s*${abbr}$`, 'i');
    if (re.test(normalized)) {
      return normalized.replace(re, `$1 ${DIMINUTIVOS[abbr]}`);
    }
  }
  // Bare dash = gramos
  const gramRe = /^(\d+)\s*-$/;
  if (gramRe.test(normalized)) {
    return normalized.replace(gramRe, '$1 gramos');
  }

  return str; // unchanged if no match
}

/**
 * Normalize a product name for deterministic image filename matching.
 * Strips accents, lowercases, removes punctuation, collapses spaces.
 */
export function normalizeForMatch(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks (U+0300–U+036F)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')      // remove punctuation
    .replace(/\s+/g, '-')              // spaces → hyphens
    .replace(/-+/g, '-')               // collapse multiple hyphens
    .trim();
}

/**
 * Generate candidate slug variants for image matching.
 * Given a product URL, returns an array of normalized strings to try.
 */
export function slugCandidates(productUrl) {
  const slug = productUrl?.match(/\/tienda\/([^/?#]+)/)?.[1];
  if (!slug) return [];
  const base = normalizeForMatch(slug);
  return [
    base,
    base.replace(/-copy$/, ''),        // strip -copy suffix variant
    base.replace(/-\d+$/, ''),         // strip trailing numeric suffix
  ].filter((v, i, a) => a.indexOf(v) === i); // dedupe
}
