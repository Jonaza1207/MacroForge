// MacroForge — Enterprise Catalog Sync Script
// Run: node scripts/sync_products.js
const fs = require('fs');
const path = require('path');
const BASE = 'https://suplementosfh.com/tienda/';

const NEW_PRODUCTS = [
  // ── vita: Colágeno y Belleza ──────────────────────────────
  {id:564,n:'GNC Womens Hair Skin and Nails',b:'GNC',c:'Colágeno y Belleza',s:'vita',p:['₡ 20 000 (120c)'],slug:'gnc-womens-hair-skin-nails',f:[]},
  {id:565,n:'GNC Womens Collagen',b:'GNC',c:'Colágeno y Belleza',s:'vita',p:['₡ 20 000 (180c)'],slug:'gnc-womens-collagen',f:[]},
  {id:566,n:'Resvitale Resveratrol Veggie Capsules',b:'Resvitale',c:'Longevidad Celular',s:'vita',p:['₡ 31 000 (30c)','₡ 54 000 (60c)'],slug:'resvitale-resveratrol',f:[]},
  {id:567,n:'Resvital Ultra Collagen Enhance',b:'Resvitale',c:'Colágeno y Belleza',s:'vita',p:['₡ 45 000 (90c)'],slug:'resvital-ultra-collagen',f:[]},
  {id:568,n:'GNC Premier Collagen',b:'GNC',c:'Colágeno y Belleza',s:'vita',p:['₡ 24 000 (28s)','₡ 13 500 (14s)'],slug:'gnc-premier-collagen',f:[]},
  {id:569,n:'GNC Premier Collagen Shotberry',b:'GNC',c:'Colágeno y Belleza',s:'vita',p:['₡ 3 250'],slug:'gnc-premier-collagen-shotberry',f:[]},
  {id:570,n:'GNC Premier Collagen Shotberry 10 unidades',b:'GNC',c:'Colágeno y Belleza',s:'vita',p:['₡ 32 000'],slug:'gnc-premier-collagen-shotberry-10',f:[]},
  // ── vita: Multivitamínicos ────────────────────────────────
  {id:571,n:'GNC Womens Ultra Mega Active Timed Release',b:'GNC',c:'Multivitamínicos',s:'vita',p:['₡ 28 000 (90c)'],slug:'gnc-womens-ultra-mega-active',f:[]},
  {id:572,n:'GNC Womens Ultra Mega Timed Release',b:'GNC',c:'Multivitamínicos',s:'vita',p:['₡ 24 000 (90c)'],slug:'gnc-womens-ultra-mega',f:[]},
  {id:573,n:'GNC Womens Ultra Mega 50 Plus Timed Release',b:'GNC',c:'Multivitamínicos',s:'vita',p:['₡ 18 000 (60c)'],slug:'gnc-womens-ultra-mega-50',f:[]},
  {id:574,n:'GNC Mega Men Sport Timed Release',b:'GNC',c:'Multivitamínicos',s:'vita',p:['₡ 28 000 (90c)'],slug:'gnc-mega-men-sport',f:[]},
  {id:575,n:'GNC Mega Men 50 Plus Timed Release',b:'GNC',c:'Multivitamínicos',s:'vita',p:['₡ 28 000 (120c)'],slug:'gnc-mega-men-50-plus-timed',f:[]},
  {id:576,n:'GNC Mega Men 50 Plus',b:'GNC',c:'Multivitamínicos',s:'vita',p:['₡ 18 000 (60c)'],slug:'gnc-mega-men-50-plus',f:[]},
  {id:577,n:'GNC Kids Multivitamin Fruit Flavors',b:'GNC',c:'Multivitamínicos',s:'vita',p:['₡ 15 000 (120g)'],slug:'gnc-kids-multivitamin',f:[]},
  {id:578,n:'GNC Multivitamin Teen 12-17 Fruit Flavors',b:'GNC',c:'Multivitamínicos',s:'vita',p:['₡ 18 000 (120g)'],slug:'gnc-teen-multivitamin',f:[]},
  // ── vita: Adaptógenos y Hormonas ─────────────────────────
  {id:579,n:'Neugenix Total-T',b:'Neugenix',c:'Adaptógenos y Hormonas',s:'vita',p:['₡ 48 000 (90c)'],slug:'neugenix-total-t',f:[]},
  {id:580,n:'Neugenix Free Total-T-Boost',b:'Neugenix',c:'Adaptógenos y Hormonas',s:'vita',p:['₡ 45 000 (90c)'],slug:'neugenix-free-total-t',f:[]},
  {id:581,n:'GNC Triple Ginseng Root',b:'GNC',c:'Adaptógenos y Hormonas',s:'vita',p:['₡ 22 000 (90c)'],slug:'gnc-triple-ginseng',f:[]},
  // ── vita: Longevidad Celular ──────────────────────────────
  {id:582,n:'GNC NMN Nicotinamide Mononucleotide',b:'GNC',c:'Longevidad Celular',s:'vita',p:['₡ 47 000 (60c)'],slug:'gnc-nmn',f:[]},
  // ── vita: Vitaminas Esenciales ────────────────────────────
  {id:583,n:'GNC Lycopene',b:'GNC',c:'Vitaminas Esenciales',s:'vita',p:['₡ 22 000 (60c)'],slug:'gnc-lycopene',f:[]},
  {id:584,n:'GNC Papaya Enzyme',b:'GNC',c:'Digestión y Enzimas',s:'vita',p:['₡ 11 000 (240t)'],slug:'gnc-papaya-enzyme',f:[]},
  {id:585,n:'Ginkgo Biloba Plus',b:'GNC',c:'Salud Mental y Cognitiva',s:'vita',p:['₡ 14 000 (120t)'],slug:'gnc-ginkgo-biloba',f:[]},
  {id:586,n:'GNC Turmeric Curcuma',b:'GNC',c:'Articulaciones',s:'vita',p:['₡ 45 000 (60t)'],slug:'gnc-turmeric-curcuma',f:[]},
  {id:587,n:'GNC Vitamina D3 2000 IU',b:'GNC',c:'Vitaminas Esenciales',s:'vita',p:['₡ 21 000 (180t)'],slug:'gnc-vitamina-d3-2000',f:[]},
  {id:588,n:'GNC Vitamina C with Rose Hips',b:'GNC',c:'Vitaminas Esenciales',s:'vita',p:['₡ 12 000 (100t)','₡ 13 000 (250t)'],slug:'gnc-vitamina-c-rose-hips',f:[]},
  {id:589,n:'GNC Vitamin B-12 5000mcg',b:'GNC',c:'Vitaminas Esenciales',s:'vita',p:['₡ 16 000 (60c)'],slug:'gnc-vitamin-b12-5000',f:[]},
  {id:590,n:'GNC Vitamin B-12 1000mcg',b:'GNC',c:'Vitaminas Esenciales',s:'vita',p:['₡ 9 500 (60c)'],slug:'gnc-vitamin-b12-1000',f:[]},
  {id:591,n:'GNC Vitamina D3 1000 IU',b:'GNC',c:'Vitaminas Esenciales',s:'vita',p:['₡ 16 000 (180t)'],slug:'gnc-vitamina-d3-1000',f:[]},
  {id:592,n:'GNC Folic Acid',b:'GNC',c:'Vitaminas Esenciales',s:'vita',p:['₡ 5 500 (100t)'],slug:'gnc-folic-acid',f:[]},
  {id:593,n:'GNC Biotin',b:'GNC',c:'Vitaminas Esenciales',s:'vita',p:['₡ 20 000 (120c)'],slug:'gnc-biotin',f:[]},
  {id:594,n:'GNC Vitamin E-400 Natural',b:'GNC',c:'Vitaminas Esenciales',s:'vita',p:['₡ 24 000 (180c)'],slug:'gnc-vitamin-e-400',f:[]},
  // ── vita: Minerales ───────────────────────────────────────
  {id:595,n:'GNC Zinc Vegetarian Tablets',b:'GNC',c:'Minerales',s:'vita',p:['₡ 8 000 (100t)'],slug:'gnc-zinc',f:[]},
  {id:596,n:'GNC Calcium with Vitamin D-3',b:'GNC',c:'Minerales',s:'vita',p:['₡ 6 900 (120c)'],slug:'gnc-calcium-vitamin-d3',f:[]},
  {id:597,n:'GNC Chromium Picolinate',b:'GNC',c:'Minerales',s:'vita',p:['₡ 10 500 (180t)'],slug:'gnc-chromium-picolinate',f:[]},
  {id:598,n:'GNC Calcimate Complete',b:'GNC',c:'Minerales',s:'vita',p:['₡ 38 500 (240c)'],slug:'gnc-calcimate-complete',f:[]},
  {id:599,n:'GNC Coral Calcio',b:'GNC',c:'Minerales',s:'vita',p:['₡ 28 000 (180c)'],slug:'gnc-coral-calcio',f:[]},
  // ── vita: Magnesio ────────────────────────────────────────
  {id:600,n:'GNC Super Magnesium',b:'GNC',c:'Magnesio',s:'vita',p:['₡ 14 000 (90c)'],slug:'gnc-super-magnesium',f:[]},
  {id:601,n:'GNC Potassium and Magnesium',b:'GNC',c:'Magnesio',s:'vita',p:['₡ 16 000 (120t)'],slug:'gnc-potassium-magnesium',f:[]},
  // ── vita: Control Metabólico ──────────────────────────────
  {id:602,n:'GNC Total Lean CLA',b:'GNC',c:'Control Metabólico',s:'vita',p:['₡ 22 000 (90c)'],slug:'gnc-total-lean-cla',f:[]},
  {id:603,n:'GNC Total Lean B60',b:'GNC',c:'Control Metabólico',s:'vita',p:['₡ 23 000 (60c)'],slug:'gnc-total-lean-b60',f:[]},
  {id:604,n:'GNC Total Lean CLA CT',b:'GNC',c:'Control Metabólico',s:'vita',p:['₡ 28 000 (90c)'],slug:'gnc-total-lean-cla-ct',f:[]},
  {id:605,n:'GNC Total Lean L-Carnitina',b:'GNC',c:'Control Metabólico',s:'vita',p:['₡ 39 000 (60t)'],slug:'gnc-total-lean-carnitina',f:[]},
  // ── vita: Articulaciones ──────────────────────────────────
  {id:606,n:'GNC Triple Strength Omega Fish Oil',b:'GNC',c:'Articulaciones',s:'vita',p:['₡ 54 000 (120c)','₡ 36 000 (60c)'],slug:'gnc-omega-fish-oil',f:[]},
  {id:607,n:'GNC Triflex Fast Acting',b:'GNC',c:'Articulaciones',s:'vita',p:['₡ 60 000 (240c)','₡ 45 000 (120c)'],slug:'gnc-triflex',f:[]},
  {id:608,n:'Instaflex Advanced',b:'Instaflex',c:'Articulaciones',s:'vita',p:['₡ 39 000 (30c)'],slug:'instaflex-advanced',f:[]},
  {id:609,n:'GNC Triple Strength Omega Fish Oil Resveratrol',b:'GNC',c:'Articulaciones',s:'vita',p:['₡ 51 000 (60c)'],slug:'gnc-omega-resveratrol',f:[]},
  {id:610,n:'GNC Triple Strength Fish Omega Oil CoQ10',b:'GNC',c:'Articulaciones',s:'vita',p:['₡ 41 500 (60c)'],slug:'gnc-omega-coq10',f:[]},
  // ── vita: Probióticos ─────────────────────────────────────
  {id:611,n:'GNC Probiotic Solutions Womens 30 Billion',b:'GNC',c:'Probióticos',s:'vita',p:['₡ 27 000 (30c)'],slug:'gnc-probiotics-womens',f:[]},
  {id:612,n:'GNC Probiotic Complex 1 Billion',b:'GNC',c:'Probióticos',s:'vita',p:['₡ 7 500 (100c)'],slug:'gnc-probiotic-1b',f:[]},
  {id:613,n:'GNC Probiotic Solutions with Enzymes 25 Billion',b:'GNC',c:'Probióticos',s:'vita',p:['₡ 25 000 (30c)'],slug:'gnc-probiotic-solutions-25b',f:[]},
  {id:614,n:'GNC Probiotic Complex',b:'GNC',c:'Probióticos',s:'vita',p:['₡ 40 000 (30c) 50B','₡ 34 000 (20c) 75B','₡ 37 000 (20c) 100B'],slug:'gnc-probiotic-complex',f:['50 Billion','75 Billion','100 Billion']},
  // ── vita: Digestión y Enzimas ─────────────────────────────
  {id:615,n:'GNC Multi Enzimas Formula',b:'GNC',c:'Digestión y Enzimas',s:'vita',p:['₡ 27 000 (90c)'],slug:'gnc-multi-enzimas',f:[]},
  {id:616,n:'Health Plus Super Colon Cleanse',b:'Health Plus',c:'Salud Digestiva',s:'vita',p:['₡ 11 000 (60c)'],slug:'health-plus-colon-cleanse',f:[]},
  {id:617,n:'GNC Super Digestive Enzymes',b:'GNC',c:'Digestión y Enzimas',s:'vita',p:['₡ 10 000 (100c)'],slug:'gnc-super-digestive-enzymes',f:[]},
  // ── vita: Suplementos Especializados ─────────────────────
  {id:618,n:'Ghost Greens Original',b:'Ghost',c:'Suplementos Especializados',s:'vita',p:['₡ 29 000 (30s)'],slug:'ghost-greens-original',f:[]},
  {id:619,n:'GNC Project 1 Greens Superfood Chocolate',b:'GNC',c:'Suplementos Especializados',s:'vita',p:['₡ 29 500 (30s)'],slug:'gnc-project-1-greens',f:['Chocolate']},
  // ── gym: Proteínas Veganas ────────────────────────────────
  {id:620,n:'Ghost Vegan Protein Chocolate Cereal Milk',b:'Ghost',c:'Proteínas Veganas',s:'gym',p:['₡ 30 000 2.2lbs'],slug:'ghost-vegan-protein',f:['Chocolate Cereal Milk']},
  {id:621,n:'Optimum Nutrition 100% Plant Protein',b:'Optimum Nutrition',c:'Proteínas Veganas',s:'gym',p:['₡ 29 500 1.63lbs'],slug:'on-plant-protein',f:['Vainilla, Chocolate']},
  // ── gym: Proteínas Whey ───────────────────────────────────
  {id:622,n:'GNC PP AMP Gold Advanced',b:'GNC',c:'Proteínas Whey',s:'gym',p:['₡ 29 000 1.96lbs','₡ 54 000 4.9lbs'],slug:'gnc-pp-amp-gold-advanced',f:[]},
  {id:623,n:'GNC PP AMP Gold Advanced Double Rich',b:'GNC',c:'Proteínas Whey',s:'gym',p:['₡ 29 000 2lbs','₡ 54 000 5.13lbs'],slug:'gnc-pp-amp-gold-double-rich',f:['Double Rich Chocolate']},
  {id:624,n:'GNC PP Bulk 1340',b:'GNC',c:'Gainers de Masa',s:'gym',p:['₡ 29 000 7.14lbs'],slug:'gnc-pp-bulk-1340',f:[]},
  {id:625,n:'GNC PP 100% Protein Vanilla Cream',b:'GNC',c:'Proteínas Whey',s:'gym',p:['₡ 27 500 1.87lbs'],slug:'gnc-pp-100-protein-vanilla',f:['Vanilla Cream']},
  {id:626,n:'GNC PP 100% Whey Banana',b:'GNC',c:'Proteínas Whey',s:'gym',p:['₡ 27 500 1.7lbs'],slug:'gnc-pp-whey-banana',f:['Banana']},
  {id:627,n:'GNC PP 100% Whey Chocolate',b:'GNC',c:'Proteínas Whey',s:'gym',p:['₡ 17 000 (12s)'],slug:'gnc-pp-whey-chocolate',f:['Chocolate']},
  {id:628,n:'GNC PP 100% Whey Unflavored',b:'GNC',c:'Proteínas Whey',s:'gym',p:['₡ 27 500 (25s)'],slug:'gnc-pp-whey-unflavored',f:['Sin Sabor']},
  {id:629,n:'GNC PP 100% Whey Cookies and Cream',b:'GNC',c:'Proteínas Whey',s:'gym',p:['₡ 17 000 (12s)'],slug:'gnc-pp-whey-cookies-cream',f:['Cookies and Cream']},
  {id:630,n:'GNC PP 100% Whey Strawberry',b:'GNC',c:'Proteínas Whey',s:'gym',p:['₡ 17 000 (12s)'],slug:'gnc-pp-whey-strawberry',f:['Strawberry']},
  {id:631,n:'Mutant Whey',b:'Mutant',c:'Proteínas Whey',s:'gym',p:['₡ 24 000 2lbs'],slug:'mutant-whey',f:['Triple Chocolate, Cookies and Cream']},
  {id:632,n:'Six Star 100% Whey Protein Strawberry',b:'Six Star',c:'Proteínas Whey',s:'gym',p:['₡ 24 000 1.8lbs'],slug:'six-star-whey-strawberry',f:['Strawberry']},
  {id:633,n:'Six Star 100% Whey Protein Triple Chocolate',b:'Six Star',c:'Proteínas Whey',s:'gym',p:['₡ 24 000 1.8lbs'],slug:'six-star-whey-chocolate',f:['Triple Chocolate']},
  {id:634,n:'Superior 14 Whey Core Protein',b:'Superior 14',c:'Proteínas Whey',s:'gym',p:['₡ 24 000 2lbs','₡ 41 000 5lbs','₡ 79 000 11lbs'],slug:'superior14-whey-core',f:[]},
  {id:635,n:'Superior 14 Casein Complex',b:'Superior 14',c:'Proteínas Whey',s:'gym',p:['₡ 41 000'],slug:'superior14-casein',f:[]},
  {id:636,n:'RYSE LProtein ChockCookie',b:'RYSE',c:'Proteínas Whey',s:'gym',p:['₡ 34 500 (27s)'],slug:'ryse-lprotein-chockcookie',f:['Chocolate Cookie']},
  // ── gym: Proteínas Isoladas ───────────────────────────────
  {id:637,n:'Superior 14 Iso Definition',b:'Superior 14',c:'Proteínas Isoladas',s:'gym',p:['₡ 49 500 5lbs','₡ 89 500 10lbs'],slug:'superior14-iso-definition',f:[]},
  {id:638,n:'Superior 14 Hydro Whey Zero',b:'Superior 14',c:'Proteínas Isoladas',s:'gym',p:['₡ 52 500 5lbs'],slug:'superior14-hydro-whey-zero',f:[]},
  // ── gym: Gainers de Masa ──────────────────────────────────
  {id:639,n:'Mutant Mass Gainer',b:'Mutant',c:'Gainers de Masa',s:'gym',p:['₡ 59 000 15lbs'],slug:'mutant-mass-gainer',f:[]},
  {id:640,n:'Mutant Mass Extreme 2500',b:'Mutant',c:'Gainers de Masa',s:'gym',p:['₡ 19 000 2lbs','₡ 32 000 6lbs'],slug:'mutant-mass-extreme-2500',f:[]},
  // ── gym: Pre-Entrenamientos ───────────────────────────────
  {id:641,n:'GNC Pre-workout',b:'GNC',c:'Pre-Entrenamientos',s:'gym',p:['₡ 21 000 (30s)'],slug:'gnc-preworkout',f:[]},
  {id:642,n:'GNC PP Pre-workout Tropical Fruit Punch',b:'GNC',c:'Pre-Entrenamientos',s:'gym',p:['₡ 21 000 (30s)'],slug:'gnc-pp-preworkout',f:['Tropical Fruit Punch']},
  {id:643,n:'RYSE GODZILLA Pre-workout',b:'RYSE',c:'Pre-Entrenamientos',s:'gym',p:['₡ 34 000 (40s)'],slug:'ryse-godzilla',f:['Strawberry Kiwi']},
  {id:644,n:'RYSE Pre-workout Sour Green Apple',b:'RYSE',c:'Pre-Entrenamientos',s:'gym',p:['₡ 25 000 (30s)'],slug:'ryse-preworkout-green-apple',f:['Sour Green Apple']},
  {id:645,n:'Mutant Madness Pre-workout',b:'Mutant',c:'Pre-Entrenamientos',s:'gym',p:['₡ 19 000 (30s)'],slug:'mutant-madness',f:[]},
  // ── gym: Creatinas ────────────────────────────────────────
  {id:646,n:'Mutant Creakong',b:'Mutant',c:'Creatinas',s:'gym',p:['₡ 25 000 (75s)','₡ 44 000 (250s)'],slug:'mutant-creakong',f:['Sin Sabor']},
  {id:647,n:'Mutant Creatine Monohydrate',b:'Mutant',c:'Creatinas',s:'gym',p:['₡ 25 000 (60s)'],slug:'mutant-creatine',f:['Sin Sabor']},
  {id:648,n:'Superior 14 100% Creatine Monohydrate',b:'Superior 14',c:'Creatinas',s:'gym',p:['₡ 19 000 (50s)'],slug:'superior14-creatine',f:['Sin Sabor']},
  {id:649,n:'GNC Beyond Raw Creatine HCL',b:'GNC',c:'Creatinas',s:'gym',p:['₡ 24 000 (60s)'],slug:'gnc-beyond-raw-creatine',f:['Sin Sabor']},
  // ── gym: Aminoácidos Esenciales ───────────────────────────
  {id:650,n:'GNC Essential Amino Complete Raspberry Iced Tea',b:'GNC',c:'Aminoácidos Esenciales',s:'gym',p:['₡ 22 000 (30s)'],slug:'gnc-essential-amino-complete',f:['Raspberry Iced Tea']},
];

// Validate
const ids = new Set(), slugs = new Set();
NEW_PRODUCTS.forEach(p => {
  if (ids.has(p.id) || slugs.has(p.slug)) {
    console.error('DUPLICATE:', p.id, p.slug);
    process.exit(1);
  }
  ids.add(p.id); slugs.add(p.slug);
});

// Build product string to append
let insertStr = '';
NEW_PRODUCTS.forEach(p => {
  const url = BASE + p.slug;
  const entry = {n:p.n, b:p.b, c:p.c, s:p.s, p:p.p, u:url, f:p.f};
  insertStr += ',"' + p.id + '":' + JSON.stringify(entry);
});

// Insert into products.js before the final closing }}
const prodFile = path.join(__dirname, '../src/data/products.js');
let prod = fs.readFileSync(prodFile, 'utf8');
const lastClose = prod.lastIndexOf('}};');
if (lastClose === -1) { console.error('Could not find closing}}'); process.exit(1); }
const updated = prod.slice(0, lastClose) + insertStr + prod.slice(lastClose);
fs.writeFileSync(prodFile, updated);

const total = [...updated.matchAll(/"(\d+)":\{/g)].length;
console.log('SUCCESS: Added', NEW_PRODUCTS.length, 'products | Total now:', total);

// Also generate image mappings
const NEW_IMAGE_MAP = {
  // Women/Men GNC
  'gnc-womens-hair-skin-nails': 'GNC-womens-hair-skin-&-nails',
  'gnc-womens-collagen': 'GNC-womens-collagen',
  'resvitale-resveratrol': 'Resvitale-resveratrol-veggie-capsules',
  'resvital-ultra-collagen': 'Resvitale-ultra-collagen-enhance',
  'gnc-premier-collagen': 'GNC-Premier-Collagen',
  'gnc-premier-collagen-shotberry': 'GNC-Premier-Collagen-ShotBerry',
  'gnc-premier-collagen-shotberry-10': 'GNC-Premier-Collagen-ShotBerry-10-unidades',
  'gnc-womens-ultra-mega': 'GNC-womens-ultra-mega-timed-release',
  'gnc-womens-ultra-mega-50': 'GNC-womens-ultra-mega-50-plus-timed-release',
  'gnc-mega-men-sport': 'GNC-mega-men-sport-timed-release',
  'gnc-mega-men-50-plus-timed': 'GNC-mega-men-50-plus-timed-release',
  'gnc-mega-men-50-plus': 'GNC-mega-men-50-plus',
  'gnc-kids-multivitamin': 'GNC-kids-multivitamin-fruit-flavors',
  'gnc-teen-multivitamin': 'GNC-multivitamin-teen-12-17-fruit-flavors',
  'neugenix-total-t': 'Neugenix-Total-T',
  'neugenix-free-total-t': 'Neugenix-Free-Total-T-Boost',
  'gnc-triple-ginseng': 'GNC-Triple-Ginseng-Root',
  'gnc-nmn': 'GNC-NMN-Nicotinamide-Mononucleotide',
  'gnc-lycopene': 'GNC-lycopene',
  'gnc-papaya-enzyme': 'GNC-Papaya-Enzyme',
  'gnc-ginkgo-biloba': 'Ginkgo-Biloba-Plus',
  'gnc-turmeric-curcuma': 'GNC-Turmeric-Curcuma',
  'gnc-vitamina-d3-2000': 'GNC-vitamina-D3-2000-IU',
  'gnc-vitamina-c-rose-hips': 'GNC-vitamina-C-with-rose-hips',
  'gnc-vitamin-b12-5000': 'GNC-vitamin-B-12-vegetarian-lozenges-5000mcg',
  'gnc-vitamin-b12-1000': 'GNC-vitamin-B-12-vegetarian-lozenges-1000mcg',
  'gnc-vitamina-d3-1000': 'GNC-vitamina-D3-1000-IU',
  'gnc-folic-acid': 'GNC-folic-acid',
  'gnc-biotin': 'GNC-biotin',
  'gnc-vitamin-e-400': 'GNC-Vitamin-E-400-Natural',
  'gnc-zinc': 'GNC-zinc-vegetarian-tablets',
  'gnc-calcium-vitamin-d3': 'GNC-calcium-with-vitamin-D-3',
  'gnc-chromium-picolinate': 'GNC-chromium-picolinate',
  'gnc-calcimate-complete': 'GNC-calcimate-complete',
  'gnc-coral-calcio': 'GNC-coral-calcio',
  'gnc-super-magnesium': 'GNC-super-magnesium',
  'gnc-potassium-magnesium': 'GNC-potassium-&-magnesium-sspart',
  'gnc-total-lean-cla': 'GNC-Total-Lean-CLA',
  'gnc-total-lean-b60': 'GNC-Total-Lean-B60',
  'gnc-total-lean-cla-ct': 'GNC-Total-Lean-CLA-CT',
  'gnc-total-lean-carnitina': 'GNC-Total-Lean-L-Carnitina',
  'gnc-omega-fish-oil': 'GNC-Triple-Strength-Omega-Fish-Oil',
  'gnc-triflex': 'GNC-Triflex-Fast-Acting',
  'instaflex-advanced': 'Instaflex-Advanced',
  'gnc-omega-resveratrol': 'GNC-Triple-Strength-Omega-Fish-Oil-Resveratrol',
  'gnc-omega-coq10': 'GNC-Triple-Strength-Fish-Omega-Oil-CoQ10',
  'gnc-probiotics-womens': 'GNC-probiotic-solutions-womens-30-billion-veg-capsules',
  'gnc-probiotic-1b': 'GNC-Probiotic-Complex-1-Billion',
  'gnc-probiotic-solutions-25b': 'GNC-Probiotic-Solutions-with-Enzymes-25-billion',
  'gnc-probiotic-complex': 'GNC-Probiotic-Complex',
  'gnc-multi-enzimas': 'GNC-Multi-Enzimas-Formula',
  'health-plus-colon-cleanse': 'Health-Plus-Super-Colon-Cleanse',
  'gnc-super-digestive-enzymes': 'GNC-Super-Digestive-Enzymes',
  'ghost-greens-original': 'Ghost-greens-original',
  'gnc-project-1-greens': 'GNC-Project-1-Greens-Superfood-Chocolate',
  'ghost-vegan-protein': 'Ghost-vegan-protein-chocolate-cereal-milk',
  'gnc-pp-amp-gold-advanced': 'GNC-PP-AMP-Gold-advanced',
  'gnc-pp-amp-gold-double-rich': 'GNC-PP-AMP-GOLD-advanced-double-rich',
  'gnc-pp-bulk-1340': 'GNC-PP-Bulk-1340',
  'gnc-pp-100-protein-vanilla': 'GNC-PP-100-Protein-vanilla-cream',
  'gnc-pp-whey-banana': 'GNC-PP-100-Whey-Banana',
  'gnc-pp-whey-chocolate': 'GNC-PP-100-Whey-Chocolate',
  'gnc-pp-whey-unflavored': 'GNC-PP-100-Whey-Unflavored',
  'gnc-pp-whey-cookies-cream': 'GNC-Pro-Performance-100-Whey-Cookies-Cream',
  'gnc-pp-whey-strawberry': 'GNC-Pro-Performance-100-Whey-Strawberry',
  'mutant-whey': 'Mutant-Whey',
  'six-star-whey-strawberry': 'Six-Star-100-Whey-Protein-Strawberry',
  'six-star-whey-chocolate': 'Six-Star-100-Whey-Protein-Triple-Chocolate',
  'superior14-whey-core': 'Superior14-Whey-Core-Protein',
  'superior14-casein': 'Superior14-Casein-Complex',
  'ryse-lprotein-chockcookie': 'RYSE-LProtein-ChockCookie',
  'superior14-iso-definition': 'Superior14-Iso-Definition',
  'superior14-hydro-whey-zero': 'Superior14-Hydro-Whey-Zero',
  'mutant-mass-gainer': 'Mutant-Mass-Gainer',
  'mutant-mass-extreme-2500': 'Mutant-Mass-Extreme-2500',
  'gnc-preworkout': 'GNC-Pre-workout',
  'gnc-pp-preworkout': 'GNC-PP-Pre-workout-tropical-fruit-punch',
  'ryse-godzilla': 'RYSE-GODZILLA-Pre-workout-Strawberry-kiwi',
  'ryse-preworkout-green-apple': 'RYSE-Pre-workout-Sour-Green-Apple',
  'mutant-madness': 'Mutant-Madness-Pre-workout',
  'mutant-creakong': 'Mutant-Creakong',
  'mutant-creatine': 'Mutant-Creatine-Monohydrate',
  'superior14-creatine': 'Superior14-100-Creatine-Monohydrate',
  'gnc-beyond-raw-creatine': 'GNC-beyond-raw-creatine-HCL',
  'gnc-essential-amino-complete': 'GNC-essential-amino-complete-raspberry-Iced-Tea',
};

console.log('Image mappings to add:', Object.keys(NEW_IMAGE_MAP).length);
console.log(JSON.stringify(NEW_IMAGE_MAP, null, 2));
