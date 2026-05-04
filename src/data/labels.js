/**
 * MacroForge — Curated product labels
 *
 * These are HONEST signals based on product characteristics,
 * brand recognition, and store recommendations.
 * NOT based on fake sales data.
 *
 * 'recommended' = quality pick, solid choice for most customers
 * 'popular'     = widely known brand/product in the supplement world
 * 'beginner'    = great entry point, easy to use, low-commitment
 *
 * Keys are the URL slugs from products.js
 */
export const PRODUCT_LABELS = {

  // ── Recomendado ────────────────────────────────────────────
  // Solid products the store confidently recommends
  'gold-standard-whey':               'recommended', // ON Gold Standard — the benchmark
  'iso-100':                          'recommended', // Dymatize ISO 100 — premium isolate
  'creatina-monohidratada-nutricost':  'recommended', // clean, pure creatine — great value
  'omega3nutricost':                   'recommended', // essential fatty acids, every person needs these
  'zma':                               'recommended', // ZMA Nutrabio — quality sleep & recovery
  'melatoninanutricost':               'recommended', // sleep support — widely useful
  'multivitaminico-hombre-rule-one':   'recommended', // comprehensive multi for active men
  'colageno-rule-1':                   'recommended', // collagen — broadly beneficial

  // ── Popular ────────────────────────────────────────────────
  // Products with strong brand recognition in the supplement market
  'c4':                                'popular',     // C4 — most recognized pre-workout globally
  'ruleone':                           'popular',     // Rule One Creatine — widely trusted brand
  'serius-mass':                       'popular',     // Serious Mass ON — iconic gainer
  'nitrotech':                         'popular',     // Nitro Tech MuscleTech — market leader
  'iso-flex':                          'popular',     // IsoFlex ALLMAX — highly rated isolate
  'bamf':                              'popular',     // BAMF BuckedUp — trending pre-workout
  'total-war':                         'popular',     // Total War Redcon1 — known in the community
  'iso-sensation':                     'popular',     // Iso Sensation UltimateNutrition — classic

  // ── Para empezar ───────────────────────────────────────────
  // Products ideal for customers new to supplementation
  'BetaAlaninaNutricost':              'beginner',    // simple amino, easy intro
  'clanutricost':                      'beginner',    // CLA — straightforward fat support
  'carnitinsimply':                    'beginner',    // L-Carnitina — simple & beginner-friendly
  'glutaminaon':                       'beginner',    // Glutamina ON — easy recovery support
  'vitaminacalfa':                     'beginner',    // Vitamina C — universal, everyone needs it
};

// Thresholds for dynamic badge promotion via click data
export const CLICK_THRESHOLD_POPULAR  = 3; // minimum card/modal views to show "Popular"
export const CLICK_THRESHOLD_TRENDING = 5; // minimum CTA clicks to elevate further
