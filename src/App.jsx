import { useState, useMemo, useCallback, useEffect, lazy, Suspense, useDeferredValue } from 'react';
import { PRODUCTS } from './data/products';
import { SECTIONS } from './data/catalog';
import { PRODUCT_LABELS } from './data/labels';
import { WA_NUMBER } from './data/catalog';
import { useTheme } from './hooks/useTheme';
import { analytics } from './lib/analytics';

import Hero           from './components/Hero';
import Controls       from './components/Controls';
import CatalogHome    from './components/CatalogHome';
import SectionPage    from './components/SectionPage';
import CategoryPage   from './components/CategoryPage';
import ProductCard    from './components/ProductCard';
import WhatsAppFloat  from './components/WhatsAppFloat';
import { getTopClicked, devLogAnalytics, clearAnalytics } from './hooks/useClickTracking';
import { addRecentlyViewed } from './hooks/useRecentlyViewed';

// Below-fold & interaction-gated components — lazy loaded
const ProductModal   = lazy(() => import('./components/ProductModal'));
const WhySection     = lazy(() => import('./components/WhySection'));
const StackSelling   = lazy(() => import('./components/StackSelling'));
const AccountPreview = lazy(() => import('./components/AccountPreview'));
const BrandTeaser    = lazy(() => import('./components/BrandTeaser'));

// ── Module-level constants (computed once) ────────────────────

// Slug → product ID reverse map (used for deep links)
const SLUG_TO_ID = (() => {
  const m = {};
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const slug = p.u?.match(/\/tienda\/([^/?#]+)/)?.[1];
    if (slug) m[slug] = id;
  }
  return m;
})();

// Group ALL products once at module level — immutable
const ALL_GROUPED = (() => {
  const g = {};
  for (const [id, p] of Object.entries(PRODUCTS)) {
    if (!g[p.s])      g[p.s] = {};
    if (!g[p.s][p.c]) g[p.s][p.c] = [];
    g[p.s][p.c].push([id, p]);
  }
  return g;
})();

// ── Smart search ──────────────────────────────────────────────

// Accent-normalize + lowercase for typo-tolerant search
// Handles: creatina / creatína, proteina / proteína, etc.
function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Score a product against a normalized query.
// Returns -1 if no match, else a positive relevance score.
// Higher score = more relevant = ranked earlier.
function scoreSearch(p, nq) {
  const nn = norm(p.n);
  const nb = norm(p.b);
  const nc = norm(p.c);
  const nf = norm((p.f || []).join(' '));

  if (!nn.includes(nq) && !nb.includes(nq) && !nc.includes(nq) && !nf.includes(nq)) return -1;

  let s = 0;
  if (nn.startsWith(nq))   s += 16; // name prefix — highest confidence
  else if (nn.includes(nq)) s += 10;
  if (nb.startsWith(nq))   s += 9;  // brand prefix
  else if (nb.includes(nq)) s += 6;
  if (nc.includes(nq))     s += 4;  // category
  if (nf.includes(nq))     s += 2;  // flavor

  // Curated boost — recommended/popular products rank slightly higher
  const slug = p.u?.match(/\/tienda\/([^/?#]+)/)?.[1] || '';
  if (PRODUCT_LABELS[slug] === 'recommended') s += 3;
  if (PRODUCT_LABELS[slug] === 'popular')     s += 2;

  return s;
}

// ── Deep link helpers ─────────────────────────────────────────

function parseProductHash() {
  const m = window.location.hash.match(/^#product\/([^/?&]+)/);
  if (!m) return null;
  return SLUG_TO_ID[decodeURIComponent(m[1])] || null;
}

function slugFromId(id) {
  const p = PRODUCTS[String(id)];
  return p?.u?.match(/\/tienda\/([^/?#]+)/)?.[1] || null;
}

// ── App ───────────────────────────────────────────────────────

// Return-visitor detection: reads/sets a localStorage flag on first visit.
// Used to adapt messaging for returning customers.
function detectVisitType() {
  const key = 'mf_visited';
  try {
    const seen = Boolean(localStorage.getItem(key));
    if (!seen) localStorage.setItem(key, '1');
    return seen ? 'returning' : 'new';
  } catch { return 'new'; }
}

export default function App() {
  const { theme, toggle } = useTheme();

  // Stable across renders — computed once on mount
  const visitType = useMemo(() => detectVisitType(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // View state: 'home' | 'section' | 'category'
  const [view,           setView]           = useState('home');
  const [activeSection,  setActiveSection]  = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [openProductId,  setOpenProductId]  = useState(null);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'instant' });

  // ── Return-visitor analytics (fires once on mount) ───────────
  useEffect(() => {
    if (visitType === 'returning') analytics.returnVisit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Deep link: read initial hash ─────────────────────────────
  useEffect(() => {
    const id = parseProductHash();
    if (id) {
      setOpenProductId(id);
      analytics.deepLink(slugFromId(id) || '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Deep link: browser back/forward ──────────────────────────
  useEffect(() => {
    function handlePop() {
      const id = parseProductHash();
      setOpenProductId(id);
    }
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // ── Dynamic page title + meta description ────────────────────
  useEffect(() => {
    const BASE_TITLE = 'MacroForge — Suplementos Originales en Costa Rica';
    const BASE_DESC  = 'Más de 600 suplementos originales en Costa Rica. Proteínas, creatinas, vitaminas, aceites doTERRA y más. Entrega en todo el país. Consultá por WhatsApp.';

    let title = BASE_TITLE;
    let desc  = BASE_DESC;

    if (openProductId && PRODUCTS[openProductId]) {
      const p = PRODUCTS[openProductId];
      title = `${p.n} — ${p.b} | MacroForge`;
      desc  = `${p.n} de ${p.b}. Suplemento original en Costa Rica — categoría ${p.c}. Disponible en MacroForge. Consultá precio y envío por WhatsApp.`;
    } else if (view === 'category' && activeCategory) {
      title = `${activeCategory} en Costa Rica | MacroForge`;
      desc  = `${activeCategory} originales en Costa Rica. Marcas verificadas con entrega directa. Consultá precios y disponibilidad por WhatsApp.`;
    } else if (view === 'section' && activeSection) {
      const sl = SECTIONS[activeSection]?.label || '';
      title = `${sl} | MacroForge`;
      desc  = `${sl} en Costa Rica. Productos originales de marcas reconocidas. Entrega en todo el país — consultá por WhatsApp.`;
    }

    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);
  }, [view, activeSection, activeCategory, openProductId]);

  // ── Dev analytics helpers ─────────────────────────────────────
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__mfAnalytics = {
        log:    devLogAnalytics,
        top:    () => console.table(getTopClicked(20)),
        clear:  clearAnalytics,
        events: () => console.table(analytics.getBuffer().slice(-30)),
        clearEvents: analytics.clearBuffer,
      };
      devLogAnalytics();
    }
  }, []);

  // ── Navigation ────────────────────────────────────────────────

  const goHome = useCallback(() => {
    setView('home');
    setActiveSection(null);
    setActiveCategory(null);
    setSearchQuery('');
    scrollTop();
  }, []);

  const goSection = useCallback((sectionId) => {
    setView('section');
    setActiveSection(sectionId);
    setActiveCategory(null);
    setSearchQuery('');
    scrollTop();
    analytics.sectionView(sectionId, SECTIONS[sectionId]?.label || '');
  }, []);

  const goCategory = useCallback((catName) => {
    setView('category');
    setActiveCategory(catName);
    setSearchQuery('');
    scrollTop();
    analytics.categoryView(catName, activeSection || '');
  }, [activeSection]);

  // Used by GoalNav — navigates directly to a section + category
  const goSectionCategory = useCallback((sectionId, catName) => {
    setView('category');
    setActiveSection(sectionId);
    setActiveCategory(catName);
    setSearchQuery('');
    scrollTop();
    analytics.categoryView(catName, sectionId);
  }, []);

  const goBack = useCallback(() => {
    if (view === 'category') {
      setView('section');
      setActiveCategory(null);
      scrollTop();
    } else {
      goHome();
    }
  }, [view, goHome]);

  // ── Product modal with deep-link hash sync ────────────────────

  const handleOpen = useCallback((id) => {
    const slug = slugFromId(id);
    if (slug) history.pushState({ productId: id }, '', `#product/${slug}`);
    setOpenProductId(id);
    addRecentlyViewed(id);                     // persist for return-visit retention
    analytics.productView(id, PRODUCTS[String(id)]);
  }, []);

  const handleClose = useCallback(() => {
    history.pushState(null, '', window.location.pathname + window.location.search);
    setOpenProductId(null);
  }, []);

  // ── Section product counts ────────────────────────────────────
  const sectionCounts = useMemo(() => {
    const c = {};
    for (const [sId, cats] of Object.entries(ALL_GROUPED))
      c[sId] = Object.values(cats).reduce((s, a) => s + a.length, 0);
    return c;
  }, []);

  // ── Smart search — normalized + ranked ────────────────────────
  const searchResults = useMemo(() => {
    const q = deferredQuery.trim();
    if (!q) return null;
    const nq = norm(q);

    return Object.entries(PRODUCTS)
      .filter(([, p]) => {
        if (view === 'section'  && p.s !== activeSection)  return false;
        if (view === 'category' && p.c !== activeCategory)  return false;
        return true;
      })
      .map(entry => [entry, scoreSearch(entry[1], nq)])
      .filter(([, score]) => score > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([entry]) => entry);
  }, [deferredQuery, view, activeSection, activeCategory]);

  // ── Search analytics — fires on stable search term ───────────
  useEffect(() => {
    if (!deferredQuery.trim()) return;
    analytics.search(deferredQuery.trim(), searchResults?.length ?? 0);
  }, [deferredQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const showHero = view === 'home' && !searchResults && !deferredQuery;

  const searchEmptyWaMsg = `Hola MacroForge! Busqué "${searchQuery}" en el catálogo y no lo encontré. ¿Tienen algo similar o pueden conseguirlo?`;
  const searchEmptyWaUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(searchEmptyWaMsg)}`;

  return (
    <>
      {/* ── Hero + trust — home only ── */}
      {showHero && (
        <>
          <Hero onNavigate={goSection} />

          <div className="trust-bar">
            <div className="trust-bar-item"><span className="trust-bar-icon">✅</span>
              <div className="trust-bar-text"><span className="trust-bar-label">Productos 100% Originales</span><span className="trust-bar-sub">Garantía de autenticidad</span></div>
            </div>
            <div className="trust-bar-item"><span className="trust-bar-icon">🚀</span>
              <div className="trust-bar-text"><span className="trust-bar-label">Envíos en Costa Rica</span><span className="trust-bar-sub">A todo el país</span></div>
            </div>
            <div className="trust-bar-item"><span className="trust-bar-icon">⚡</span>
              <div className="trust-bar-text"><span className="trust-bar-label">Respuesta en minutos</span><span className="trust-bar-sub">Atención directa por WhatsApp</span></div>
            </div>
            <div className="trust-bar-item"><span className="trust-bar-icon">🎯</span>
              <div className="trust-bar-text"><span className="trust-bar-label">Asesoría personalizada</span><span className="trust-bar-sub">Sin costo · Sin compromiso</span></div>
            </div>
          </div>

          <div className="tip">
            <b>Mejor experiencia:</b> Si abriste esto desde WhatsApp, tocá <b>Compartir</b> y elegí{' '}
            <b>Abrir en Chrome/Safari</b> para ver el catálogo completo.
          </div>
        </>
      )}

      {/* ── Sticky nav ── */}
      <Controls
        view={view}
        activeSection={activeSection}
        activeCategory={activeCategory}
        searchQuery={searchQuery}
        visibleCount={searchResults ? searchResults.length : null}
        onBack={goBack}
        onGoHome={goHome}
        onSearch={setSearchQuery}
        theme={theme}
        onThemeToggle={toggle}
      />

      {/* ── Main content ── */}
      <main
        className="view-content"
        key={`${view}|${activeSection}|${activeCategory}`}
        aria-label={
          view === 'home'     ? 'Catálogo de suplementos MacroForge' :
          view === 'section'  ? `Sección ${SECTIONS[activeSection]?.label || ''}` :
          view === 'category' ? `Categoría: ${activeCategory || ''}` :
          'Catálogo'
        }
      >

        {/* Search results — with ranked results and empty-state recovery */}
        {searchResults && (
          <div className="search-page">
            <div className="search-page-header">
              {view !== 'home' && (
                <div className="search-page-scope">
                  {view === 'section' && SECTIONS[activeSection]?.label}
                  {view === 'category' && activeCategory}
                  {' '}&rsaquo; búsqueda
                </div>
              )}
              <div className="search-page-count">
                {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para
              </div>
              <h2 className="search-page-query">"{searchQuery}"</h2>
            </div>

            {searchResults.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">Sin resultados para "{searchQuery}"</div>
                <div className="empty-sub">Probá otro término — o consultanos y lo buscamos por vos.</div>
                <a
                  className="empty-wa"
                  href={searchEmptyWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => analytics.whatsappClick('search_empty', null, searchQuery)}
                >
                  💬 Consultar por WhatsApp
                </a>
              </div>
            ) : (
              <div className="product-grid">
                {searchResults.map(([id, product]) => (
                  <ProductCard key={id} product={product} onClick={() => handleOpen(id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Home: featured products + goal nav + 3 section cards */}
        {!searchResults && view === 'home' && (
          <CatalogHome
            sections={SECTIONS}
            sectionCounts={sectionCounts}
            onSelectSection={goSection}
            onOpenProduct={handleOpen}
            onGoal={goSectionCategory}
          />
        )}

        {/* Section: category tiles */}
        {!searchResults && view === 'section' && activeSection && (
          <SectionPage
            sectionId={activeSection}
            sectionData={SECTIONS[activeSection]}
            productsByCategory={ALL_GROUPED[activeSection] || {}}
            onSelectCategory={goCategory}
          />
        )}

        {/* Category: product grid */}
        {!searchResults && view === 'category' && activeCategory && activeSection && (
          <CategoryPage
            sectionData={SECTIONS[activeSection]}
            categoryName={activeCategory}
            products={ALL_GROUPED[activeSection]?.[activeCategory] || []}
            onOpenProduct={handleOpen}
          />
        )}

      </main>

      {showHero && (
        <Suspense fallback={null}>
          <WhySection />
          <StackSelling />
          <AccountPreview />
          <BrandTeaser />
        </Suspense>
      )}

      {showHero && (
        <footer className="footer" role="contentinfo" aria-label="MacroForge — pie de página">
          <div className="footer-brand">MACRO<span>FORGE</span></div>
          <address className="footer-meta" style={{ fontStyle: 'normal' }}>
            <div>
              <span itemProp="addressLocality">San José</span>
              {', '}
              <span itemProp="addressCountry">CR</span>
              {' · Catálogo 2026'}
            </div>
            <div>Todos los precios +IVA</div>
            <div><em>✦ Salud · Performance · Bienestar ✦</em></div>
          </address>
        </footer>
      )}

      {openProductId && (
        <Suspense fallback={null}>
          <ProductModal
            productId={openProductId}
            onClose={handleClose}
            onOpen={handleOpen}
          />
        </Suspense>
      )}

      <WhatsAppFloat />
    </>
  );
}
