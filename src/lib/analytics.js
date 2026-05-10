/**
 * MacroForge — Centralized Analytics Layer
 *
 * ALL event tracking routes through this module.
 * Writes to a localStorage event buffer (zero dependencies) AND
 * forwards to GA4 + Meta Pixel when IDs are present.
 *
 * ── GA4 activation ──────────────────────────────────────────────
 * Set VITE_GA4_ID in your .env file:
 *   VITE_GA4_ID=G-XXXXXXXXXX
 *
 * Then add to index.html <head> (replace YOUR_ID with the same value):
 *   <script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_ID"></script>
 *   <script>
 *     window.dataLayer = window.dataLayer || [];
 *     function gtag(){dataLayer.push(arguments);}
 *     gtag('js', new Date());
 *     gtag('config', 'YOUR_ID', { send_page_view: false });
 *   </script>
 *
 * page_view is sent manually via analytics.pageView() to prevent
 * duplicate fires from the SPA router + gtag auto-collection.
 *
 * ── Meta Pixel activation ────────────────────────────────────────
 * Set VITE_PIXEL_ID in your .env file:
 *   VITE_PIXEL_ID=1234567890123456
 *
 * Then add to index.html <head>:
 *   <script>
 *     !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
 *     n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
 *     n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
 *     t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
 *     document,'script','https://connect.facebook.net/en_US/fbevents.js');
 *     fbq('init', 'YOUR_PIXEL_ID');
 *     // Do NOT call fbq('track','PageView') here — analytics.pageView() handles it
 *   </script>
 *
 * ── Dev console helpers ──────────────────────────────────────────
 *   window.__mfEvents()        → last 30 buffered events
 *   window.__mfEvents.all()    → full buffer
 *   window.__mfEvents.clear()  → clear buffer
 */

// ── IDs: read from Vite env vars, fall back to null ──────────────
// In production: set VITE_GA4_ID and VITE_PIXEL_ID in your .env
// In GitHub Pages: set them as repository secrets and inject via CI
const GA4_ID   = import.meta.env?.VITE_GA4_ID   || null;
const PIXEL_ID = import.meta.env?.VITE_PIXEL_ID  || null;

// ── Internal buffer ───────────────────────────────────────────────
const BUFFER_KEY = 'mf_events';
const BUFFER_MAX = 300;

function _buffer(name, params) {
  try {
    const raw    = localStorage.getItem(BUFFER_KEY);
    const events = raw ? JSON.parse(raw) : [];
    events.push({ n: name, p: params, t: Date.now() });
    if (events.length > BUFFER_MAX) events.splice(0, events.length - BUFFER_MAX);
    localStorage.setItem(BUFFER_KEY, JSON.stringify(events));
  } catch { /* storage full or disabled — silent */ }
}

// ── GA4 safe wrapper ──────────────────────────────────────────────
function _ga4(name, params) {
  if (!GA4_ID) return;
  try {
    if (typeof gtag !== 'undefined') gtag('event', name, params);
  } catch {}
}

// ── Meta Pixel event map ──────────────────────────────────────────
// Maps internal event names → standard Meta Pixel event names.
// Standard events unlock Meta's optimization algorithms (conversion,
// purchase intent, lookalike audiences).
const FB_MAP = {
  product_view:    { event: 'ViewContent',       standard: true  },
  whatsapp_click:  { event: 'InitiateCheckout',  standard: true  },
  whatsapp_float:  { event: 'Contact',           standard: true  },
  goal_nav_click:  { event: 'Lead',              standard: true  },
  search:          { event: 'Search',            standard: true  },
  favorite:        { event: 'AddToWishlist',     standard: true  },
  share:           { event: 'CustomizeProduct',  standard: false },
  stack_cta_click: { event: 'InitiateCheckout',  standard: true  },
  return_visit:    { event: 'CustomAudience',    standard: false },
};

function _pixel(name, params) {
  if (!PIXEL_ID) return;
  const mapping = FB_MAP[name];
  if (!mapping) return;
  try {
    if (typeof fbq !== 'undefined') {
      const method = mapping.standard ? 'track' : 'trackCustom';
      fbq(method, mapping.event, params);
    }
  } catch {}
}

// ── Core fire ─────────────────────────────────────────────────────
function _fire(name, params = {}) {
  _buffer(name, params);
  _ga4(name, params);
  _pixel(name, params);

  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`%c[MF] ${name}`, 'color:#E3001E;font-weight:700', params);
  }
}

// ── Public API ────────────────────────────────────────────────────

export const analytics = {

  /** SPA page view — call once on mount and on view changes if needed */
  pageView(path, title) {
    _ga4('page_view', { page_path: path || window.location.pathname, page_title: title || document.title });
    try { if (PIXEL_ID && typeof fbq !== 'undefined') fbq('track', 'PageView'); } catch {}
    _buffer('page_view', { path, title });
  },

  /** Product modal opened */
  productView(id, product) {
    if (!product) return;
    _fire('product_view', {
      item_id:       String(id),
      item_name:     product.n,
      item_brand:    product.b,
      item_category: product.c,
      item_section:  product.s,
      currency:      'CRC',
    });
  },

  /** Any product WhatsApp CTA clicked (modal, search empty, etc.) */
  whatsappClick(source, productId, productName) {
    _fire('whatsapp_click', {
      source,
      item_id:   String(productId || ''),
      item_name: productName || '',
    });
  },

  /** WhatsApp float button clicked */
  whatsappFloat(source) {
    _fire('whatsapp_float', { source: source || 'float_button' });
  },

  /** Category page entered */
  categoryView(categoryName, sectionId) {
    _fire('view_item_list', {
      item_list_name: categoryName,
      item_list_id:   sectionId,
    });
  },

  /** Section page entered */
  sectionView(sectionId, sectionLabel) {
    _fire('section_view', { section: sectionId, label: sectionLabel });
  },

  /** Search query submitted */
  search(term, resultCount) {
    if (!term?.trim()) return;
    _fire('search', { search_term: term, results: resultCount });
  },

  /** Goal navigation strip clicked */
  goalNav(goalId, goalLabel, targetCategory) {
    _fire('goal_nav_click', { goal: goalId, label: goalLabel, category: targetCategory });
  },

  /** Product share action */
  share(productId, productName, method) {
    _fire('share', { item_id: String(productId), item_name: productName, method });
  },

  /** Related product clicked inside modal */
  relatedClick(fromId, toId, toName) {
    _fire('select_item', {
      item_list_name: 'related',
      item_id:        String(toId),
      item_name:      toName,
      from_item_id:   String(fromId),
    });
  },

  /** Featured product card clicked on home */
  featuredClick(productId, productName, slot) {
    _fire('select_item', {
      item_list_name: 'featured',
      item_id:        String(productId),
      item_name:      productName,
      index:          slot,
    });
  },

  /** Deep link URL consumed (#product/slug) */
  deepLink(slug) {
    _fire('deep_link', { slug });
  },

  /** Stack consultation CTA clicked */
  stackCTA(goalId, goalLabel) {
    _fire('stack_cta_click', { goal: goalId, label: goalLabel });
  },

  /** Beginner discovery path used */
  beginnerPath(categoryName, sectionId) {
    _fire('beginner_path_click', { category: categoryName, section: sectionId });
  },

  /** Product favorited or unfavorited */
  favorite(productId, productName, action) {
    _fire('favorite', {
      item_id:   String(productId),
      item_name: productName,
      action,   // 'add' | 'remove'
    });
  },

  /** Returning visitor detected on app mount */
  returnVisit(visitCount) {
    _fire('return_visit', { visit_count: visitCount || 1, ts: Date.now() });
  },

  /** Recently viewed product clicked on home */
  recentlyViewedClick(productId, productName) {
    _fire('select_item', {
      item_list_name: 'recently_viewed',
      item_id:        String(productId),
      item_name:      productName,
    });
  },

  /** Favorites list "Consultar todos" WhatsApp button clicked */
  favoritesConsult(count) {
    _fire('favorites_consult', { count });
  },

  /** Authority guide page opened (#guia/slug) */
  guideView(slug, title) {
    _fire('guide_view', { slug, title });
  },

  /** Refill hint acted on — user clicked WhatsApp from the refill reminder */
  refillHintClick(productId, category, daysSince) {
    _fire('refill_hint_click', {
      item_id:  String(productId),
      category,
      days_since_purchase: daysSince,
    });
  },

  // ── Dev helpers ──────────────────────────────────────────────────
  getBuffer() {
    try { return JSON.parse(localStorage.getItem(BUFFER_KEY) || '[]'); } catch { return []; }
  },
  clearBuffer() {
    try { localStorage.removeItem(BUFFER_KEY); } catch {}
  },
};
