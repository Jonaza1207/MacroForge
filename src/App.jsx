import { useState, useMemo, useCallback, useEffect, lazy, Suspense, useDeferredValue } from 'react';
import { PRODUCTS } from './data/products';
import { SECTIONS } from './data/catalog';
import { useTheme } from './hooks/useTheme';

import Hero           from './components/Hero';
import Controls       from './components/Controls';
import CatalogHome    from './components/CatalogHome';
import SectionPage    from './components/SectionPage';
import CategoryPage   from './components/CategoryPage';
import ProductCard    from './components/ProductCard';
import WhatsAppFloat  from './components/WhatsAppFloat';
import { getTopClicked, devLogAnalytics, clearAnalytics } from './hooks/useClickTracking';

// Below-fold & interaction-gated components — lazy loaded
// ProductModal pulls in HEALTH data (~28KB) — only needed on product click
const ProductModal   = lazy(() => import('./components/ProductModal'));
// Home-only sections — loaded after hero renders
const WhySection     = lazy(() => import('./components/WhySection'));
const AccountPreview = lazy(() => import('./components/AccountPreview'));
const BrandTeaser    = lazy(() => import('./components/BrandTeaser'));

function buildSearchStr(p) {
  return [p.n, p.b, p.c, ...(p.f || [])].join(' ').toLowerCase();
}

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

export default function App() {
  const { theme, toggle } = useTheme();

  // Dev-only: expose analytics helpers in browser console
  // Usage: __mfAnalytics.log() or __mfAnalytics.top()
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__mfAnalytics = {
        log:   devLogAnalytics,
        top:   () => console.table(getTopClicked(20)),
        clear: clearAnalytics,
      };
      devLogAnalytics(); // auto-log on load if data exists
    }
  }, []);

  // View state: 'home' | 'section' | 'category'
  const [view,           setView]           = useState('home');
  const [activeSection,  setActiveSection]  = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [openProductId,  setOpenProductId]  = useState(null);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'instant' });

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
  }, []);

  const goCategory = useCallback((catName) => {
    setView('category');
    setActiveCategory(catName);
    setSearchQuery('');
    scrollTop();
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

  const handleOpen  = useCallback(id => setOpenProductId(id),   []);
  const handleClose = useCallback(()  => setOpenProductId(null), []);

  // Section product counts
  const sectionCounts = useMemo(() => {
    const c = {};
    for (const [sId, cats] of Object.entries(ALL_GROUPED))
      c[sId] = Object.values(cats).reduce((s, a) => s + a.length, 0);
    return c;
  }, []);

  // Search: scoped to current view context.
  // Uses deferredQuery so the input stays responsive while the
  // O(n) filter over 500+ products runs at lower priority.
  const searchResults = useMemo(() => {
    const q = deferredQuery.toLowerCase().trim();
    if (!q) return null;
    return Object.entries(PRODUCTS).filter(([, p]) => {
      if (view === 'section'  && p.s !== activeSection)  return false;
      if (view === 'category' && p.c !== activeCategory)  return false;
      return buildSearchStr(p).includes(q);
    });
  }, [deferredQuery, view, activeSection, activeCategory]);

  const showHero = view === 'home' && !searchResults && !deferredQuery;

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

        {/* Search results (overrides view) */}
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
                <div className="empty-title">Sin resultados</div>
                <div className="empty-sub">Probá con otro término o explorá por categoría.</div>
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

        {/* Home: featured products + 3 section cards */}
        {!searchResults && view === 'home' && (
          <CatalogHome
            sections={SECTIONS}
            sectionCounts={sectionCounts}
            onSelectSection={goSection}
            onOpenProduct={handleOpen}
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
          <ProductModal productId={openProductId} onClose={handleClose} />
        </Suspense>
      )}

      <WhatsAppFloat />
    </>
  );
}
