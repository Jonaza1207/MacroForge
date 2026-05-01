import fs from 'fs';
import { PRODUCTS } from './src/data/products.js';

// normalize function (igual que Claude)
const normalize = (str) =>
  str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');

const images = fs.readdirSync('./src/assets/products/')
  .filter(f => f.endsWith('.png'))
  .map(f => f.replace('.png', ''));

const imageNorm = images.map(img => ({
  original: img,
  norm: normalize(img)
}));

// extract slugs
const slugs = new Set();
Object.values(PRODUCTS).forEach(p => {
  if (!p.u) return;
  const m = p.u.match(/\/tienda\/([^/?#]+)/);
  if (m) slugs.add(m[1]);
});

// read IMAGE_MAP
const content = fs.readFileSync('./src/data/images.js', 'utf-8');
const existing = new Set([...content.matchAll(/'([^']+)':/g)].map(m => m[1]));

console.log('\n=== MISSING WITH SUGGESTIONS ===\n');

slugs.forEach(slug => {
  if (existing.has(slug)) return;

  const normSlug = normalize(slug);

  // score matches
  const scored = imageNorm.map(img => {
    let score = 0;

    if (img.norm.includes(normSlug)) score += 2;
    if (normSlug.includes(img.norm)) score += 2;

    // token overlap
    const sTokens = normSlug.match(/[a-z]+/g) || [];
    const iTokens = img.norm.match(/[a-z]+/g) || [];

    const common = sTokens.filter(t => iTokens.includes(t));
    score += common.length;

    return { ...img, score };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];

  if (best && best.score >= 2) {
    console.log(`'${slug}': '${best.original}',  // score: ${best.score}`);
  } else {
    console.log(`// NO MATCH → ${slug}`);
  }
});