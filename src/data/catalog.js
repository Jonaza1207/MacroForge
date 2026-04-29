export const SECTIONS = {
  gym: {
    label: 'GYM & PERFORMANCE',
    sublabel: 'Sección 01 · Performance',
    color: '#ff4500',
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
    color: '#ff6a00',
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
    color: '#cc1500',
    categories: [
      'Aceites Esenciales Individuales','Mezclas doTERRA','Bienestar Interno doTERRA',
      'Cuidado Personal','Kits Especiales','Cuidado del Cabello','Cuidado de la Piel',
      'Almacenamiento y Botellas','Aromaterapia Emocional','Difusores',
      'Protección Solar doTERRA','Kits de AutoEnvío',
    ],
  },
};

export const WA_NUMBER = '50684436311';

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

// Fondo MF: negro con marca de agua "MF" en rojo/naranja
const _mfSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
  `<rect width="100" height="100" fill="#0d0a0a"/>` +
  `<text x="50" y="64" font-family="Montserrat,Arial Black,sans-serif" font-size="58" font-weight="900" fill="rgba(255,80,0,0.55)" text-anchor="middle" letter-spacing="-2">MF</text>` +
  `</svg>`
);
export const MF_BG = {
  background: `#0d0a0a url("data:image/svg+xml,${_mfSvg}") center/80% no-repeat`,
};
