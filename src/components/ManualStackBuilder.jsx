/**
 * MacroForge — Manual Stack Builder
 *
 * Phase 6.5 — Manual Stack Builder Revenue UX Upgrade
 *
 * Three-step structured discovery flow:
 *   Step 1 (focus)    — What are you trying to achieve?
 *   Step 2 (category) — Browse categories relevant to your focus
 *   Step 3 (products) — ALL products in the selected category
 *
 * All 649 products are accessible through the category structure.
 * No artificial limits. Products without images show a fallback.
 * Products without prices show "Consultar precio".
 *
 * Architecture: self-contained. All state is internal.
 * Parent (AIStackBuilder.jsx) owns `manualStack` and passes handlers:
 *   stack    — current product ID array
 *   onAdd    — add a product ID (fires analytics)
 *   onRemove — remove a product ID (fires analytics)
 *   onCheckout — enter the checkout layer
 *
 * Security: No secrets. No PII. Frontend-safe.
 */

import { useState, useMemo } from 'react';
import { PRODUCTS } from '../data/products';
import { resolveProductImage } from '../data/images';
import { analytics } from '../lib/analytics';
import '../styles/manualStackBuilder.css';

// ── Full product catalog grouped by section → category ────────
// Handles products with missing section ('other') or missing category ('Otros').
// No products are silently dropped.
const ALL_GROUPED = (() => {
  const g = {};
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const s = p.s || 'other';
    const c = p.c || 'Otros';
    if (!g[s])    g[s] = {};
    if (!g[s][c]) g[s][c] = [];
    g[s][c].push(id);
  }
  return g;
})();

const SECTION_NAMES  = { gym: 'GYM & Performance', vita: 'Vitaminas & Bienestar', dote: 'doTERRA', other: 'Otros' };
const SECTION_COLORS = { gym: '#E3001E', vita: '#00C896', dote: '#D4A843', other: '#888888' };

// ── Stack focus options ───────────────────────────────────────
const FOCUSES = [
  {
    id: 'muscle', icon: '💪', label: 'Ganar músculo', desc: 'Masa, fuerza y volumen',
    sections: ['gym'],
    featuredCats: ['Proteínas Whey','Proteínas Isoladas','Creatinas','Pre-Entrenamientos','Gainers de Masa','BCAA','Glutamina'],
  },
  {
    id: 'cut', icon: '🔥', label: 'Definición', desc: 'Quemar grasa, conservar músculo',
    sections: ['gym','vita'],
    featuredCats: ['Proteínas Isoladas','Quemadores de Grasa','Proteínas Whey','BCAA','Omega y Grasas Saludables'],
  },
  {
    id: 'performance', icon: '⚡', label: 'Rendimiento', desc: 'Energía, fuerza y resistencia',
    sections: ['gym'],
    featuredCats: ['Pre-Entrenamientos','Creatinas','BCAA','Aminoácidos Esenciales','Electrolitos','Vasodilatadores / Pump'],
  },
  {
    id: 'wellness', icon: '❤️', label: 'Salud general', desc: 'Vitaminas, minerales, bienestar',
    sections: ['vita','gym'],
    featuredCats: ['Magnesio','Vitaminas Esenciales','Omega y Grasas Saludables','Multivitamínicos','Colágeno y Belleza','Probióticos'],
  },
  {
    id: 'recovery', icon: '🧘', label: 'Recuperación', desc: 'Músculos, articulaciones, descanso',
    sections: ['gym','vita'],
    featuredCats: ['Glutamina','BCAA','Magnesio','Sueño y Relajación','Articulaciones','Omega y Grasas Saludables'],
  },
  {
    id: 'doterra', icon: '🌸', label: 'doTERRA / Bienestar', desc: 'Aceites esenciales y naturales',
    sections: ['dote'],
    featuredCats: ['Aceites Esenciales Individuales','Mezclas doTERRA','Kits Especiales','Bienestar Interno doTERRA','Aromaterapia Emocional'],
  },
  {
    id: 'custom', icon: '🎯', label: 'Personalizado', desc: 'Explorar todo el catálogo',
    sections: ['gym','vita','dote'],
    featuredCats: [],
  },
];

// ── Category icons ────────────────────────────────────────────
const CAT_ICONS = {
  'Creatinas':'⚡','Proteínas Whey':'🥛','Pre-Entrenamientos':'🔥',
  'Proteínas Isoladas':'💎','Gainers de Masa':'🏋️','Quemadores de Grasa':'🔥',
  'Bebidas Energéticas':'⚡','Vasodilatadores / Pump':'💉','Glutamina':'🧬',
  'Aminoácidos Esenciales':'🧬','BCAA':'🧬','Precursores Hormonales':'⚗️',
  'Proteínas Veganas':'🌱','Snacks Proteicos':'🍫','Accesorios de Gym':'🎽',
  'Shakers y Botellas':'🥤','Proteínas de Carne':'🥩','Electrolitos':'💧',
  'Magnesio para Agarre':'✊','Magnesio':'🧲','Vitaminas Esenciales':'💊',
  'Adaptógenos y Hormonas':'🌿','Multivitamínicos':'💊','Colágeno y Belleza':'✨',
  'Omega y Grasas Saludables':'🐟','Minerales':'💊','Longevidad Celular':'🔬',
  'Sueño y Relajación':'🌙','Salud Mental y Cognitiva':'🧠',
  'Digestión y Enzimas':'🌱','Probióticos':'🦠','Salud Digestiva':'🌱',
  'Articulaciones':'🦴','Salud Cardiovascular':'❤️','Control Metabólico':'⚖️',
  'Detox y Salud Hepática':'🍃','Suplementos Especializados':'🔬',
  'Vitaminas y Suplementos':'💊',
  'Aceites Esenciales Individuales':'🌸','Mezclas doTERRA':'🌺',
  'Bienestar Interno doTERRA':'🌿','Cuidado Personal':'✨',
  'Kits Especiales':'🎁','Cuidado del Cabello':'💆',
  'Cuidado de la Piel':'🧴','Almacenamiento y Botellas':'🫙',
  'Aromaterapia Emocional':'🧘','Difusores':'💨',
  'Protección Solar doTERRA':'☀️','Kits de AutoEnvío':'📦',
  'Otros':'📦',
};

const MAX_STACK = 8;

// ── Utilities ─────────────────────────────────────────────────
const normS = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function parsePrice(id) {
  const m = (PRODUCTS[id]?.p?.[0] || '').match(/([\d,]+)/);
  return m ? parseFloat(m[1].replace(/,/g, '')) || 0 : 0;
}

function formatTotal(num) {
  return `₡${num.toLocaleString('es-CR')}`;
}

function getStackPrompt(size) {
  if (size === 1) return 'Podés agregar proteína, creatina o recuperación para completar tu stack.';
  if (size <= 3)  return 'Tu stack tiene buena base. Podés sumar recuperación o salud general.';
  if (size >= 4)  return 'Stack completo: excelente contexto para cotización.';
  return null;
}

// ── Sub-components ────────────────────────────────────────────
function FocusCard({ focus, onClick }) {
  return (
    <button className="msb-focus-card" onClick={onClick} type="button">
      <span className="msb-focus-icon" aria-hidden="true">{focus.icon}</span>
      <span className="msb-focus-label">{focus.label}</span>
      <span className="msb-focus-desc">{focus.desc}</span>
    </button>
  );
}

function CategoryCard({ name, count, sectionId, featured, onClick }) {
  const color = SECTION_COLORS[sectionId] || '#888';
  return (
    <button
      className={`msb-cat-card${featured ? ' msb-cat-card--featured' : ''}`}
      onClick={onClick}
      type="button"
      aria-label={`${name} — ${count} productos`}
    >
      <span className="msb-cat-icon" aria-hidden="true" style={featured ? { filter: 'brightness(1.2)' } : {}}>
        {CAT_ICONS[name] || '📦'}
      </span>
      <span className="msb-cat-name" style={featured ? { color } : {}}>
        {name}
      </span>
      <span className="msb-cat-count">{count}</span>
      <span className="msb-cat-arrow">→</span>
    </button>
  );
}

function ProductItem({ id, inStack, atMax, onAdd, onRemove }) {
  const p = PRODUCTS[id];
  if (!p) return null;

  const img   = resolveProductImage(p.u);
  const price = (p.p?.[0] || '').match(/(₡\s*[\d\s,.]+)/)?.[1]?.trim() || 'Consultar precio';

  return (
    <div className="msb-product-item">
      <div className="msb-product-img">
        {img
          ? <img src={img} alt={p.n} loading="lazy" decoding="async"
              onError={e => { e.currentTarget.style.display = 'none'; }} />
          : <div className="msb-product-fallback">{p.b?.charAt(0) || '?'}</div>
        }
      </div>
      <div className="msb-product-info">
        <div className="msb-product-brand">{p.b}</div>
        <div className="msb-product-name">{p.n}</div>
      </div>
      <div className="msb-product-right">
        <div className="msb-product-price">{price}</div>
        <button
          className={`msb-product-btn${inStack ? ' msb-product-btn--in-stack' : ' msb-product-btn--add'}`}
          onClick={() => inStack ? onRemove(id) : onAdd(id)}
          disabled={!inStack && atMax}
          type="button"
          aria-label={inStack ? `Quitar ${p.n}` : `Agregar ${p.n}`}
          title={!inStack && atMax ? `Máximo ${MAX_STACK} productos` : ''}
        >
          {inStack ? '✓' : '+'}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function ManualStackBuilder({ stack, onAdd, onRemove, onCheckout }) {
  const [step,              setStep]              = useState('focus');
  const [selectedFocusId,   setSelectedFocusId]   = useState(null);
  const [globalSearch,      setGlobalSearch]      = useState('');
  const [selectedCategory,  setSelectedCategory]  = useState(null);
  const [selectedSection,   setSelectedSection]   = useState(null);
  const [productSearch,     setProductSearch]     = useState('');
  const [productSort,       setProductSort]       = useState('default');

  const inStack = useMemo(() => new Set(stack), [stack]);
  const atMax   = stack.length >= MAX_STACK;

  const stackTotal = useMemo(() => {
    return stack.reduce((sum, id) => sum + parsePrice(id), 0);
  }, [stack]);

  const focusConfig = useMemo(() => {
    return FOCUSES.find(f => f.id === selectedFocusId) || null;
  }, [selectedFocusId]);

  // Build the ordered category list for Step 2
  const categoryRows = useMemo(() => {
    if (!focusConfig) return [];
    const featuredSet = new Set(focusConfig.featuredCats);
    const rows = [];

    for (const sId of focusConfig.sections) {
      const cats = ALL_GROUPED[sId] || {};
      for (const [catName, ids] of Object.entries(cats)) {
        if (ids.length === 0) continue;
        rows.push({
          name:      catName,
          count:     ids.length,
          sectionId: sId,
          featured:  featuredSet.has(catName),
        });
      }
    }
    // Also include 'other' section if any
    const otherCats = ALL_GROUPED['other'] || {};
    for (const [catName, ids] of Object.entries(otherCats)) {
      if (ids.length > 0) rows.push({ name: catName, count: ids.length, sectionId: 'other', featured: false });
    }

    // Featured categories first, then alphabetical within each group
    return rows.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.name.localeCompare(b.name, 'es');
    });
  }, [focusConfig]);

  // Grouped category rows for "custom" focus display
  const isCustomFocus = selectedFocusId === 'custom';

  // Product list for Step 3 — ALL products, no artificial limit
  const isProductStep = step === 'products' || (step === 'category' && globalSearch.length >= 2);

  const displayedProducts = useMemo(() => {
    if (!isProductStep) return [];

    if (globalSearch.length >= 2) {
      const q = normS(globalSearch);
      return Object.keys(PRODUCTS)
        .filter(id => {
          const p = PRODUCTS[id];
          return normS(p.n).includes(q) || normS(p.b).includes(q) || normS(p.c).includes(q);
        })
        .sort((a, b) => {
          const pa = PRODUCTS[a], pb = PRODUCTS[b];
          const sa = normS(pa.n).startsWith(q) ? 10 : normS(pa.n).includes(q) ? 5 : 0;
          const sb = normS(pb.n).startsWith(q) ? 10 : normS(pb.n).includes(q) ? 5 : 0;
          return sb - sa;
        });
    }

    // Category products — full list (no limit)
    let ids = [...(ALL_GROUPED[selectedSection]?.[selectedCategory] || [])];

    // Local search within category
    if (productSearch.trim()) {
      const q = normS(productSearch.trim());
      ids = ids.filter(id => {
        const p = PRODUCTS[id];
        return normS(p.n).includes(q) || normS(p.b).includes(q);
      });
    }

    // Sort by price
    if (productSort === 'price-asc')  ids.sort((a, b) => parsePrice(a) - parsePrice(b));
    if (productSort === 'price-desc') ids.sort((a, b) => parsePrice(b) - parsePrice(a));

    return ids;
  }, [isProductStep, globalSearch, selectedCategory, selectedSection, productSearch, productSort]);

  // ── Navigation ────────────────────────────────────────────
  function selectFocus(focus) {
    setSelectedFocusId(focus.id);
    setGlobalSearch('');
    setProductSearch('');
    setStep('category');
    analytics.manualStack('focus_selected', { focus: focus.id, label: focus.label });
  }

  function selectCategory(catName, sectionId) {
    setSelectedCategory(catName);
    setSelectedSection(sectionId);
    setProductSearch('');
    setProductSort('default');
    setGlobalSearch('');
    setStep('products');
    analytics.manualStack('category_selected', { category: catName, section: sectionId });
  }

  function handleGlobalSearch(value) {
    setGlobalSearch(value);
    if (value.length >= 2) {
      analytics.manualStack('global_search_used', { query: value.substring(0, 30) });
    }
  }

  function goBack() {
    if (step === 'products' && !globalSearch) {
      // Back from category products → category list
      setStep('category');
      setSelectedCategory(null);
      setSelectedSection(null);
      setProductSearch('');
    } else if (step === 'products' && globalSearch) {
      // Back from global search → clear search, stay in category step
      setGlobalSearch('');
      setStep('category');
    } else if (step === 'category') {
      // Back from category list → focus selection
      setStep('focus');
      setSelectedFocusId(null);
      setGlobalSearch('');
    }
  }

  const stackPrompt = getStackPrompt(stack.length);
  const focusLabel  = focusConfig?.label || '';

  // Group categoryRows by section for custom focus display
  const groupedRows = useMemo(() => {
    if (!isCustomFocus) return null;
    const groups = {};
    for (const row of categoryRows) {
      if (!groups[row.sectionId]) groups[row.sectionId] = [];
      groups[row.sectionId].push(row);
    }
    return groups;
  }, [isCustomFocus, categoryRows]);

  return (
    <div className="msb-container">

      {/* Internal back navigation */}
      {step !== 'focus' && (
        <button className="msb-back" onClick={goBack} type="button">
          ←{' '}
          {step === 'category'
            ? 'Cambiar foco'
            : globalSearch
            ? 'Volver a categorías'
            : `${selectedCategory || 'Volver'}`
          }
        </button>
      )}

      {/* ════ STEP 1 — FOCUS SELECTION ════ */}
      {step === 'focus' && (
        <div className="msb-step">
          <div className="msb-step-heading">¿En qué te querés enfocar?</div>
          <div className="msb-step-sub">
            Armá tu stack exacto con tus marcas favoritas. Elegí vos, sin restricciones.
          </div>
          <div className="msb-focus-grid">
            {FOCUSES.map(f => (
              <FocusCard key={f.id} focus={f} onClick={() => selectFocus(f)} />
            ))}
          </div>
        </div>
      )}

      {/* ════ STEP 2 — CATEGORY SELECTION ════ */}
      {step === 'category' && !isProductStep && (
        <div className="msb-step">
          <div className="msb-step-heading">Elegí una categoría</div>
          <div className="msb-step-sub">
            O buscá directamente el producto que buscás — accedés a los {Object.keys(PRODUCTS).length} productos del catálogo.
          </div>

          {/* Global search across ALL products */}
          <div className="msb-search-row">
            <span className="msb-search-icon" aria-hidden="true">🔍</span>
            <input
              className="msb-search-input"
              type="search"
              value={globalSearch}
              onChange={e => handleGlobalSearch(e.target.value)}
              placeholder="Buscar en todo el catálogo..."
              autoComplete="off"
              aria-label="Buscar producto"
            />
          </div>

          {/* Category cards — ungrouped for single-focus, grouped for custom */}
          {!isCustomFocus ? (
            <>
              {focusConfig?.featuredCats?.length > 0 && (
                <div className="msb-section-header">
                  <div className="msb-section-dot" style={{ background: SECTION_COLORS[focusConfig.sections[0]] }} />
                  <div className="msb-section-name">Para {focusLabel}</div>
                </div>
              )}
              <div className="msb-cat-list">
                {categoryRows.map(cat => (
                  <CategoryCard
                    key={`${cat.sectionId}-${cat.name}`}
                    {...cat}
                    onClick={() => selectCategory(cat.name, cat.sectionId)}
                  />
                ))}
              </div>
            </>
          ) : (
            /* Custom focus: show all sections with section headers */
            Object.entries(groupedRows || {}).map(([sId, cats]) => (
              <div key={sId}>
                <div className="msb-section-header">
                  <div className="msb-section-dot" style={{ background: SECTION_COLORS[sId] }} />
                  <div className="msb-section-name">{SECTION_NAMES[sId]}</div>
                </div>
                <div className="msb-cat-list" style={{ marginBottom: 12 }}>
                  {cats.map(cat => (
                    <CategoryCard
                      key={`${sId}-${cat.name}`}
                      {...cat}
                      onClick={() => selectCategory(cat.name, sId)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ════ STEP 3 — PRODUCT BROWSING ════ */}
      {isProductStep && (
        <div className="msb-step">
          <div className="msb-products-header">
            <div className="msb-step-heading">
              {globalSearch
                ? `"${globalSearch}"`
                : selectedCategory
              }
            </div>
            <div className="msb-products-count">
              {displayedProducts.length} producto{displayedProducts.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Toolbar: local search + sort (only in category mode) */}
          {!globalSearch && (
            <div className="msb-toolbar">
              <div className="msb-toolbar-search">
                <span aria-hidden="true">🔍</span>
                <input
                  className="msb-toolbar-input"
                  type="search"
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    if (e.target.value.length >= 2) {
                      analytics.manualStack('product_search_used', { query: e.target.value.substring(0, 30) });
                    }
                  }}
                  placeholder="Buscar en esta categoría..."
                  autoComplete="off"
                />
              </div>
              <select
                className="msb-sort-select"
                value={productSort}
                onChange={e => {
                  setProductSort(e.target.value);
                  analytics.manualStack('sort_used', { sort: e.target.value, category: selectedCategory });
                }}
                aria-label="Ordenar productos"
              >
                <option value="default">Orden</option>
                <option value="price-asc">↑ Precio</option>
                <option value="price-desc">↓ Precio</option>
              </select>
            </div>
          )}

          {/* Product list — ALL matching products */}
          {displayedProducts.length === 0 ? (
            <div className="msb-empty">
              {globalSearch
                ? `Sin resultados para "${globalSearch}". Probá otro término o explorá por categoría.`
                : 'Sin productos en esta categoría. Probá buscar por nombre.'}
            </div>
          ) : (
            <div className="msb-product-list">
              {displayedProducts.map(id => (
                <ProductItem
                  key={id}
                  id={id}
                  inStack={inStack.has(id)}
                  atMax={atMax}
                  onAdd={onAdd}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════ STICKY STACK BAR — visible in Steps 2 and 3 ════ */}
      {step !== 'focus' && (
        <div className="msb-stack-bar">
          {stack.length === 0 ? (
            <div className="msb-stack-empty">
              Elegí productos para armar tu stack.
              {!globalSearch && selectedCategory && ' Podés agregar varios de la misma categoría.'}
            </div>
          ) : (
            <div className="msb-stack-active">
              <div className="msb-stack-info">
                <div className="msb-stack-count">
                  {stack.length} producto{stack.length !== 1 ? 's' : ''}
                  {atMax && <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 10 }}> (máx.)</span>}
                </div>
                {stackTotal > 0 && <div className="msb-stack-total">~{formatTotal(stackTotal)} +IVA</div>}
                {stackPrompt && <div className="msb-stack-prompt">{stackPrompt}</div>}
              </div>
              <button
                className="msb-checkout-btn"
                onClick={() => {
                  analytics.manualStack('checkout_started', {
                    stack_size:      stack.length,
                    estimated_total: stackTotal,
                    focus:           selectedFocusId || 'custom',
                  });
                  onCheckout();
                }}
                type="button"
              >
                Ver resumen →
              </button>
            </div>
          )}
          {atMax && stack.length > 0 && (
            <div className="msb-max-notice">
              Máximo {MAX_STACK} productos para mantener la cotización clara.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
