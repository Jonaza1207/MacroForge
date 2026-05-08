/**
 * MacroForge — Centralized Analytics Layer
 *
 * ALL event tracking routes through this module.
 * Currently writes to a localStorage event buffer (zero dependencies).
 *
 * To activate GA4:
 *   1. Add your Measurement ID to GA4_ID below
 *   2. Add the gtag script to index.html
 *   3. Events fire automatically — no other code changes needed.
 *
 * To activate Meta Pixel:
 *   1. Add your Pixel ID to PIXEL_ID below
 *   2. Add the fbq script to index.html
 *   3. Key events (ViewContent, Lead) fire automatically.
 *
 * Event buffer is available in browser dev tools:
 *   JSON.parse(localStorage.getItem('mf_events'))
 */

// ── Plug in your IDs here when accounts are ready ────────────
const GA4_ID   = null; // e.g. 'G-XXXXXXXXXX'
const PIXEL_ID = null; // e.g. '1234567890123456'

// ── Internal buffer ───────────────────────────────────────────
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

// Pixel event name mapping
const FB_MAP = {
  product_view:    'ViewContent',
  whatsapp_click:  'InitiateCheckout',
  whatsapp_float:  'Lead',
  goal_nav_click:  'Lead',
};

function _fire(name, params = {}) {
  _buffer(name, params);

  if (GA4_ID && typeof gtag !== 'undefined') {
    try { gtag('event', name, params); } catch {}
  }
  if (PIXEL_ID && typeof fbq !== 'undefined') {
    const fb = FB_MAP[name];
    if (fb) try { fbq('track', fb, params); } catch {}
  }

  if (import.meta.env?.DEV) {
    console.debug(`%c[MF Analytics] ${name}`, 'color:#E3001E;font-weight:700', params);
  }
}

// ── Public API ────────────────────────────────────────────────

export const analytics = {

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

  /** Any WhatsApp CTA clicked */
  whatsappClick(source, productId, productName) {
    _fire('whatsapp_click', {
      source,
      item_id:   String(productId || ''),
      item_name: productName || '',
    });
  },

  /** WhatsApp float button clicked */
  whatsappFloat() {
    _fire('whatsapp_float', {});
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
    if (!term.trim()) return;
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

  /** Related product clicked in modal */
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

  /** Deep link URL used (#product/slug) */
  deepLink(slug) {
    _fire('deep_link', { slug });
  },

  /** Stack consultation CTA clicked */
  stackCTA(goalId, goalLabel) {
    _fire('stack_cta_click', { goal: goalId, label: goalLabel });
  },

  /** Beginner "Para empezar" category path used */
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
  returnVisit() {
    _fire('return_visit', { ts: Date.now() });
  },

  /** Recently viewed product clicked on home */
  recentlyViewedClick(productId, productName) {
    _fire('select_item', {
      item_list_name: 'recently_viewed',
      item_id:        String(productId),
      item_name:      productName,
    });
  },

  /** Favorites list "Consultar todos" clicked */
  favoritesConsult(count) {
    _fire('favorites_consult', { count });
  },

  // ── Dev helpers (exposed via __mfEvents in browser console) ─
  getBuffer() {
    try { return JSON.parse(localStorage.getItem(BUFFER_KEY) || '[]'); } catch { return []; }
  },
  clearBuffer() {
    try { localStorage.removeItem(BUFFER_KEY); } catch {}
  },
};
