/**
 * MacroForge — Centralized Analytics Layer
 *
 * ALL event tracking routes through this module.
 * Writes to a localStorage event buffer AND forwards to
 * GA4 + Meta Pixel when IDs are configured.
 *
 * ── Activation ───────────────────────────────────────────────────
 * Add to .env (local) or GitHub Secrets (production):
 *   VITE_GA4_ID=G-XXXXXXXXXX
 *   VITE_PIXEL_ID=1234567890123456
 *
 * Tracking scripts are loaded DYNAMICALLY by src/lib/tracking.js.
 * No changes to index.html required.
 * Scripts load async — zero impact on First Contentful Paint.
 * Events fire before scripts load are queued and replayed automatically.
 *
 * ── Dev console ──────────────────────────────────────────────────
 *   window.__mfEvents()        → last 30 buffered events
 *   window.__mfEvents.all()    → full buffer
 *   window.__mfEvents.clear()  → clear buffer
 *   window.__mfStack.report()  → AI Stack Builder funnel
 *   window.__mfSegment.report()→ customer segment + lead score
 */

import { initTracking, TRACKING_STATUS } from './tracking';

// ── Initialize tracking scripts on module load ────────────────────
// Runs once when analytics.js is first imported by the app.
// Graceful no-op if VITE_GA4_ID / VITE_PIXEL_ID are not set.
initTracking();

// ── IDs (used by _ga4 / _pixel checks) ───────────────────────────
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
    // window.gtag is defined synchronously by tracking.js before this runs
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  } catch {}
}

// ── Meta Pixel event map ──────────────────────────────────────────
// Maps internal event names → standard Meta Pixel event names.
// Standard events unlock Meta's optimization algorithms:
//   conversion modeling, purchase intent, lookalike audience creation.
//
// Retargeting audience map:
//   ViewContent      → product page viewers (product_view)
//   InitiateCheckout → stack WA senders (whatsapp_click, stack_cta_click)
//   AddToCart        → manual stack builders who add products
//   AddToWishlist    → users who favorite products
//   Lead             → goal/funnel entry events (goal_nav_click, gateway_select)
//   Search           → search activity
//   Contact          → WhatsApp float button
//
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
  gateway_select:  { event: 'Lead',              standard: true  }, // entering purchase funnel
};

// ── Meta Pixel firing (standard map + param-conditional retargeting) ──
function _pixel(name, params) {
  if (!PIXEL_ID) return;
  try {
    if (typeof window.fbq !== 'function') return;

    // ── Standard event map ─────────────────────────────────────
    const mapping = FB_MAP[name];
    if (mapping) {
      window.fbq(mapping.standard ? 'track' : 'trackCustom', mapping.event, params);
    }

    // ── Param-conditional retargeting signals ──────────────────
    // These fire IN ADDITION to the standard map (not instead of).
    // Each creates a distinct Meta custom audience for precise retargeting.

    // Audience: "Chose manual stack path" (advanced / high-intent buyer)
    // Audience: "Chose guided stack path" (undecided / beginner)
    if (name === 'gateway_select') {
      window.fbq('trackCustom', 'StackPathSelected', { path: params.choice });
    }

    // Audience: "Specific fitness goal expressed" (muscle, cut, performance…)
    // Audience: "Premium budget selected" (highest AOV signal)
    // Audience: "Abandoned stack" (retarget with urgency)
    // Audience: "Completed guided stack → WA" (hottest lead)
    if (name === 'stack_step') {
      if (params.action === 'step_complete' && params.step === 'goal') {
        window.fbq('trackCustom', 'GoalSelected', { goal: params.value });
      }
      if (params.action === 'step_complete' && params.step === 'budget' && params.value === 'full') {
        window.fbq('trackCustom', 'PremiumBudgetSelected', {});
      }
      if (params.action === 'abandoned') {
        window.fbq('trackCustom', 'StackAbandoned', { step_reached: params.step_reached });
      }
      if (params.action === 'wa_clicked') {
        window.fbq('track', 'InitiateCheckout', {
          content_name: `Guided stack: ${params.goal || 'custom'}`,
          num_items:    params.stack_size || 1,
          currency:     'CRC',
        });
      }
    }

    // Audience: "Manual stack builder" (product-specific, high AOV)
    // AddToCart → standard audience creation in Meta
    // InitiateCheckout on send → highest-intent conversion signal
    if (name === 'manual_stack') {
      if (params.action === 'product_added') {
        window.fbq('track', 'AddToCart', {
          content_name:     params.item_name     || '',
          content_category: params.item_category || '',
          currency:         'CRC',
        });
      }
      if (params.action === 'wa_clicked') {
        window.fbq('track', 'InitiateCheckout', {
          num_items: params.stack_size    || 1,
          value:     params.estimated_total || 0,
          currency:  'CRC',
        });
      }
      if (params.action === 'abandoned') {
        window.fbq('trackCustom', 'ManualStackAbandoned', {
          stack_size: params.stack_size || 0,
        });
      }
    }

    // Audience: "doTERRA interested" — separate retargeting segment
    if (name === 'view_item_list' && params?.item_list_id === 'dote') {
      window.fbq('trackCustom', 'DoTerraInterested', { section: 'dote' });
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

  /** SPA page view — call on mount and on significant route changes */
  pageView(path, title) {
    _ga4('page_view', { page_path: path || window.location.pathname, page_title: title || document.title });
    try { if (PIXEL_ID && typeof window.fbq === 'function') window.fbq('track', 'PageView'); } catch {}
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
      item_id:             String(productId),
      category,
      days_since_purchase: daysSince,
    });
  },

  /**
   * Stack Commerce Gateway path selected.
   * Fires: Lead (standard Meta) + StackPathSelected (custom audience)
   * GA4 audience: filter gateway_select where params.choice = 'manual' | 'guided'
   */
  gatewaySelect(choice) {
    _fire('gateway_select', { choice });
  },

  /**
   * Manual Stack Builder interaction.
   * product_added  → AddToCart (Meta standard)
   * wa_clicked     → InitiateCheckout (Meta standard) — highest conversion signal
   * abandoned      → ManualStackAbandoned (Meta custom)
   * product_removed → buffered only
   */
  manualStack(action, params = {}) {
    _fire('manual_stack', { action, ...params });
  },

  /**
   * AI Stack Builder guided flow step event.
   * step_complete + goal     → GoalSelected (Meta custom audience)
   * step_complete + budget full → PremiumBudgetSelected (Meta custom audience)
   * abandoned                → StackAbandoned (Meta custom audience)
   * wa_clicked               → InitiateCheckout (Meta standard)
   */
  stackStep(action, params = {}) {
    _fire('stack_step', { action, ...params });
  },

  // ── Dev helpers ──────────────────────────────────────────────────
  getBuffer() {
    try { return JSON.parse(localStorage.getItem(BUFFER_KEY) || '[]'); } catch { return []; }
  },
  clearBuffer() {
    try { localStorage.removeItem(BUFFER_KEY); } catch {}
  },

  /** Expose tracking status in dev console */
  trackingStatus: TRACKING_STATUS,
};
