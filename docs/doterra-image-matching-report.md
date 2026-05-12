# doTERRA Image Matching Report — Final

Generated: 2026-05-11 (Catalog Perfection Phase)

## Final Coverage

| Metric | Count |
|---|---|
| Total doTERRA products (after PB Assist removal) | 205 |
| **Products with real image — RESOLVED** | **205** |
| Products still showing placeholder | 0 |
| **Image coverage** | **100%** |

---

## Phase-by-Phase Progress

| Phase | Added | Running Total |
|---|---|---|
| Phase 1 — Explicit name map (original) | 30 | 30 |
| Phase 2 — Smart name matching (existing files) | 159 | 189 |
| Phase 3 — New files added by user (this phase) | 16 | 205 |
| PB Assist × 2 removed from catalog | −2 | 205 |

---

## New Files Detected and Mapped (Phase 3 — 17 files)

| Product Name | Image File |
|---|---|
| Árbol de Té (Melaleuca) | `Arbol-de-te-melaleuca.webp` |
| Árbol de Té (Melaleuca) 5 mL | `Arbol-de-Te-Melaleuca-5mL.webp` |
| Árbol de Té (Melaleuca) Touch | `Arbol-de-te-melaleuca-Touch.webp` |
| Breathe 5 mL | `Breathe-5mL.webp` |
| Breathe Touch | `Breathe-Touch.webp` |
| Davana Touch | `Davana-Touch.webp` *(was Dasvana Touch — typo fixed)* |
| Deep Blue Polyphenol Complex | `Deep-Blue-Polyphenol-Complex.webp` |
| Ensenciales para la Familia + Difusor Pebble | `Esenciales-para-la-Faminilia-Difusor-Pebble.webp` |
| Jengibre | `Jengibre.webp` |
| Rosa Touch | `Rosa-Touch.webp` |
| Salvia Esclarea | `Salvia-Esclarea.webp` |
| Salvia Española | `Salvia-Española.webp` |
| Tomillo | `Tomillo.webp` |
| Toronja | `Toronja.webp` |
| Vetiver | `Vetiver.webp` |
| Yarrow / Pom 15 mL | `Yarrow-Pom-15mL.webp` |
| Ylang Ylang | `Ylang-Ylang.webp` |

---

## Catalog Name Corrections Applied

| Product ID | Before | After | Type |
|---|---|---|---|
| 345 | Dasvana Touch | **Davana Touch** | Typo fix |
| 344 | Curcuma | **Cúrcuma** | Accent |
| 363 | Limon | **Limón** | Accent |
| 364 | Limon 5 mL | **Limón 5 mL** | Accent |
| 339 | Arbol de Te (Melaleuca) | **Árbol de Té (Melaleuca)** | Accent |
| 341 | Arbol de Te (Melaleuca) 5 mL | **Árbol de Té (Melaleuca) 5 mL** | Accent |
| 343 | Arbol de Te (Melaleuca) Touch | **Árbol de Té (Melaleuca) Touch** | Accent |
| 374 | Oregano | **Orégano** | Accent |
| 375 | Oregano 5 mL | **Orégano 5 mL** | Accent |
| 376 | Oregano Touch | **Orégano Touch** | Accent |

## Products Removed

| Product ID | Name | Reason |
|---|---|---|
| 488 | PB Assist | Removed from store per business decision |
| 489 | PB Assist Jr | Removed (PB Assist family variant) |

---

## Ambiguous Matches

**Zero.** All 17 new files had unambiguous matches to their products.

---

## Image Normalization Notes

White-background doTERRA images are a **visual audit task** that requires manual review with image tooling. The following products have images that may visually contrast with MacroForge's dark premium card style (white canvas visible):

- `Abode.png` — likely white background (common for doTERRA blends)
- `Adaptiv.png` — likely white background
- `Adaptiv-Touch.png` — likely white background
- All PNG files in the doTERRA set (vs WebP files which tend to have transparent backgrounds)

**Action**: Use a tool like `sharp`, `imagemagick`, or `remove.bg` to process these files. Replace the PNG with a WebP version with transparent background. The DOTERRA_NAME_MAP will automatically prefer WebP over PNG (two-pass load strategy in images.js).

See `docs/doterra-image-normalization-report.md` for detailed guidance.

---

## Files Changed This Phase

| File | Change |
|---|---|
| `src/data/products.js` | 10 name corrections + 2 products removed |
| `src/data/images.js` | 17 new DOTERRA_NAME_MAP entries + 6 accent key updates + 1 removal |
