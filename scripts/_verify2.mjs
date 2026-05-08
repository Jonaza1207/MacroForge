import { readFileSync } from 'fs';
const raw = readFileSync('./src/data/products.js', 'utf8');
const P = JSON.parse(raw.slice(raw.indexOf('{')));

const entries = Object.entries(P);
console.log('=== TOTAL:', entries.length, '=== MaxID:', Math.max(...entries.map(([k])=>+k)));

// Show the mystery 34 products (530-563)
console.log('\n=== IDs 530-563 (previously unknown batch) ===');
entries.filter(([k])=>+k>=530&&+k<=563).forEach(([k,p])=>
  console.log(`  ${k}: ${p.n} | ${p.b} | ${p.s}/${p.c} | slug:${p.u?.match(/\/tienda\/([^/?#]+)/)?.[1]||'NO_URL'}`)
);

// 15 target product check
const checks = [
  ['Syntha', 'Syntha-6'],
  ['ALANI', 'ALANI Whey'],
  ['Mutant Whey', 'Mutant'],
  ['RYSE', 'RYSE'],
  ['Superior 14', 'Superior 14'],
  ['Mega Men', 'GNC Mega Men'],
  ['Magnesium Glycinate', 'GNC Mag Glycinate'],
  ['Milk Thistle', 'Milk Thistle'],
  ['Resvitale', 'Resvitale'],
  ['Ghost Vegan', 'Ghost Vegan'],
  ['Ghost Green', 'Ghost Greens'],
  ['Nitrix', 'BSN Nitrix'],
  ['C4 Ripped', 'C4 Ripped'],
  ['Cranberry', 'GNC Cranberry'],
  ['Maca Root', 'GNC Maca Root'],
];
console.log('\n=== 15 TARGET PRODUCTS ===');
checks.forEach(([term, label]) => {
  const found = entries.filter(([,p])=>
    (p.n||'').toLowerCase().includes(term.toLowerCase()) ||
    (p.b||'').toLowerCase().includes(term.toLowerCase())
  ).map(([id,p])=>`ID${id}:${p.n}(${p.b})`);
  console.log(`${found.length?'✓':'✗'} ${label}: ${found.join(' | ')||'MISSING'}`);
});

// Products with no URL (will show fallback — OK)
const noUrl = entries.filter(([,p])=>!p.u);
console.log('\nProducts with no URL (use fallback):', noUrl.length);

// Duplicate slug check
const slugs = entries.map(([,p])=>p.u?.match(/\/tienda\/([^/?#]+)/)?.[1]||null).filter(Boolean);
const slugSet = new Set(slugs);
console.log('Duplicate slugs:', slugs.length - slugSet.size);
