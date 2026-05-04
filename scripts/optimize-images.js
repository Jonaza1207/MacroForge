/**
 * MacroForge — Image Optimization Pipeline
 *
 * Converts PNG/JPEG product images to WebP for maximum performance.
 * Generates .webp files alongside originals in src/assets/products/.
 * Originals are never deleted automatically.
 *
 * Usage:
 *   npm run optimize:images            — only processes new/changed files
 *   npm run optimize:images -- --force — reprocesses all files
 *
 * Sources (processed in order):
 *   1. src/assets/raw-products/   ← put new originals here
 *   2. src/assets/products/       ← also optimizes existing PNGs
 *
 * Output:
 *   src/assets/products/*.webp
 */

import sharp from 'sharp';
import { existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, extname, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');

// ── Config ────────────────────────────────────────────────
const SOURCES = [
  join(ROOT, 'src/assets/raw-products'), // ① new originals land here
  join(ROOT, 'src/assets/products'),     // ② also optimize existing PNGs
];
const OUTPUT_DIR  = join(ROOT, 'src/assets/products');
const MAX_WIDTH   = 1000;   // px — enough for 4× retina on a 250px product card
const WEBP_QUALITY = 80;    // 80 is the sweet spot: sharp + small
const SUPPORTED   = new Set(['.png', '.jpg', '.jpeg']);
const FORCE       = process.argv.includes('--force');

// ── Core optimizer ────────────────────────────────────────
async function optimizeOne(inputPath) {
  const ext    = extname(inputPath).toLowerCase();
  const stem   = basename(inputPath, extname(inputPath));
  const outPath = join(OUTPUT_DIR, `${stem}.webp`);

  if (!SUPPORTED.has(ext)) return null;

  // If output already exists and is newer than input → skip (unless --force)
  if (!FORCE && existsSync(outPath)) {
    const inMtime  = statSync(inputPath).mtimeMs;
    const outMtime = statSync(outPath).mtimeMs;
    if (outMtime >= inMtime) return { skipped: true, name: basename(inputPath) };
  }

  const inSize = statSync(inputPath).size;
  const meta   = await sharp(inputPath).metadata();

  let pipeline = sharp(inputPath);

  // Resize only if the image is wider than MAX_WIDTH (never upscale)
  if ((meta.width || 0) > MAX_WIDTH) {
    pipeline = pipeline.resize(MAX_WIDTH, null, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  await pipeline.webp({ quality: WEBP_QUALITY }).toFile(outPath);

  const outSize = statSync(outPath).size;
  const pct     = Math.round((1 - outSize / inSize) * 100);

  return {
    name:    basename(inputPath),
    output:  basename(outPath),
    inKB:    Math.round(inSize  / 1024),
    outKB:   Math.round(outSize / 1024),
    savings: pct,
  };
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  MacroForge Image Optimizer');
  console.log(`    WebP quality: ${WEBP_QUALITY}  |  Max width: ${MAX_WIDTH}px  |  Force: ${FORCE}\n`);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = [];
  const skipped = [];
  const errors  = [];

  for (const sourceDir of SOURCES) {
    if (!existsSync(sourceDir)) continue;

    const files = readdirSync(sourceDir)
      .filter(f => SUPPORTED.has(extname(f).toLowerCase()));

    if (files.length === 0) continue;

    console.log(`📁  ${sourceDir.replace(ROOT, '.')}  (${files.length} source files)`);

    for (const file of files) {
      const inputPath = join(sourceDir, file);
      process.stdout.write(`    ${file.padEnd(64)} `);

      try {
        const r = await optimizeOne(inputPath);
        if (!r) {
          process.stdout.write('(skipped — unsupported format)\n');
        } else if (r.skipped) {
          process.stdout.write('✓ up-to-date\n');
          skipped.push(file);
        } else {
          process.stdout.write(`${r.inKB} KB → ${r.outKB} KB  (-${r.savings}%)\n`);
          results.push(r);
        }
      } catch (err) {
        process.stdout.write(`❌ ${err.message}\n`);
        errors.push({ file, error: err.message });
      }
    }
    console.log();
  }

  // ── Summary ──────────────────────────────────────────────
  const line = '─'.repeat(60);
  console.log(line);
  console.log('  OPTIMIZATION REPORT');
  console.log(line);

  if (results.length === 0 && errors.length === 0) {
    console.log(`\n  ✅  All ${skipped.length} images already up-to-date.`);
    console.log('     Use --force to reprocess everything.\n');
    return;
  }

  if (results.length > 0) {
    const totalIn   = results.reduce((s, r) => s + r.inKB,  0);
    const totalOut  = results.reduce((s, r) => s + r.outKB, 0);
    const totalSave = Math.round((1 - totalOut / totalIn) * 100);

    console.log(`\n  ✅  Processed:  ${results.length} images`);
    console.log(`  ⏭   Skipped:    ${skipped.length} (already optimized)`);
    console.log(`\n  Before:  ${(totalIn  / 1024).toFixed(1)} MB`);
    console.log(`  After:   ${(totalOut / 1024).toFixed(1)} MB`);
    console.log(`  Saved:   ${((totalIn - totalOut) / 1024).toFixed(1)} MB  (-${totalSave}%)`);

    const top5 = [...results]
      .sort((a, b) => (b.inKB - b.outKB) - (a.inKB - a.outKB))
      .slice(0, 5);

    if (top5.length) {
      console.log('\n  Top 5 biggest savings:');
      top5.forEach(r =>
        console.log(`    ${r.inKB} KB → ${r.outKB} KB  ${r.name}`)
      );
    }
  }

  if (errors.length > 0) {
    console.log(`\n  ❌  Errors (${errors.length}):`);
    errors.forEach(e => console.log(`    ${e.file}: ${e.error}`));
  }

  console.log(`\n  Next steps:`);
  console.log(`    1. npm run build`);
  console.log(`    2. Verify product images look correct`);
  console.log(`    3. Commit the new .webp files\n`);
  console.log(line + '\n');
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err.message);
  process.exit(1);
});
