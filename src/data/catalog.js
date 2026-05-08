export const SECTIONS = {
  gym: {
    label: 'GYM & PERFORMANCE',
    sublabel: 'Sección 01 · Performance',
    color: '#E3001E',
    categories: [
      'Creatinas','Shakers y Botellas','Proteínas Whey','Pre-Entrenamientos',
      'Proteínas Isoladas','Accesorios de Gym','Gainers de Masa','Quemadores de Grasa',
      'Bebidas Energéticas','Vasodilatadores / Pump','Glutamina','Aminoácidos Esenciales',
      'Precursores Hormonales','Proteínas Veganas','BCAA','Snacks Proteicos',
      'Magnesio para Agarre','Proteínas de Carne','Electrolitos',
    ],
  },
  vita: {
    label: 'VITAMINAS & BIENESTAR',
    sublabel: 'Sección 02 · Salud',
    color: '#00C896',
    categories: [
      'Magnesio','Vitaminas Esenciales','Adaptógenos y Hormonas','Multivitamínicos',
      'Detox y Salud Hepática','Colágeno y Belleza','Omega y Grasas Saludables',
      'Minerales','Longevidad Celular','Suplementos Especializados',
      'Salud Mental y Cognitiva','Control Metabólico','Sueño y Relajación',
      'Digestión y Enzimas','Vitaminas y Suplementos','Articulaciones',
      'Salud Cardiovascular','Probióticos','Salud Digestiva',
    ],
  },
  dote: {
    label: 'DOTERRA',
    sublabel: 'Sección 03 · Aromaterapia',
    color: '#D4A843',
    categories: [
      'Aceites Esenciales Individuales','Mezclas doTERRA','Bienestar Interno doTERRA',
      'Cuidado Personal','Kits Especiales','Cuidado del Cabello','Cuidado de la Piel',
      'Almacenamiento y Botellas','Aromaterapia Emocional','Difusores',
      'Protección Solar doTERRA','Kits de AutoEnvío',
    ],
  },
};

export const WA_NUMBER = '50684436311';

// ══════════════════════════════════════════════════════════════════
// ALFAVITAMINS ACTIVATION BLUEPRINT — ready to enable
//
// When the full AlfaVitamins inventory is confirmed, activate by:
//
//   1. Add to SECTIONS:
//      alfa: {
//        label: 'ALFAVITAMINS',
//        sublabel: 'Sección 04 · Nutrición Avanzada',
//        color: '#C0392B',       ← brand-aligned deep red
//        categories: [
//          'Vitaminas Alfa', 'Minerales Alfa', 'Colágeno Alfa',
//          'Omega Alfa', 'Probióticos Alfa', 'Multivitamínicos Alfa',
//          // ... confirmed categories from inventory
//        ],
//      },
//
//   2. Set section key 's': 'alfa' for AlfaVitamins products in products.js
//
//   3. Update BrandTeaser.jsx to link to goSection('alfa')
//      instead of showing static teaser
//
//   4. Add to FEATURED in SectionPage.jsx:
//      alfa: ['...top categories...']
//
//   5. Update sitemap.xml with new section URL structure
//
//   6. ProductSchema will auto-include alfa products via existing system
//
// DO NOT activate until: full inventory confirmed, images present,
// categories finalized. Teaser-mode preserved until then.
// ══════════════════════════════════════════════════════════════════

export const CATEGORY_TYPES = {
  'Creatinas':'CREATINE','Shakers y Botellas':'SHAKER',
  'Proteínas Whey':'PROTEIN POWDER','Pre-Entrenamientos':'PRE-WORKOUT',
  'Proteínas Isoladas':'PROTEIN POWDER','Accesorios de Gym':'GEAR',
  'Gainers de Masa':'PROTEIN POWDER','Quemadores de Grasa':'CAPSULES',
  'Bebidas Energéticas':'ENERGY','Vasodilatadores / Pump':'PRE-WORKOUT',
  'Glutamina':'AMINOS','Aminoácidos Esenciales':'AMINOS',
  'Precursores Hormonales':'CAPSULES','Proteínas Veganas':'PROTEIN POWDER',
  'BCAA':'AMINOS','Snacks Proteicos':'PROTEIN BAR',
  'Magnesio para Agarre':'CHALK','Proteínas de Carne':'PROTEIN POWDER',
  'Electrolitos':'ELECTROLYTES','Magnesio':'CAPSULES',
  'Vitaminas Esenciales':'CAPSULES','Adaptógenos y Hormonas':'CAPSULES',
  'Multivitamínicos':'CAPSULES','Detox y Salud Hepática':'CAPSULES',
  'Colágeno y Belleza':'POWDER','Omega y Grasas Saludables':'SOFTGELS',
  'Minerales':'CAPSULES','Longevidad Celular':'CAPSULES',
  'Suplementos Especializados':'LIQUID','Salud Mental y Cognitiva':'CAPSULES',
  'Control Metabólico':'CAPSULES','Sueño y Relajación':'CAPSULES',
  'Digestión y Enzimas':'CAPSULES','Vitaminas y Suplementos':'CAPSULES',
  'Articulaciones':'CAPSULES','Salud Cardiovascular':'CAPSULES',
  'Probióticos':'CAPSULES','Salud Digestiva':'CAPSULES',
  'Aceites Esenciales Individuales':'ESSENTIAL OIL','Mezclas doTERRA':'ESSENTIAL OIL',
  'Bienestar Interno doTERRA':'SOFTGELS','Cuidado Personal':'SKIN CARE',
  'Kits Especiales':'KIT','Cuidado del Cabello':'HAIR CARE',
  'Cuidado de la Piel':'SKIN CARE','Almacenamiento y Botellas':'KIT',
  'Aromaterapia Emocional':'ROLL-ON','Difusores':'DIFFUSER',
  'Protección Solar doTERRA':'SKIN CARE','Kits de AutoEnvío':'KIT',
};
