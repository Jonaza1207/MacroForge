# doTERRA Image Normalization Report

Generated: 2026-05-11

## Status

Visual normalization of doTERRA images (white background removal / background neutralization) requires image processing tooling that is not available in this automated session.

## What Needs Review

doTERRA product images fall into two visual categories:

### Category A — Clean / Premium (no action needed)
These images already have transparent or dark-compatible backgrounds. They render cleanly on MacroForge's dark product cards.

Examples (identified by transparent WebP exports):
- `Aceite-Fraccionado-de-Coco.webp`
- `Abeto-Siberiano.webp`
- `Bergamota.webp`
- `Lavanda.webp`, `Lavanda-5mL.webp`, `Lavanda-Touch.webp`
- `Menta.webp`, `Menta-5mL.webp`, `Menta-Touch.webp`
- `On-Guard.png` et al.

### Category B — Potentially White-Background (manual review needed)
PNG files and some WebP files may have white rectangular canvases. These look inconsistent against the dark MacroForge card background.

Files to audit visually:
- `Abode.png`
- `Adaptiv.png`
- `Adaptiv-Touch.png`
- `Air-X.png`
- `Citrus-Bliss.png`
- `Clarycalm.png`
- `DDR-Prime.png` / `DDR-Prime-Softgels.png`
- `Intune.png`
- All `Doterra-*.png` files (22 files)
- All kit/spa/hair care PNG files

## Recommended Normalization Process

### Option 1 — Script with Sharp (Node.js)
```javascript
import sharp from 'sharp';
import { removeBackground } from '@imgly/background-removal-node';

// For each PNG with white background:
const result = await removeBackground(inputPath);
await sharp(result).webp({ quality: 90 }).toFile(outputPath);
```

### Option 2 — ImageMagick CLI
```bash
# Remove white background (tolerance 20%)
magick input.png -fuzz 20% -transparent white output.webp
```

### Option 3 — remove.bg API
Use the remove.bg API for batch processing. Best quality for product photos.

## Filename Safety

After normalization, **do not rename files**. Save processed files with the same base name as `.webp`:
- `Abode.png` → `Abode.webp` (both can coexist; images.js two-pass loader prefers WebP)

The DOTERRA_NAME_MAP uses filenames without extensions, so no code changes are needed when adding WebP versions alongside existing PNGs.

## Priority Order

1. `Doterra-*.png` files — 21 files, highest visual impact on the Aromaterapia Emocional section
2. Kit images (SPA, Hair Care, Skin Care) — affects Cuidado Personal section
3. Bienestar Interno PNG files — affects wellness section
