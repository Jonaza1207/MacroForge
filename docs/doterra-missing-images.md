# doTERRA Image Coverage Report

Generated: 2026-05-11 (updated after smart name matching pass)

## Summary

| Metric | Count |
|---|---|
| Total doTERRA products (section: dote) | 207 |
| **Products with real image** | **189** |
| Products still showing placeholder | 18 |
| Previously resolved (Phase 1 — explicit map) | 30 |
| Newly resolved (smart name matching) | 159 |

---

## Matching Strategy

Products were matched using normalized name comparison:
- Strip `doTERRA` / `Doterra` prefix
- Lowercase
- Remove accents (NFD decomposition + strip combining marks)
- Remove all non-alphanumeric characters
- WebP preferred over PNG when both exist

Example:
- Product: `"Aceite Fraccionado de Coco"` → key `aceitefraccionadodecoco`
- File: `Aceite-Fraccionado-de-Coco.webp` → key `aceitefraccionadodecoco`
- Result: **exact match** ✓

4 products were manually matched due to catalog typos:
| Product Name (catalog) | Typo | File Used |
|---|---|---|
| `Balsamo labia Herbal` | "labia" should be "labial" | `Balsamo-labial-Herbal.png` |
| `Acondicionador Sin Ejuague 3 en 1` | "Ejuague" should be "Enjuague" | `Acondicionador-Sin-Enjuague-3-en-1.png` |
| `Humectante Antienvejecimeinto` | "meinto" should be "miento" | `Humectante-Antienvejecimiento.png` |
| `Kit de indroduccion ( 6uds )` | "indroduccion" should be "introduccion" | `Kit-de-introduccion-6-uds.png` |

4 "contains" matches were **excluded** because they pointed to files already used by other products:
| Product | Candidate File | Reason Excluded |
|---|---|---|
| `Breathe Touch` | `Coleccion-para-niños-Breathe-Touch` | File belongs to kit product (ID 509) |
| `Deep Blue Polyphenol Complex` | `Deep-Blue` | File belongs to `Deep Blue` (ID 389) |
| `PB Assist` | `PB-Assist-Jr` | File belongs to `PB Assist Jr` (ID 489) |
| `Ensenciales para la Familia + Difusor Pebble` | `Difusor-Pebble` | File belongs to diffuser (ID 525) |

---

## Still Missing — 18 Products Without Image Files

These products have no local image file. Add the file to `src/assets/products/` and add a line to `DOTERRA_NAME_MAP` in `src/data/images.js`.

### No file exists (14 truly missing)

| ID | Product Name | Recommended Filename |
|---|---|---|
| 323 | Rosa Touch | `Rosa-Touch.png` |
| 325 | Salvia Esclarea | `Salvia-Esclarea.png` |
| 327 | Salvia Española | `Salvia-Espanola.png` |
| 329 | Tomillo | `Tomillo.png` |
| 331 | Toronja | `Toronja.png` |
| 333 | Vetiver | `Vetiver.png` |
| 335 | Yarrow / Pom 15 mL | `Yarrow-Pom-15mL.png` |
| 337 | Ylang Ylang | `Ylang-Ylang.png` |
| 339 | Arbol de Te (Melaleuca) | `Arbol-de-Te-Melaleuca.png` |
| 341 | Arbol de Te (Melaleuca) 5 mL | `Arbol-de-Te-Melaleuca-5mL.png` |
| 343 | Arbol de Te (Melaleuca) Touch | `Arbol-de-Te-Melaleuca-Touch.png` |
| 345 | Dasvana Touch | `Dasvana-Touch.png` |
| 357 | Jengibre | `Jengibre.png` |
| 431 | Breathe 5 mL | `Breathe-5mL.png` |

### No dedicated file — different product shares same name (4)

| ID | Product | Notes |
|---|---|---|
| 432 | Breathe Touch | Only existing file is the kit `Coleccion-para-niños-Breathe-Touch` — not the standalone oil |
| 474 | Deep Blue Polyphenol Complex | Only `Deep-Blue` exists (different product) |
| 488 | PB Assist | Only `PB-Assist-Jr` exists (different variant) |
| 511 | Ensenciales para la Familia + Difusor Pebble | Only `Difusor-Pebble` exists (component, not kit) |

---

## How to Add a Missing Image

1. Place the `.png` (or `.webp`) file in `src/assets/products/`
2. Add one line to `DOTERRA_NAME_MAP` in `src/data/images.js`:
   ```javascript
   'Exact Product Name': 'Filename-Without-Extension',
   ```
3. Run `npm run build` to verify.

No component changes required — components already call `resolveDoTERRAImage(p.n)` as fallback.
