/**
 * MacroForge — Behavioral Intelligence Layer
 *
 * Synthesizes the raw event buffer + click data into actionable signals:
 *   - What products create desire (views without purchase intent)
 *   - What products create purchase intent (WA clicks)
 *   - What categories get browsed vs. purchased
 *   - What searches fail (zero-result queries)
 *   - What products get shared (desire without friction)
 *   - What products get saved but not bought (saved = desire, no WA = barrier)
 *   - What stacks generate curiosity
 *   - Return visitor behavior
 *
 * All data is local (localStorage). No backend required.
 * Accessible in the browser console via window.__mfIntel
 *
 * Usage:
 *   import { getIntelReport } from '../lib/intelligence';
 *   const report = getIntelReport();
 *
 * Console shortcuts (dev only):
 *   __mfIntel.report()         → full formatted report
 *   __mfIntel.desires()        → products viewed most without WA click
 *   __mfIntel.barriers()       → products saved but never purchased
 *   __mfIntel.searchFailures() → searches with 0 results
 *   __mfIntel.categoryHeat()   → category view counts
 */

import { analytics } from './analytics';
import { getTopClicked } from '../hooks/useClickTracking';
import { getFavoriteIds } from '../hooks/useFavorites';

// ── Helpers ───────────────────────────────────────────────────────

function getEvents() {
  return analytics.getBuffer();
}

function eventsByName(name) {
  return getEvents().filter(e => e.n === name);
}

// ── Core intelligence functions ───────────────────────────────────

/**
 * Products viewed (modal opened) ranked by view frequency.
 * High views = desire. Cross-reference with WA clicks for intent gap.
 */
export function getProductDesires(limit = 15) {
  const views = {};
  for (const e of eventsByName('product_view')) {
    const id = e.p?.item_id;
    if (!id) continue;
    if (!views[id]) views[id] = { id, name: e.p.item_name, brand: e.p.item_brand, category: e.p.item_category, views: 0 };
    views[id].views++;
  }
  return Object.values(views)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

/**
 * Products clicked to WhatsApp (purchase intent) ranked by click frequency.
 */
export function getPurchaseIntent(limit = 15) {
  const intents = {};
  for (const e of eventsByName('whatsapp_click')) {
    const id = e.p?.item_id || e.p?.item_name;
    if (!id) continue;
    if (!intents[id]) intents[id] = { id, name: e.p.item_name, clicks: 0 };
    intents[id].clicks++;
  }
  return Object.values(intents)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

/**
 * Products that get many views but few/no WA clicks.
 * Signal: desire exists but something creates friction (price, info, trust).
 */
export function getDesireBarriers(limit = 10) {
  const topClicked = getTopClicked(100);
  const desires    = getProductDesires(50);

  const intentMap = {};
  for (const e of eventsByName('whatsapp_click')) {
    const id = e.p?.item_id;
    if (id) intentMap[id] = (intentMap[id] || 0) + 1;
  }

  return desires
    .filter(d => (intentMap[d.id] || 0) === 0 && d.views >= 2)
    .slice(0, limit);
}

/**
 * Products saved as favorites but never clicked to WhatsApp.
 * Signal: highest-intent products with unresolved purchase barriers.
 */
export function getSavedWithoutPurchase() {
  const favIds    = getFavoriteIds();
  const intentIds = new Set(
    eventsByName('whatsapp_click').map(e => e.p?.item_id).filter(Boolean)
  );
  return favIds.filter(id => !intentIds.has(id));
}

/**
 * Category view heatmap — which categories get browsed most.
 */
export function getCategoryHeat(limit = 15) {
  const heat = {};
  for (const e of eventsByName('view_item_list')) {
    const cat = e.p?.item_list_name;
    if (!cat) continue;
    heat[cat] = (heat[cat] || 0) + 1;
  }
  return Object.entries(heat)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([category, views]) => ({ category, views }));
}

/**
 * Goal navigation heatmap — what outcomes customers are looking for.
 */
export function getGoalHeat(limit = 10) {
  const heat = {};
  for (const e of eventsByName('goal_nav_click')) {
    const g = e.p?.label || e.p?.goal;
    if (!g) continue;
    heat[g] = (heat[g] || 0) + 1;
  }
  return Object.entries(heat)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([goal, clicks]) => ({ goal, clicks }));
}

/**
 * Failed searches — queries with 0 results.
 * Signal: demand that the catalog doesn't fulfill (inventory gap or SEO gap).
 */
export function getSearchFailures(limit = 20) {
  const failures = {};
  for (const e of eventsByName('search')) {
    if ((e.p?.results ?? 1) === 0) {
      const q = e.p?.search_term?.toLowerCase().trim();
      if (q) failures[q] = (failures[q] || 0) + 1;
    }
  }
  return Object.entries(failures)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([query, count]) => ({ query, count }));
}

/**
 * Search volume — what customers are actively searching for.
 */
export function getSearchVolume(limit = 20) {
  const volume = {};
  for (const e of eventsByName('search')) {
    const q = e.p?.search_term?.toLowerCase().trim();
    if (q) {
      if (!volume[q]) volume[q] = { query: q, count: 0, zeros: 0 };
      volume[q].count++;
      if ((e.p?.results ?? 1) === 0) volume[q].zeros++;
    }
  }
  return Object.values(volume)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Shared products — what gets shared (organic reach signal).
 */
export function getSharedProducts(limit = 10) {
  const shared = {};
  for (const e of eventsByName('share')) {
    const id = e.p?.item_id;
    if (!id) continue;
    if (!shared[id]) shared[id] = { id, name: e.p.item_name, shares: 0 };
    shared[id].shares++;
  }
  return Object.values(shared)
    .sort((a, b) => b.shares - a.shares)
    .slice(0, limit);
}

/**
 * Stack curiosity — which stack goals drive the most CTA clicks.
 */
export function getStackCuriosity(limit = 8) {
  const stacks = {};
  for (const e of eventsByName('stack_cta_click')) {
    const g = e.p?.label || e.p?.goal;
    if (!g) continue;
    stacks[g] = (stacks[g] || 0) + 1;
  }
  return Object.entries(stacks)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([goal, clicks]) => ({ goal, clicks }));
}

// ── SELLER INTELLIGENCE ─────────────────────────────────────────

/**
 * AOV opportunity signals — users who have browsed multiple categories.
 * These sessions have cross-sell and stack potential.
 * Signal: high category breadth = interested in a system, not just one product.
 */
export function getAovOpportunities() {
  const events   = getEvents();
  const catEvents = events.filter(e => e.n === 'view_item_list');
  const cats     = new Set(catEvents.map(e => e.p?.item_list_name).filter(Boolean));

  return {
    uniqueCategoriesBrowsed: cats.size,
    categories:              [...cats],
    stackPotential:          cats.size >= 3 ? 'high' : cats.size >= 2 ? 'medium' : 'low',
  };
}

/**
 * Refill readiness signals — products likely due for repurchase.
 * Based on purchase intent timestamps and standard supplement cycles.
 */
export function getRefillSignals() {
  try {
    const log   = JSON.parse(localStorage.getItem('mf_refill_log') || '{}');
    const now   = Date.now();
    const ready = [];
    const CYCLES = {
      'Creatinas': 30, 'Proteínas Whey': 30, 'Proteínas Isoladas': 30,
      'Pre-Entrenamientos': 45, 'BCAA': 30, 'Glutamina': 30,
      'Gainers de Masa': 21, 'Electrolitos': 30, 'Aminoácidos Esenciales': 30,
      'Magnesio': 60, 'Vitaminas Esenciales': 30, 'Multivitamínicos': 30,
      'Omega y Grasas Saludables': 30, 'Sueño y Relajación': 45,
      'Probióticos': 30, 'Colágeno y Belleza': 30, 'Salud Mental y Cognitiva': 30,
    };
    for (const [productId, entry] of Object.entries(log)) {
      const cycle   = CYCLES[entry.category];
      if (!cycle) continue;
      const elapsed = Math.floor((now - entry.ts) / 86400000);
      const pct     = elapsed / cycle;
      if (pct >= 0.75) {
        ready.push({
          productId,
          category: entry.category,
          daysSincePurchase: elapsed,
          refillCycleDays: cycle,
          urgency: pct >= 1 ? 'overdue' : 'approaching',
          daysUntilDue: Math.max(0, cycle - elapsed),
        });
      }
    }
    return ready.sort((a, b) => b.daysSincePurchase - a.daysSincePurchase);
  } catch { return []; }
}

/**
 * Inventory gap signals — what customers search for that returns no results.
 * These are demand signals for products MacroForge doesn't carry yet.
 * Ranked by search frequency.
 */
export function getInventoryGaps(minSearches = 1) {
  return getSearchFailures(30)
    .filter(s => s.count >= minSearches)
    .map(s => ({
      ...s,
      signal: s.count >= 5 ? 'strong demand'
             : s.count >= 3 ? 'moderate demand'
             : 'early signal',
    }));
}

/**
 * Session depth signal — how deeply a visitor is exploring.
 * Useful to understand if this is a casual visit or a serious buying session.
 */
export function getSessionDepth() {
  const events = getEvents();
  const now    = Date.now();
  const sessionWindow = 30 * 60 * 1000; // 30 min
  const recent = events.filter(e => now - e.t < sessionWindow);

  const productViews = recent.filter(e => e.n === 'product_view').length;
  const waClicks     = recent.filter(e => e.n === 'whatsapp_click').length;
  const searches     = recent.filter(e => e.n === 'search').length;
  const favorites    = recent.filter(e => e.n === 'favorite').length;

  return {
    productViews,
    waClicks,
    searches,
    favorites,
    engagementScore: productViews * 2 + waClicks * 5 + searches * 1 + favorites * 3,
    buyingStage: waClicks > 0       ? 'purchase-ready'
               : productViews >= 4  ? 'deep-consideration'
               : productViews >= 2  ? 'comparison'
               : productViews >= 1  ? 'early-exploration'
               : 'browsing',
  };
}

/**
 * Loyalty signals — patterns that indicate a customer is becoming loyal.
 */
export function getLoyaltySignals() {
  const visitCount = parseInt(localStorage.getItem('mf_visit_count') || '1', 10);
  const favs       = getFavoriteIds().length;
  const refills    = getRefillSignals().length;
  const waClicks   = eventsByName('whatsapp_click').length;

  const score =
    Math.min(visitCount * 2, 20) +
    Math.min(favs * 3, 15) +
    Math.min(refills * 5, 20) +
    Math.min(waClicks * 4, 20);

  return {
    visitCount,
    favoritesCount: favs,
    refillSignals:  refills,
    waInteractions: waClicks,
    loyaltyScore:   score,
    tier: score >= 60 ? 'ecosystem-loyal'
        : score >= 35 ? 'regular-buyer'
        : score >= 15 ? 'engaged'
        : 'new',
  };
}

/**
 * AI Stack Builder funnel metrics — integrated into the main intelligence layer.
 * Detailed analysis lives in src/lib/stackIntelligence.js.
 * This provides a summary for the unified report.
 */
export function getStackBuilderSummary() {
  const stackSteps = eventsByName('stack_step');
  const opens      = getEvents().filter(e => e.n === 'stack_cta_click' && e.p?.goal === 'ai_builder_open').length;
  const completions = stackSteps.filter(e => e.p?.action === 'wa_clicked').length;
  const abandonments = stackSteps.filter(e => e.p?.action === 'abandoned').length;
  const waFromBuilder = eventsByName('whatsapp_click').filter(e => e.p?.source === 'ai_stack_builder').length;

  const goalCounts = {};
  for (const e of stackSteps.filter(e => e.p?.step === 'goal' && e.p?.action === 'step_complete')) {
    const g = e.p?.value;
    if (g) goalCounts[g] = (goalCounts[g] || 0) + 1;
  }

  return {
    opens,
    completions,
    abandonments,
    waFromBuilder,
    conversionRate:   opens > 0 ? Math.round((waFromBuilder / opens) * 100) : 0,
    topGoal:          Object.entries(goalCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null,
    goalBreakdown:    goalCounts,
  };
}

/**
 * Full intelligence report — a single object with all signals.
 * Use in the browser console: window.__mfIntel.report()
 */
export function getIntelReport() {
  return {
    // Behavioral desire / intent
    productDesires:       getProductDesires(),
    purchaseIntent:       getPurchaseIntent(),
    desireBarriers:       getDesireBarriers(),
    savedWithoutPurchase: getSavedWithoutPurchase(),
    // Discovery patterns
    categoryHeat:         getCategoryHeat(),
    goalHeat:             getGoalHeat(),
    searchFailures:       getSearchFailures(),
    searchVolume:         getSearchVolume(),
    // Viral / sharing
    sharedProducts:       getSharedProducts(),
    stackCuriosity:       getStackCuriosity(),
    // Seller intelligence
    aovOpportunities:     getAovOpportunities(),
    refillSignals:        getRefillSignals(),
    inventoryGaps:        getInventoryGaps(),
    sessionDepth:         getSessionDepth(),
    loyaltySignals:       getLoyaltySignals(),
    // Phase 3 — AI Stack Builder intelligence
    stackBuilderSummary:  getStackBuilderSummary(),
    // Meta
    eventCount:           getEvents().length,
  };
}

/**
 * Pretty-print the intelligence report to the browser console.
 * Only meaningful after the user has browsed for a while.
 */
export function logIntelReport() {
  const r = getIntelReport();
  const h = (label) => console.log(`%c── ${label}`, 'color:#E3001E;font-weight:700;font-size:13px');

  console.groupCollapsed('%c[MacroForge Intelligence Report]', 'color:#E3001E;font-weight:800;font-size:14px');

  h('🎯 Product Desires (most viewed)');    console.table(r.productDesires);
  h('💬 Purchase Intent (WA clicks)');      console.table(r.purchaseIntent);
  h('🔒 Desire Barriers (viewed, no WA)');  console.table(r.desireBarriers);
  h('❤️  Saved Without Purchase');          console.log(r.savedWithoutPurchase);
  h('🔥 Category Heat');                    console.table(r.categoryHeat);
  h('🎯 Goal Heat');                        console.table(r.goalHeat);
  h('❌ Search Failures (0 results)');      console.table(r.searchFailures);
  h('🔍 Search Volume');                    console.table(r.searchVolume);
  h('📤 Shared Products');                  console.table(r.sharedProducts);
  h('💪 Stack Curiosity');                  console.table(r.stackCuriosity);

  console.log('%c── SELLER INTELLIGENCE', 'color:#00C896;font-weight:700;font-size:13px');
  h('📦 AOV Opportunities');               console.log(r.aovOpportunities);
  h('🔄 Refill Signals');                  console.table(r.refillSignals);
  h('🕳️  Inventory Gaps (missing demand)'); console.table(r.inventoryGaps);
  h('📊 Session Depth');                   console.log(r.sessionDepth);
  h('🏆 Loyalty Signals');                 console.log(r.loyaltySignals);

  console.log('%c── AI STACK BUILDER (Phase 3)', 'color:#D4A843;font-weight:700;font-size:13px');
  h('⚡ Stack Builder Summary');           console.log(r.stackBuilderSummary);

  console.log(`Total buffered events: ${r.eventCount}`);
  console.groupEnd();

  return r;
}
