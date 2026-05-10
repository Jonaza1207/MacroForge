/**
 * MacroForge — Editorial Groups
 *
 * Curated product collections that feel editorial, not algorithmic.
 * Each group has a clear purpose, a premium tone, and honest selection.
 *
 * These are the store's own recommendations — not ranked by sales or
 * manufactured urgency. They reflect genuine supplement wisdom.
 *
 * Rules:
 *   - Every slug in a group must exist in PRODUCT_LABELS (verified picks)
 *   - Groups should feel like a knowledgeable friend's recommendation
 *   - No fake scarcity, no manufactured urgency, no noise
 *   - Max 4–6 products per group to avoid overwhelm
 *
 * Used by: EditorialSection.jsx on CatalogHome
 */

// These slugs are all in PRODUCT_LABELS — verified quality picks.
export const EDITORIAL_GROUPS = [

  {
    id:       'essentials',
    eyebrow:  'Para todos',
    title:    'Lo que no puede faltar',
    subtitle: 'Los básicos que la mayoría necesita, sin importar el objetivo.',
    slugs:    [
      'omega3nutricost',            // omega — universally needed
      'melatoninanutricost',        // sleep — universal benefit
      'creatina-monohidratada-nutricost', // creatine — most studied supplement
      'colageno-rule-1',            // collagen — joints + skin
      'multivitaminico-hombre-rule-one',  // multi — coverage
    ],
    waFlow:   'welcome',
    waGoal:   null,
    showFor:  ['new', 'exploring', 'returning'], // customer segments
  },

  {
    id:       'muscle',
    eyebrow:  'Para ganar músculo',
    title:    'El stack más consultado',
    subtitle: 'Los tres pilares del crecimiento muscular, bien elegidos.',
    slugs:    [
      'gold-standard-whey',                // protein — benchmark
      'creatina-monohidratada-nutricost',   // creatine — pure, clean
      'zma',                               // ZMA — recovery + sleep
    ],
    waFlow:   'stackConsult',
    waGoal:   'ganar músculo y masa muscular',
    showFor:  ['new', 'exploring', 'returning', 'regular', 'loyal'],
  },

  {
    id:       'performance',
    eyebrow:  'Para rendir más',
    title:    'Fuerza y rendimiento',
    subtitle: 'Entrenás más duro. Recuperás más rápido.',
    slugs:    [
      'c4',                                // pre-workout — iconic
      'creatina-monohidratada-nutricost',   // creatine
      'iso-100',                           // isolate — post-workout
    ],
    waFlow:   'stackConsult',
    waGoal:   'más energía y rendimiento en el gym',
    showFor:  ['returning', 'regular', 'loyal'],
  },

  {
    id:       'wellness',
    eyebrow:  'Para el bienestar diario',
    title:    'La base de la salud',
    subtitle: 'No tienen que ser atletas. Todo el mundo debería tener esto.',
    slugs:    [
      'omega3nutricost',            // omega
      'multivitaminico-hombre-rule-one', // multi
      'melatoninanutricost',        // sleep
      'zma',                        // ZMA — recovery
    ],
    waFlow:   'welcome',
    waGoal:   'bienestar general y salud',
    showFor:  ['new', 'exploring'],
  },

  {
    id:       'beginner',
    eyebrow:  'Si estás empezando',
    title:    'Por aquí se empieza',
    subtitle: 'Sin complicaciones. Seguros. Con resultados reales.',
    slugs:    [
      'gold-standard-whey',                // whey — most beginner-friendly protein
      'creatina-monohidratada-nutricost',   // pure creatine — safest form
      'glutaminaon',                       // glutamine — simple recovery
      'vitaminacalfa',                     // vitamin C — universal
    ],
    waFlow:   'beginnerConsult',
    waGoal:   null,
    showFor:  ['new', 'exploring'],
  },

];

/**
 * Get editorial groups appropriate for a given customer segment.
 * Returns max 2 groups to avoid home-screen clutter.
 *
 * @param {string} segment - 'new'|'exploring'|'returning'|'regular'|'loyal'
 * @returns {Array}
 */
export function getEditorialGroupsForSegment(segment) {
  const eligible = EDITORIAL_GROUPS.filter(g => g.showFor.includes(segment));

  // New / exploring visitors: prioritize beginner + essentials
  if (segment === 'new') {
    return eligible.filter(g => ['beginner', 'essentials'].includes(g.id)).slice(0, 2);
  }

  // Exploring: show essentials + muscle
  if (segment === 'exploring') {
    return eligible.filter(g => ['essentials', 'muscle'].includes(g.id)).slice(0, 2);
  }

  // Returning / regular: performance + muscle
  return eligible.filter(g => ['muscle', 'performance'].includes(g.id)).slice(0, 1);
}
