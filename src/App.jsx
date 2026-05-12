import { useState, useMemo, useCallback, useEffect, lazy, Suspense, useDeferredValue } from 'react';
import { PRODUCTS } from './data/products';
import { SECTIONS } from './data/catalog';
import { PRODUCT_LABELS } from './data/labels';
import { useTheme } from './hooks/useTheme';
import { analytics } from './lib/analytics';
import { buildWaUrl } from './lib/whatsapp';

import Hero           from './components/Hero';
import Controls       from './components/Controls';
import CatalogHome    from './components/CatalogHome';
import SectionPage    from './components/SectionPage';
import CategoryPage   from './components/CategoryPage';
import ProductCard    from './components/ProductCard';
import WhatsAppFloat  from './components/WhatsAppFloat';
import { getTopClicked, devLogAnalytics, clearAnalytics } from './hooks/useClickTracking';
import { addRecentlyViewed } from './hooks/useRecentlyViewed';
import { logIntelReport, getIntelReport } from './lib/intelligence';
import { logStackReport, getStackReport } from './lib/stackIntelligence';
import { logSegmentReport, getCrmProfile, getPrimarySegment, getLeadScore } from './lib/segmentation';
import { captureReferralFromUrl } from './lib/referralCode';
import {
  initAutomation,
  getAutomationStatus,
  logAutomationReport,
  registerAutomationIntent,
  CAMPAIGNS,
} from './lib/whatsappAutomation';
import { getIntents, getPendingIntents, clearAllIntents, getQueueStatus } from './lib/automationQueue';

// Below-fold & interaction-gated components — lazy loaded
const ProductModal    = lazy(() => import('./components/ProductModal'));
const WhySection      = lazy(() => import('./components/WhySection'));
const StackSelling    = lazy(() => import('./components/StackSelling'));
const AIStackBuilder  = lazy(() => import('./components/AIStackBuilder'));
const AccountPreview  = lazy(() => import('./components/AccountPreview'));
const GuidePage       = lazy(() => import('./components/GuidePage'));

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

// Synonym map: maps common terms / abbreviations / goal words →
// category keywords that boost products in those categories.
// This lets customers search in the way they THINK, not the way
// the catalog is structured.
// Keys are normalized (accent-free, lowercase).
const SEARCH_SYNONYMS = {
  // abbreviations / shorthands
  'whey':        'proteinas whey',
  'iso':         'proteinas isoladas',
  'pre':         'pre-entrenamientos',
  'preworkout':  'pre-entrenamientos',
  'pre workout': 'pre-entrenamientos',
  'gainer':      'gainers de masa',
  'bcaa':        'bcaa',
  'eaa':         'aminoacidos esenciales',
  'crea':        'creatinas',
  'multi':       'multivitaminicos',
  'omega':       'omega y grasas saludables',
  'fish oil':    'omega y grasas saludables',
  'colageno':    'colageno y belleza',
  'melatonina':  'sueno y relajacion',

  // goal words — customers think in outcomes
  'fuerza':      'creatinas',
  'masa':        'gainers de masa',
  'musculo':     'proteinas whey',
  'volumen':     'gainers de masa',
  'definicion':  'quemadores de grasa',
  'bajar':       'quemadores de grasa',
  'adelgazar':   'quemadores de grasa',
  'quemar':      'quemadores de grasa',
  'energia':     'pre-entrenamientos',
  'energía':     'pre-entrenamientos',
  'dormir':      'sueno y relajacion',
  'sueño':       'sueno y relajacion',
  'sueno':       'sueno y relajacion',
  'descanso':    'sueno y relajacion',
  'ansiedad':    'sueno y relajacion',
  'estres':      'adaptogenos y hormonas',
  'estros':      'adaptogenos y hormonas',
  'cortisol':    'adaptogenos y hormonas',
  'pelo':        'cuidado del cabello',
  'cabello':     'cuidado del cabello',
  'piel':        'cuidado de la piel',
  'articulacion':'articulaciones',
  'rodilla':     'articulaciones',
  'colesterol':  'omega y grasas saludables',
  'intestino':   'probioticos',
  'digestion':   'digestion y enzimas',
  'higado':      'detox y salud hepatica',
  'calambres':   'electrolitos',
  'hidratacion': 'electrolitos',
  'cerebro':     'salud mental y cognitiva',
  'enfoque':     'salud mental y cognitiva',
  'concentracion':'salud mental y cognitiva',
  'memoria':     'salud mental y cognitiva',
  'corazon':     'salud cardiovascular',
  'natural':     'aceites esenciales individuales',
  'aromaterapia':'aromaterapia emocional',
  'aceite':      'aceites esenciales individuales',
  'esencial':    'aceites esenciales individuales',
  'doterra':     'aceites esenciales individuales',
  'testosterone':'precursores hormonales',
  'testosterona':'precursores hormonales',
  'hormonal':    'precursores hormonales',
  'recuperacion':'glutamina',
  'recuperación':'glutamina',
  'longevidad':  'longevidad celular',
  'nad':         'longevidad celular',
  'huesos':      'articulaciones',
  'vitamina c':  'vitaminas esenciales',
  'vitamina d':  'vitaminas esenciales',
  'zinc':        'minerales',
  'hierro':      'minerales',
  'calcio':      'minerales',
  'magnesio':    'magnesio',
  'beginner':    'creatinas',  // english fallback
  'protein':     'proteinas whey',
  'creatine':    'creatinas',
};

// Resolve a query to its canonical form (synonym expansion)
// Returns: { resolvedQuery, categoryBoost | null }
function resolveQuery(rawQuery) {
  const nq = norm(rawQuery.trim());
  const mapped = SEARCH_SYNONYMS[nq];
  return {
    resolvedQuery: nq,
    categoryBoost: mapped ? norm(mapped) : null,
  };
}

// Score a product against a normalized query.
// Returns -1 if no match, else a positive relevance score.
// Higher score = more relevant = ranked earlier.
function scoreSearch(p, nq, categoryBoost) {
  const nn = norm(p.n);
  const nb = norm(p.b);
  const nc = norm(p.c);
  const nf = norm((p.f || []).join(' '));

  // Category boost match (synonym-driven): boost products in the mapped category
  const hasCategoryBoost = categoryBoost && nc.includes(categoryBoost);

  if (!nn.includes(nq) && !nb.includes(nq) && !nc.includes(nq) && !nf.includes(nq) && !hasCategoryBoost) return -1;

  let s = 0;
  if (nn.startsWith(nq))    s += 16; // name prefix — highest confidence
  else if (nn.includes(nq)) s += 10;
  if (nb.startsWith(nq))    s += 9;  // brand prefix
  else if (nb.includes(nq)) s += 6;
  if (nc.includes(nq))      s += 4;  // category exact
  if (nf.includes(nq))      s += 2;  // flavor

  // Synonym-driven category boost: goal words surface the right products
  if (hasCategoryBoost)     s += 5;

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

// ── Guide deep-link helpers ───────────────────────────────────

function parseGuideHash() {
  const m = window.location.hash.match(/^#guia\/([^/?&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// ── App ───────────────────────────────────────────────────────

// Return-visitor detection: tracks visit count in localStorage.
// Returns { type: 'new'|'returning', count: number }
function detectVisitType() {
  const key = 'mf_visit_count';
  try {
    const prev  = parseInt(localStorage.getItem(key) || '0', 10);
    const next  = prev + 1;
    localStorage.setItem(key, String(next));
    return { type: prev > 0 ? 'returning' : 'new', count: next };
  } catch { return { type: 'new', count: 1 }; }
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
  const [activeGuide,    setActiveGuide]    = useState(null);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'instant' });

  // ── Return-visitor analytics (fires once on mount) ───────────
  useEffect(() => {
    if (visitType.type === 'returning') analytics.returnVisit(visitType.count);
    // Phase 8: evaluate automation eligibility on every visit (safe, deduped)
    initAutomation();
    // Phase 13: capture referral codes from URL params (safe localStorage write)
    captureReferralFromUrl();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Deep link: read initial hash ─────────────────────────────
  useEffect(() => {
    const productId = parseProductHash();
    const guideSlug = parseGuideHash();
    if (productId) {
      setOpenProductId(productId);
      analytics.deepLink(slugFromId(productId) || '');
    } else if (guideSlug) {
      setActiveGuide(guideSlug);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Deep link: browser back/forward ──────────────────────────
  useEffect(() => {
    function handlePop() {
      const productId = parseProductHash();
      const guideSlug = parseGuideHash();
      setOpenProductId(productId);
      setActiveGuide(guideSlug);
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
      window.__mfEvents = Object.assign(
        () => console.table(analytics.getBuffer().slice(-30)),
        {
          all:   () => console.table(analytics.getBuffer()),
          clear: () => analytics.clearBuffer(),
        }
      );
      window.__mfIntel = {
        report:        () => logIntelReport(),
        data:          () => getIntelReport(),
        desires:       () => console.table(getIntelReport().productDesires),
        barriers:      () => console.table(getIntelReport().desireBarriers),
        searchFailures:() => console.table(getIntelReport().searchFailures),
        categoryHeat:  () => console.table(getIntelReport().categoryHeat),
        goalHeat:      () => console.table(getIntelReport().goalHeat),
      };

      // Phase 3 — AI Stack Builder intelligence
      window.__mfStack = {
        report:         () => logStackReport(),
        data:           () => getStackReport(),
        funnel:         () => console.table(getStackReport().funnelDropout),
        goals:          () => console.table(getStackReport().goalDistribution),
        budgets:        () => console.table(getStackReport().budgetDistribution),
        abandonment:    () => console.table(getStackReport().abandonmentPatterns),
        conversion:     () => console.log(getStackReport().waConversion),
        combos:         () => console.table(getStackReport().popularCombinations),
      };

      // Phase 3 — Customer segmentation + CRM profile
      window.__mfSegment = {
        report:    () => logSegmentReport(),
        profile:   () => getCrmProfile(),
        segment:   () => console.log(`Segment: ${getPrimarySegment()} | Lead score: ${getLeadScore()}/100`),
        triggers:  () => console.table(getCrmProfile().triggers),
        goals:     () => console.log(getCrmProfile().goals),
        affinity:  () => console.table(getCrmProfile().category_affinity),
      };

      // Phase 3.6 — Revenue tracking status
      window.__mfTracking = {
        status: () => console.log(analytics.trackingStatus),
        test:   () => {
          console.log('%c[MacroForge] Firing test events...', 'color:#E3001E;font-weight:700');
          analytics.stackCTA('tracking_test', 'Revenue Tracking Test');
          console.log('  ✓ stack_cta_click fired — check GA4 Realtime + Meta Events Manager');
        },
      };

      // Phase 8 — WhatsApp Automation Infrastructure
      window.__mfAutomation = {
        status:     () => console.log(getAutomationStatus()),
        list:       () => console.table(getIntents()),
        pending:    () => console.table(getPendingIntents()),
        queue:      () => console.log(getQueueStatus()),
        clear:      () => { clearAllIntents(); console.log('[MacroForge Automation] Queue cleared.'); },
        report:     () => logAutomationReport(),
        campaigns:  () => console.table(Object.values(CAMPAIGNS).map(c => ({
          id:       c.id,
          priority: c.priority,
          template: c.templateKey,
          cooldown: `${Math.round(c.cooldownMs / 86400_000)}d`,
          consent:  c.consentRequired,
        }))),
        testIntent: (type) => {
          const intent = registerAutomationIntent(type || 'abandoned_stack_24h', { test: true, visitCount: 1, segment: 'test' });
          console.log(intent ? `[MacroForge Automation] Test intent created: ${type}` : '[MacroForge Automation] Intent deduped or invalid.');
          return intent;
        },
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
    setActiveGuide(null);
    history.pushState(null, '', window.location.pathname + window.location.search);
    scrollTop();
  }, []);

  // Open an authority guide — hash-synced for shareability
  const goGuide = useCallback((slug) => {
    history.pushState({ guide: slug }, '', `#guia/${slug}`);
    setActiveGuide(slug);
    setOpenProductId(null);
    scrollTop();
  }, []);

  // Close guide — called by GuidePage "Volver" or to navigate to a related guide
  const closeGuide = useCallback((nextSlug) => {
    if (nextSlug && typeof nextSlug === 'string') {
      goGuide(nextSlug);
    } else {
      history.pushState(null, '', window.location.pathname + window.location.search);
      setActiveGuide(null);
      scrollTop();
    }
  }, [goGuide]);

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

  // ── Smart search — normalized + synonym-aware + behaviorally ranked ──
  const searchResults = useMemo(() => {
    const q = deferredQuery.trim();
    if (!q) return null;
    const { resolvedQuery: nq, categoryBoost } = resolveQuery(q);

    // Behavioral boost: products this user has personally clicked rank higher.
    // Reads from localStorage — cheap, synchronous, no rerenders.
    const clickedSlugs = new Set(getTopClicked(20).map(c => c.slug));

    return Object.entries(PRODUCTS)
      .filter(([, p]) => {
        if (view === 'section'  && p.s !== activeSection)  return false;
        if (view === 'category' && p.c !== activeCategory)  return false;
        return true;
      })
      .map(entry => {
        const base  = scoreSearch(entry[1], nq, categoryBoost);
        if (base < 0) return [entry, -1];
        // Personal behavioral boost — products this visitor has clicked before
        const slug  = entry[1].u?.match(/\/tienda\/([^/?#]+)/)?.[1] || '';
        const boost = clickedSlugs.has(slug) ? 2 : 0;
        return [entry, base + boost];
      })
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

  const searchEmptyWaUrl = buildWaUrl('searchMiss', { query: searchQuery });

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
              <div className="trust-bar-text"><span className="trust-bar-label">Atención personalizada</span><span className="trust-bar-sub">Directa y sin bots por WhatsApp</span></div>
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

      {/* ── Guide page — authority content, full-view overlay ── */}
      {activeGuide && (
        <main className="view-content" key={`guide|${activeGuide}`} aria-label={`Guía: ${activeGuide}`}>
          <Suspense fallback={null}>
            <GuidePage
              slug={activeGuide}
              onClose={closeGuide}
              onOpenProduct={handleOpen}
            />
          </Suspense>
        </main>
      )}

      {/* ── Main content ── */}
      {!activeGuide && (
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
      )} {/* end !activeGuide */}

      {showHero && !activeGuide && (
        <Suspense fallback={null}>
          <WhySection />
          <StackSelling />
          <AIStackBuilder />
          <AccountPreview />
        </Suspense>
      )}

      {showHero && !activeGuide && (
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
