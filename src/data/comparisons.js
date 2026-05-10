/**
 * MacroForge — Comparison Intelligence
 *
 * Lightweight comparison data for the 5 highest-hesitation product decisions.
 * Rendered inline in CategoryPage as a "ComparisonStrip" — no modal, no overlay.
 * Reduces friction, accelerates confidence, routes undecided buyers to WhatsApp.
 *
 * Tone: honest, educational, expert. Not salesy.
 * Goal: the customer thinks "I finally understand the difference" before deciding.
 *
 * Keyed by category name (matches SECTIONS catalog categories exactly).
 */
export const COMPARISONS = {

  'Proteínas Whey': {
    question: '¿Cuál proteína es mejor para vos?',
    options: [
      {
        label: 'Whey Concentrada',
        desc:  'Más económica, 70–80% proteína. Ideal para la mayoría. Puede tener algo de lactosa.',
        tag:   'Para la mayoría',
      },
      {
        label: 'Whey Isolada',
        desc:  'Más pura, 90%+ proteína. Sin lactosa. Absorción más rápida. Mejor para definición.',
        tag:   'Si sos intolerante o buscás lo mejor',
      },
    ],
    guideSlug: 'proteina-whey-costa-rica',
  },

  'Proteínas Isoladas': {
    question: '¿Concentrada o Isolada?',
    options: [
      {
        label: 'Whey Concentrada',
        desc:  'Precio accesible, muy buena calidad. Suficiente para la mayoría de objetivos.',
        tag:   'Mejor relación precio-resultado',
      },
      {
        label: 'Whey Isolada',
        desc:  'Pureza máxima, sin lactosa, absorción rápida. Ideal si ya tenés base o buscás precisión.',
        tag:   'Performance avanzado',
      },
    ],
    guideSlug: 'proteina-whey-costa-rica',
  },

  'Creatinas': {
    question: '¿Qué tipo de creatina elegir?',
    options: [
      {
        label: 'Monohidrato',
        desc:  'La más estudiada del mundo. Barata, efectiva, segura. Es el estándar de oro.',
        tag:   'Para el 95% de las personas',
      },
      {
        label: 'HCl / Otras formas',
        desc:  'Dosis menores, menos retención hídrica. Útil si el monohidrato te da malestar digestivo.',
        tag:   'Si el monohidrato no te sienta bien',
      },
    ],
    guideSlug: 'creatina-costa-rica',
  },

  'Pre-Entrenamientos': {
    question: '¿Pre-entreno con o sin estimulantes?',
    options: [
      {
        label: 'Con cafeína',
        desc:  'Más energía, mejor enfoque, mayor rendimiento. Ideal para quienes toleran bien la cafeína.',
        tag:   'La opción más popular',
      },
      {
        label: 'Sin estimulantes',
        desc:  'Pump y rendimiento sin cafeína. Ideal para entrenar de noche o si sos sensible.',
        tag:   'Para entrenar tarde o sin tolerancia a cafeína',
      },
    ],
    guideSlug: null,
  },

  'Magnesio': {
    question: '¿Qué forma de magnesio es mejor?',
    options: [
      {
        label: 'Glicinato',
        desc:  'Más suave con el estómago. Excelente para sueño y reducción de estrés. Alta absorción.',
        tag:   'Para sueño y relajación',
      },
      {
        label: 'Citrato',
        desc:  'Buena absorción y precio accesible. Puede tener efecto laxante en dosis altas.',
        tag:   'Opción más económica y efectiva',
      },
    ],
    guideSlug: null,
  },

  'Gainers de Masa': {
    question: '¿Gainer o proteína normal?',
    options: [
      {
        label: 'Proteína Whey',
        desc:  'Mejor para quienes ya comen suficientes calorías. Más limpio, sin calorías extra.',
        tag:   'Si tu dieta ya cubre calorías',
      },
      {
        label: 'Gainer de Masa',
        desc:  'Para quienes no logran subir de peso comiendo. Alta densidad calórica + proteína.',
        tag:   'Si sos ectomorfo o no llegás a tus calorías',
      },
    ],
    guideSlug: null,
  },
};
