#!/usr/bin/env node
/**
 * MacroForge — Catalog Integrity Audit
 * Run: node scripts/audit-catalog.js
 *
 * Validates products.js and images.js for structural integrity.
 * Run after any sync to catch mismatches before they reach production.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');

// ── Parse products.js ──────────────────────────────────────────
const prodRaw = readFileSync(resolve(ROOT, 'src/data/products.js'), 'utf8');
const prodStart = prodRaw.indexOf('{');
const prodEnd   = prodRaw.lastIndexOf('}');
const PRODUCTS  = JSON.parse(prodRaw.slice(prodStart, prodEnd + 1));
const entries   = Object.entries(PRODUCTS);

// ── Parse images.js IMAGE_MAP — extract slug keys only ─────────
const imgRaw  = readFileSync(resolve(ROOT, 'src/data/images.js'), 'utf8');
// Extract all 'slug': 'filename' pairs — sufficient for coverage check
const IMAGE_MAP = {};
for (const m of imgRaw.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
  IMAGE_MAP[m[1]] = m[2];
}

// ── Known valid sections / categories (parsed from catalog.js) ─
const catRaw = readFileSync(resolve(ROOT, 'src/data/catalog.js'), 'utf8');

// Extract section keys: gym, vita, dote (and any future additions)
const sectionKeys  = [...catRaw.matchAll(/^\s{2}(\w+):\s*\{/gm)].map(m => m[1]);
const validSections = new Set(sectionKeys);

// Extract all category strings from categories: [...] arrays
const catMatches = catRaw.matchAll(/'([^']+)'/g);
const validCategories = new Set([...catMatches].map(m => m[1]));

// ── Collect checks ──────────────────────────────────────────────
let errors = 0, warnings = 0;
function err(msg)  { console.error('  ✗ ERROR:', msg);   errors++; }
function warn(msg) { console.warn( '  ⚠ WARN:',  msg); warnings++; }

console.log('═══════════════════════════════════════════════════');
console.log('  MacroForge Catalog Audit —', new Date().toISOString().slice(0,10));
console.log('═══════════════════════════════════════════════════\n');

// 1. Total count
const ids  = entries.map(([k]) => +k);
const maxId = Math.max(...ids);
const minId = Math.min(...ids);
console.log(`📦 Total products : ${entries.length}`);
console.log(`   ID range       : ${minId} – ${maxId}`);

// 2. Missing IDs (gaps)
const idSet = new Set(ids);
const gaps  = [];
for (let i = minId; i <= maxId; i++) if (!idSet.has(i)) gaps.push(i);
if (gaps.length) warn(`ID gaps (${gaps.length}): ${gaps.join(', ')}`);
else console.log('   ID gaps        : none');

// 3. Duplicate IDs
const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupIds.length) err(`Duplicate IDs: ${[...new Set(dupIds)].join(', ')}`);
else console.log('   Duplicate IDs  : none');

// 4. Duplicate slugs
const slugs    = entries.map(([, p]) => p.u?.match(/\/tienda\/([^/?#]+)/)?.[1] || null);
const slugSet  = new Set();
const dupSlugs = [];
slugs.forEach(s => { if (s) { if (slugSet.has(s)) dupSlugs.push(s); else slugSet.add(s); } });
if (dupSlugs.length) err(`Duplicate slugs (${dupSlugs.length}): ${[...new Set(dupSlugs)].join(', ')}`);
else console.log('   Duplicate slugs: none');

// 5. Section breakdown + invalid sections
console.log('\n📂 By section:');
const sectionCounts = {};
const badSection = [];
entries.forEach(([id, p]) => {
  const s = p.s || '__MISSING__';
  sectionCounts[s] = (sectionCounts[s] || 0) + 1;
  if (!validSections.has(s)) badSection.push(`ID${id}:${p.n}(s="${s}")`);
});
Object.entries(sectionCounts).sort((a,b)=>b[1]-a[1])
  .forEach(([s, n]) => console.log(`   ${validSections.has(s)?'✓':'✗'} ${s}: ${n}`));
if (badSection.length) err(`Invalid section (${badSection.length}): ${badSection.slice(0,3).join(', ')}${badSection.length>3?'…':''}`);

// 6. Invalid categories
const badCat = entries.filter(([, p]) => p.c && !validCategories.has(p.c));
if (badCat.length) {
  err(`Invalid category (${badCat.length}):`);
  badCat.slice(0, 5).forEach(([id, p]) => console.error(`     ID${id}: "${p.c}"`));
}

// 7. Missing required fields
console.log('\n🔎 Field validation:');
const checks = [
  ['Missing name',     entries.filter(([,p])=>!p.n)],
  ['Missing brand',    entries.filter(([,p])=>!p.b)],
  ['Missing section',  entries.filter(([,p])=>!p.s)],
  ['Missing category', entries.filter(([,p])=>!p.c)],
  ['Missing price',    entries.filter(([,p])=>!p.p?.length)],
  ['No URL (fallback)',entries.filter(([,p])=>!p.u)],
];
checks.forEach(([label, bad]) => {
  const icon = bad.length === 0 ? '✓' : label === 'No URL (fallback)' ? '⚠' : '✗';
  if (bad.length && label !== 'No URL (fallback)') errors++;
  console.log(`   ${icon} ${label}: ${bad.length}`);
});

// 8. Image mapping coverage
console.log('\n🖼  Image coverage:');
let withImage = 0, withoutImage = 0, withFallback = 0;
entries.forEach(([, p]) => {
  const slug = p.u?.match(/\/tienda\/([^/?#]+)/)?.[1];
  if (!slug) { withFallback++; return; }
  if (IMAGE_MAP[slug]) withImage++;
  else withoutImage++;
});
console.log(`   ✓ Has image mapping    : ${withImage}`);
console.log(`   ⚠ Missing image mapping: ${withoutImage}`);
console.log(`   ⚠ No URL (auto-fallback): ${withFallback}`);

// 9. Summary
console.log('\n═══════════════════════════════════════════════════');
if (errors === 0 && warnings === 0) {
  console.log('  ✅ PASS — catalog is clean');
} else if (errors === 0) {
  console.log(`  ⚠  PASS WITH WARNINGS — ${warnings} warning(s), 0 errors`);
} else {
  console.log(`  ❌ FAIL — ${errors} error(s), ${warnings} warning(s)`);
}
console.log('═══════════════════════════════════════════════════');
process.exit(errors > 0 ? 1 : 0);
