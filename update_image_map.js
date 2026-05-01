import fs from 'fs';
import { PRODUCTS } from './src/data/products.js';

// -------- CONFIG --------
const IMAGE_DIR = './src/assets/products/';
const IMAGES_JS_PATH = './src/data/images.js';

// -------- HELPERS --------
const normalize = (str) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// -------- LOAD FILES --------

// all image filenames (no .png)
const imageFiles = fs.readdirSync(IMAGE_DIR)
  .filter(f => f.endsWith('.png'))
  .map(f => f.replace(/\.png$/, ''));

// extract slugs from products
const slugMap = {};
Object.values(PRODUCTS).forEach(p => {
  if (!p.u) return;
  const match = p.u.match(/\/tienda\/([^/?#]+)/);
  if (!match) return;

  const slug = match[1];
  slugMap[slug] = normalize(slug);
});

// -------- READ EXISTING IMAGE_MAP --------

const content = fs.readFileSync(IMAGES_JS_PATH, 'utf-8');
const mapMatch = content.match(/const IMAGE_MAP = \{([\s\S]*?)\};/);

if (!mapMatch) {
  console.error('❌ Could not parse IMAGE_MAP');
  process.exit(1);
}

// parse existing entries
const existingEntries = mapMatch[1]
  .split('\n')
  .filter(line => line.includes(':'))
  .map(line => {
    const m = line.match(/'([^']+)':\s*'([^']+)'/);
    return m ? { slug: m[1], filename: m[2] } : null;
  })
  .filter(Boolean);

const existingMap = {};
existingEntries.forEach(e => {
  existingMap[e.slug] = e.filename;
});

// -------- FIND NEW MAPPINGS --------

const newMappings = [];
const skipped = [];

imageFiles.forEach(img => {
  const normImg = normalize(img);

  // skip if already used
  const alreadyMapped = Object.values(existingMap).includes(img);
  if (alreadyMapped) return;

  // try match against slugs
  let matchSlug = null;

  Object.entries(slugMap).forEach(([slug, normSlug]) => {
    if (normSlug === normImg) {
      matchSlug = slug;
    }
  });

  if (matchSlug) {
    newMappings.push({ slug: matchSlug, filename: img });
  } else {
    skipped.push(img);
  }
});

// -------- OUTPUT --------

console.log('\n=== SUMMARY ===');
console.log(`Existing mappings: ${existingEntries.length}`);
console.log(`New mappings added: ${newMappings.length}`);
console.log(`Skipped images: ${skipped.length}`);

console.log('\n=== NEW MAPPINGS ===');
newMappings.forEach(m => {
  console.log(`'${m.slug}': '${m.filename}',`);
});

console.log('\n=== SKIPPED (no clear match) ===');
skipped.slice(0, 20).forEach(s => console.log(`- ${s}`));

// -------- BUILD FINAL MAP --------

const finalMap = { ...existingMap };
newMappings.forEach(m => {
  finalMap[m.slug] = m.filename;
});

// pretty print
const finalString = Object.entries(finalMap)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([slug, file]) => `  '${slug}': '${file}',`)
  .join('\n');

const newFileContent = content.replace(
  /const IMAGE_MAP = \{[\s\S]*?\};/,
  `const IMAGE_MAP = {\n${finalString}\n};`
);

// -------- WRITE FILE --------

fs.writeFileSync(IMAGES_JS_PATH, newFileContent);

console.log('\n✅ IMAGE_MAP updated successfully');