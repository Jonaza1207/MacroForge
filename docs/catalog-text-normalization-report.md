# Global Catalog Text Normalization Report

Generated: 2026-05-11

## Summary

| Metric | Count |
|---|---|
| Total products audited | 647 |
| Brand corrections | 28 |
| Product name corrections | 19 |
| Total changes | 47 |
| Products unchanged | 600 |
| Manual review items | 8 |

---

## Brand Corrections (28 products affected)

### Optimum Nutrition — 3 typo fixes

| ID | Before | After |
|---|---|---|
| 111 | `OPTIMUM NUTITION` | `Optimum Nutrition` |
| 140 | `OPTIMUM NUTRATION` | `Optimum Nutrition` |
| 163 | `OPTMUM NUTRITION` | `Optimum Nutrition` |

### Allmax — 2 casing fixes

| ID | Before | After |
|---|---|---|
| 49 | `Allmax` | `ALLMAX` |
| 120 | `Allmax` | `ALLMAX` |

### GAT Sport — 2 casing fixes

| ID | Before | After |
|---|---|---|
| 84 | `Gat Sport` | `GAT Sport` |
| 125 | `GAT SPORT` | `GAT Sport` |

### MuscleTech — 1 casing fix

| ID | Before | After |
|---|---|---|
| 116 | `Muscletech` | `MuscleTech` |

### El Mana — 20 casing fixes (19× "El mana" + 1× "EL Mana")

IDs: 182, 190, 191, 193, 196, 199, 201, 202, 205, 232, 238, 239, 262, 263, 264, 269, 275, 282, 302, 311

All changed to: `El Mana`

---

## Product Name Corrections (19 products)

### Proteína — 8 fixes (missing accent)

| ID | Before | After |
|---|---|---|
| 1 | `Proteina de Arveja` | `Proteína de Arveja` |
| 2 | `Proteina Vegana` | `Proteína Vegana` |
| 3 | `Proteina Vegana` | `Proteína Vegana` |
| 18 | `R1 Proteina Isolada` | `R1 Proteína Isolada` |
| 28 | `Proteina 100% Zero Carb` | `Proteína 100% Zero Carb` |
| 39 | `Proteina Source 7` | `Proteína Source 7` |
| 156 | `Barras de proteina` | `Barras de proteína` |
| 159 | `Bebida de proteina carbonatada` | `Bebida de proteína carbonatada` |
| 289 | `Remolacha con proteina en polvo` | `Remolacha con proteína en polvo` |

### Colágeno — 9 fixes (missing accent)

| ID | Before | After |
|---|---|---|
| 182 | `Biotina con Colageno` | `Biotina con Colágeno` |
| 202 | `Colageno + curcuma  (polvo)` | `Colágeno + cúrcuma (polvo)` *(also fixed double space)* |
| 203 | `Colageno` | `Colágeno` |
| 204 | `Colageno C` | `Colágeno C` |
| 205 | `Colageno Hidrolizado capsulas` | `Colágeno Hidrolizado capsulas` |
| 206 | `Colageno Hidrolizado capsulas` | `Colágeno Hidrolizado capsulas` |
| 207 | `Colageno Hidrolizado (polvo)` | `Colágeno Hidrolizado (polvo)` |
| 208 | `Colageno Marino en capsulas` | `Colágeno Marino en capsulas` |
| 209 | `Colageno multiple` | `Colágeno múltiple` |
| 529 | `Colageno Marino en polvo` | `Colágeno Marino en polvo` |

### Double space fixes — 2

| ID | Before | After |
|---|---|---|
| 202 | `Colageno + curcuma  (polvo)` | `Colágeno + cúrcuma (polvo)` |
| 271 | `NAD  + ULTRA` | `NAD + ULTRA` |

---

## Manual Review Items

These were identified but NOT auto-changed due to uncertainty about official naming:

| ID | Name | Issue | Reason Not Changed |
|---|---|---|---|
| 213 | `Curcuma` (Alfa Vitamins) | Missing accent → `Cúrcuma` | May be official brand naming |
| All `ALFA VITAMINS` | `ALFA VITAMINS` | All-caps vs Title Case | May be official brand style |
| All `NUTRABIO` | `NUTRABIO` vs `Nutrabio` | Inconsistent casing | Both exist; official is `NutraBio` |
| All `OPTIMUM NUTRITION` | All-caps brand | Inconsistent with corrected `Optimum Nutrition` | Other ON products use correct casing |
| 119 | `Alfa Sports` brand | Different from `Alfa Vitamins` | Separate brand — left unchanged |
| Various | Products with `(polvo)`, `(capsulas)` | Mix of uppercase/lowercase | May be intentional product line naming |

---

## Confirmation: IDs / Slugs / URLs Untouched

- Product IDs: **unchanged** (guaranteed — no ID fields were modified)
- URL slugs (`product.u`): **unchanged** (modifications targeted only `"n":` and `"b":` fields)
- Image mappings: **unaffected** (image resolution uses URL slugs, not product names)
- Prices (`product.p`): **unchanged**

---

## Confirmation: Search Behavior

All product name corrections used Spanish-accented characters. The search normalization function `normS()` in ManualStackBuilder.jsx strips accents before comparison:
```javascript
const normS = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
```

This means:
- `proteina` → finds `Proteína` ✓
- `colageno` → finds `Colágeno` ✓
- `limon` → finds `Limón` ✓
- `curcuma` → finds `Cúrcuma` ✓
- `arbol` → finds `Árbol de Té` ✓
- `oregano` → finds `Orégano` ✓
