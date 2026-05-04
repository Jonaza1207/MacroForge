# MacroForge — Image Workflow

## Overview

Product images go through a two-step pipeline:

```
src/assets/raw-products/   ← put originals here
         ↓  npm run optimize:images
src/assets/products/       ← optimized WebP served to browsers
```

The website always serves the smallest WebP version.
Original PNGs are kept as backup — never deleted automatically.

---

## Adding a New Product Image

### Step 1 — Name the file correctly

Use this naming convention:

```
ProductName-Brand.png
```

Examples:
```
Creatina-Monohidratada-Nutricost.png
Gold-Standard-Whey-OptimumNutrition.png
Vitamina-C-AlfaVitamins.png
```

Rules:
- Use hyphens, not spaces
- Use PascalCase for each word
- No special characters (except hyphens)
- Lowercase extension: `.png` or `.jpg`

### Step 2 — Put the original in raw-products

```
src/assets/raw-products/YourProduct-Brand.png
```

### Step 3 — Optimize

```bash
npm run optimize:images
```

This generates `YourProduct-Brand.webp` in `src/assets/products/`.

To reprocess all images (e.g. after quality setting change):
```bash
npm run optimize:images:force
```

### Step 4 — Add to IMAGE_MAP

Open `src/data/images.js` and add an entry in the `IMAGE_MAP` object:

```js
'your-product-slug': 'YourProduct-Brand',
```

The filename value should NOT include the extension — the system
automatically picks the best available format (WebP preferred).

### Step 5 — Add the product to products.js

Add the product entry in `src/data/products.js` with the correct URL slug.

### Step 6 — Build and verify

```bash
npm run build
```

Check that the product card shows the image correctly.

### Step 7 — Commit

```bash
git add src/assets/products/YourProduct-Brand.webp
git add src/assets/raw-products/YourProduct-Brand.png  # optional: keep original
git add src/data/images.js
git add src/data/products.js
git commit -m "Add product: YourProduct-Brand"
```

---

## Folder Roles

| Folder | Purpose |
|---|---|
| `src/assets/raw-products/` | Original high-resolution files. Never served directly to users. |
| `src/assets/products/` | Optimized WebP files (+ PNG originals). Served to browsers. |
| `src/assets/Branding/` | Brand logo and branding assets. |

---

## How the Image System Works

`src/data/images.js` loads all images using Vite's `import.meta.glob`.

When both `Product.webp` and `Product.png` exist, **WebP is always preferred**.
This is handled by the two-pass loading strategy in `images.js`.

`IMAGE_MAP` maps product slugs to filenames (without extension):

```js
'gold-standard-whey': 'Gold-Standard-Whey-OptimumNutrition'
```

When `resolveProductImage(url)` is called, it:
1. Extracts the slug from the product URL
2. Looks up the filename in IMAGE_MAP
3. Returns the URL of the best available format (WebP > PNG)

---

## Optimization Settings

| Setting | Value | Reason |
|---|---|---|
| WebP quality | 80 | Best quality/size balance for product photos |
| Max width | 1000px | 4× retina for a 250px product card |
| Format | WebP | ~93% smaller than PNG for supplement images |
| Upscaling | Never | Prevents quality degradation |

---

## Performance Numbers

After optimization of 322 product images:

| Metric | Before | After |
|---|---|---|
| Total size | 148.8 MB | 11.0 MB |
| Savings | — | **137.8 MB (93%)** |
| Average per image | 473 KB | ~34 KB |
| Format | PNG only | WebP (PNG backup) |

---

## Scripts Reference

```bash
# Optimize new/changed images only
npm run optimize:images

# Force reprocess all images (e.g. after quality setting change)
npm run optimize:images:force

# Build the app
npm run build

# Start dev server
npm run dev
```

---

## Quality Control

If a WebP image looks bad after optimization:

1. Check the source PNG quality in `raw-products/`
2. Increase quality in `scripts/optimize-images.js`:
   ```js
   const WEBP_QUALITY = 85;  // increase from 80
   ```
3. Re-run: `npm run optimize:images:force`

---

## Bulk Import Workflow (many new images)

```bash
# 1. Copy all new PNGs to raw-products/
cp path/to/new-images/*.png src/assets/raw-products/

# 2. Optimize all at once
npm run optimize:images

# 3. Update IMAGE_MAP manually in src/data/images.js

# 4. Build and verify
npm run build
```
