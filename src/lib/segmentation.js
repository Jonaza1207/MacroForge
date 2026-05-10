/**
 * MacroForge — Customer Segmentation Architecture
 *
 * Derives actionable customer segments from local behavioral signals.
 * Prepares structured targeting attributes for future CRM, retargeting,
 * and WhatsApp automation integration.
 *
 * Current mode: 100% client-side. No backend, no PII, no tracking pixel required.
 * Every segment is computed from localStorage signals already collected.
 *
 * ── What this enables now ──────────────────────────────────────
 *   - Segment-aware UI copy (already wired in Hero + retention.js)
 *   - Consultative WhatsApp message styling per segment
 *   - Stack Builder personalization based on prior behavior
 *   - Dev-console customer profile for sales team coaching
 *
 * ── What this unlocks in future phases ────────────────────────
 *
 * Phase 4 (Revenue Infrastructure):
 *   - Segment → Shopify customer tag (via Shopify Admin API)
 *   - Segment → Supabase user profile (on account creation)
 *
 * Phase 5 (Automated Revenue Systems):
 *   - Segment → WhatsApp message sequence (via Twilio/360dialog)
 *   - Segment → Abandoned stack recovery flow
 *   - Segment → Refill reminder campaign
 *
 * Phase 6 (Organic Growth):
 *   - Segment → Personalized SEO landing page variant
 *   - Segment → TikTok/Reels content targeting signal
 *
 * Phase 7 (International):
 *   - Segment → Country + language routing
 *   - Segment → Currency-appropriate pricing
 *
 * ── Future Supabase architecture ──────────────────────────────
 *
 *  users (
 *    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *    anonymous_id  text UNIQUE,       -- localStorage-based, no login required
 *    segment       text,              -- primary_segment value
 *    goals         text[],            -- all goals they've expressed interest in
 *    budget_tier   text,              -- 'basic' | 'mid' | 'full'
 *    experience    text,              -- 'beginner' | 'intermediate' | 'advanced'
 *    visit_count   int DEFAULT 1,
 *    first_seen    timestamptz DEFAULT now(),
 *    last_seen     timestamptz DEFAULT now(),
 *    wa_clicked    boolean DEFAULT false,
 *    stack_built   boolean DEFAULT false,
 *    country       text,              -- future: from Vercel geolocation header
 *    language      text DEFAULT 'es'
 *  )
 *  -- RLS: users can only read/write their own row
 *  -- Trigger: update last_seen + visit_count on each session
 *
 *  customer_preferences (
 *    id            uuid PRIMARY KEY,
 *    user_id       uuid REFERENCES users(id),
 *    favorite_ids  text[],
 *    viewed_ids    text[],
 *    stack_goals   text[],
 *    search_terms  text[],
 *    updated_at    timestamptz DEFAULT now()
 *  )
 *
 *  retention_events (
 *    id          uuid PRIMARY KEY,
 *    user_id     uuid REFERENCES users(id),
 *    event_type  text,   -- 'refill_hint', 'return_visit', 'stack_rebuilt'
 *    payload     jsonb,
 *    created_at  timestamptz DEFAULT now()
 *  )
 *
 * ── Security requirements for future backend ──────────────────
 *   - anonymous_id generated client-side (crypto.randomUUID())
 *   - NEVER store real names or emails without explicit consent
 *   - Supabase RLS must restrict all user rows to their own anonymous_id
 *   - Rate-limit all API endpoints to prevent scraping
 *   - All writes validated server-side (Zod schema)
 *   - GDPR/LOPDP compliance: provide data export + deletion endpoint
 */

import { analytics } from './analytics';
import { getFavoriteIds } from '../hooks/useFavorites';
import { getRecentlyViewedIds } from '../hooks/useRecentlyViewed';
import { getCustomerState } from './customerState';

// ── Segment definitions ───────────────────────────────────────
export const SEGMENT = {
  NEW_VISITOR:        'new_visitor',
  CASUAL_BROWSER:     'casual_browser',
  ENGAGED_RESEARCHER: 'engaged_researcher',
  STACK_BUILDER:      'stack_builder',
  HIGH_INTENT_BUYER:  'high_intent_buyer',
  REPEAT_CUSTOMER:    'repeat_customer',
  LOYAL_ECOSYSTEM:    'loyal_ecosystem',
};

// ── Segment metadata ──────────────────────────────────────────
export const SEGMENT_META = {
  [SEGMENT.NEW_VISITOR]: {
    label:       'Visitante nuevo',
    description: 'Primera visita. No ha interactuado con productos aún.',
    priority:    'awareness',
    waStyle:     'welcome',
    crmTag:      'new_lead',
  },
  [SEGMENT.CASUAL_BROWSER]: {
    label:       'Explorador casual',
    description: 'Navega el catálogo pero no ha señalado intención de compra.',
    priority:    'consideration',
    waStyle:     'welcome',
    crmTag:      'cold_lead',
  },
  [SEGMENT.ENGAGED_RESEARCHER]: {
    label:       'Investigador activo',
    description: 'Múltiples visitas, productos vistos, posiblemente favoritos.',
    priority:    'nurture',
    waStyle:     'beginnerConsult',
    crmTag:      'warm_lead',
  },
  [SEGMENT.STACK_BUILDER]: {
    label:       'Constructor de stacks',
    description: 'Usó el AI Stack Builder — alto interés en compra completa.',
    priority:    'conversion',
    waStyle:     'stackConsult',
    crmTag:      'hot_lead_stack',
  },
  [SEGMENT.HIGH_INTENT_BUYER]: {
    label:       'Comprador de alta intención',
    description: 'Hizo clic en WhatsApp desde producto o stack.',
    priority:    'closing',
    waStyle:     'product',
    crmTag:      'hot_lead_wa',
  },
  [SEGMENT.REPEAT_CUSTOMER]: {
    label:       'Cliente recurrente',
    description: '3+ visitas, historial de productos vistos y favoritos.',
    priority:    'retention',
    waStyle:     'reorder',
    crmTag:      'repeat_buyer',
  },
  [SEGMENT.LOYAL_ECOSYSTEM]: {
    label:       'Ecosistema leal',
    description: '8+ visitas, alta interacción, múltiples compras intención.',
    priority:    'loyalty',
    waStyle:     'sameAgain',
    crmTag:      'vip_customer',
  },
};

// ── Event helpers ─────────────────────────────────────────────
function getEvents()          { return analytics.getBuffer(); }
function countEvents(name)    { return getEvents().filter(e => e.n === name).length; }
function hasEvent(name)       { return getEvents().some(e => e.n === name); }
function hasWAIntent()        { return hasEvent('whatsapp_click'); }
function hasStackBuilt()      { return getEvents().some(e => e.n === 'stack_step' && e.p?.action === 'wa_clicked'); }
function hasUsedStackBuilder() { return getEvents().some(e => e.n === 'stack_cta_click' && e.p?.goal === 'ai_builder_open'); }

// ── Primary segment derivation ────────────────────────────────

/**
 * Derive the customer's primary behavioral segment.
 * Uses a priority waterfall: highest-engagement signals win.
 */
export function getPrimarySegment() {
  const state        = getCustomerState();
  const visitCount   = state.visitCount;
  const hasFavs      = state.hasFavorites;
  const hasWA        = hasWAIntent();
  const hasStack     = hasStackBuilt();
  const usedBuilder  = hasUsedStackBuilder();
  const hasRecent    = state.hasRecentlyViewed;

  if (visitCount >= 8 && (hasWA || hasStack)) return SEGMENT.LOYAL_ECOSYSTEM;
  if (hasWA || hasStack)                       return SEGMENT.HIGH_INTENT_BUYER;
  if (usedBuilder)                             return SEGMENT.STACK_BUILDER;
  if (visitCount >= 3 && (hasFavs || hasRecent)) return SEGMENT.REPEAT_CUSTOMER;
  if (visitCount >= 2 && (hasFavs || hasRecent)) return SEGMENT.ENGAGED_RESEARCHER;
  if (visitCount >= 2)                         return SEGMENT.CASUAL_BROWSER;
  return SEGMENT.NEW_VISITOR;
}

// ── Targeting attributes ──────────────────────────────────────

/**
 * Goal signals derived from Stack Builder and GoalNav usage.
 * Used for audience targeting in Meta / Google Ads.
 */
function getGoalSignals() {
  const goals = new Set();
  // From GoalNav clicks
  for (const e of getEvents().filter(e => e.n === 'goal_nav_click')) {
    if (e.p?.goal) goals.add(e.p.goal);
  }
  // From Stack Builder selections
  for (const e of getEvents().filter(e => e.n === 'stack_step' && e.p?.step === 'goal')) {
    if (e.p?.value) goals.add(e.p.value);
  }
  return [...goals];
}

/**
 * Category affinity — which categories the customer has browsed most.
 * Used for product retargeting and content personalization.
 */
function getCategoryAffinity() {
  const cats = {};
  for (const e of getEvents().filter(e => e.n === 'view_item_list')) {
    const cat = e.p?.item_list_name;
    if (cat) cats[cat] = (cats[cat] || 0) + 1;
  }
  return Object.entries(cats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, views]) => ({ category, views }));
}

/**
 * Preferred budget tier from Stack Builder (if used).
 */
function getPreferredBudget() {
  const events = getEvents().filter(
    e => e.n === 'stack_step' && e.p?.step === 'budget' && e.p?.action === 'step_complete'
  );
  if (events.length === 0) return null;
  const last = events[events.length - 1];
  return last?.p?.value || null;
}

/**
 * Experience level from Stack Builder (if used).
 */
function getExperienceLevel() {
  const events = getEvents().filter(
    e => e.n === 'stack_step' && e.p?.step === 'experience' && e.p?.action === 'step_complete'
  );
  if (events.length === 0) return null;
  const last = events[events.length - 1];
  return last?.p?.value || null;
}

// ── Lead score ────────────────────────────────────────────────

/**
 * Numeric lead quality score (0–100).
 * Used to prioritize WhatsApp follow-up sequences.
 *
 * Future: this score feeds directly into the WhatsApp lead routing system.
 * High-score leads get immediate attention. Low-score leads get nurtured.
 */
export function getLeadScore() {
  const state       = getCustomerState();
  const visitScore  = Math.min(state.visitCount * 3, 15);
  const favScore    = Math.min(state.hasFavoriteIds.length * 4, 20);
  const waScore     = hasWAIntent()    ? 30 : 0;
  const stackScore  = hasStackBuilt()  ? 20 : 0;
  const builderScore = hasUsedStackBuilder() ? 10 : 0;
  const refillScore = state.isRefillReady ? 10 : 0;

  return Math.min(visitScore + favScore + waScore + stackScore + builderScore + refillScore, 100);
}

/**
 * Lead quality tier based on score.
 */
export function getLeadTier() {
  const score = getLeadScore();
  if (score >= 70) return { tier: 'hot',    label: 'Lead caliente',    priority: 'immediate' };
  if (score >= 40) return { tier: 'warm',   label: 'Lead tibio',       priority: 'same-day'  };
  if (score >= 15) return { tier: 'cool',   label: 'Lead frío',        priority: 'nurture'   };
  return               { tier: 'cold',   label: 'Visitante nuevo',  priority: 'awareness' };
}

// ── CRM-ready profile ─────────────────────────────────────────

/**
 * Full anonymized customer profile — ready for future CRM/Supabase sync.
 *
 * This object maps 1:1 to the future `users` + `customer_preferences`
 * Supabase tables. When the backend goes live, this is the payload for:
 *   POST /api/customer/profile  (upsert on every significant event)
 *
 * PRIVACY: No PII. No name. No email. No phone.
 * The anonymous_id is device-specific and cannot identify an individual.
 */
export function getCrmProfile() {
  const state    = getCustomerState();
  const segment  = getPrimarySegment();
  const meta     = SEGMENT_META[segment];
  const leadTier = getLeadTier();

  return {
    // Identity (anonymous)
    anonymous_id:       getAnonymousId(),
    segment:            segment,
    segment_label:      meta.label,
    crm_tag:            meta.crmTag,

    // Lead quality
    lead_score:         getLeadScore(),
    lead_tier:          leadTier.tier,
    lead_priority:      leadTier.priority,

    // Behavioral profile
    visit_count:        state.visitCount,
    is_returning:       state.isReturning,
    has_wa_intent:      state.hasWAIntent,
    has_stack_built:    hasStackBuilt(),
    used_ai_builder:    hasUsedStackBuilder(),
    is_refill_ready:    state.isRefillReady,

    // Preferences
    goals:              getGoalSignals(),
    category_affinity:  getCategoryAffinity(),
    budget_tier:        getPreferredBudget(),
    experience_level:   getExperienceLevel(),
    favorite_ids:       state.hasFavoriteIds,
    recently_viewed:    getRecentlyViewedIds(6),

    // WhatsApp strategy
    wa_style:           meta.waStyle,
    consultation_style: state.consultationStyle,

    // Automation hooks (future)
    triggers: {
      send_abandoned_stack:    hasUsedStackBuilder() && !hasStackBuilt(),
      send_refill_reminder:    state.isRefillReady,
      send_reorder_prompt:     state.hasWAIntent && state.visitCount >= 3,
      send_stack_suggestion:   getGoalSignals().length > 0 && !hasStackBuilt(),
      eligible_for_upsell:     hasStackBuilt() && leadTier.tier !== 'cold',
    },
  };
}

/**
 * Returns or generates a persistent anonymous session ID.
 * No PII — purely device-level identification.
 * Future: this becomes the Supabase `anonymous_id` foreign key.
 */
export function getAnonymousId() {
  const KEY = 'mf_anon_id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = `mf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch { return 'unknown'; }
}

// ── Segment-aware copy ────────────────────────────────────────

/**
 * Get segment-appropriate UI copy for CTAs and messaging.
 * Powers future personalized homepage and email content.
 */
export function getSegmentCopy(segment) {
  const copies = {
    [SEGMENT.NEW_VISITOR]:        { hero: 'Suplementos originales en Costa Rica.', cta: 'Ver catálogo' },
    [SEGMENT.CASUAL_BROWSER]:     { hero: 'Encontrá lo que buscás.', cta: 'Explorar productos' },
    [SEGMENT.ENGAGED_RESEARCHER]: { hero: 'Tu historial te espera.', cta: 'Continuá explorando' },
    [SEGMENT.STACK_BUILDER]:      { hero: 'Tu stack está listo para consultar.', cta: 'Consultar por WhatsApp' },
    [SEGMENT.HIGH_INTENT_BUYER]:  { hero: 'Bienvenido de vuelta.', cta: 'Ver mis favoritos' },
    [SEGMENT.REPEAT_CUSTOMER]:    { hero: 'Seguís en el lugar correcto.', cta: 'Reordenar o explorar' },
    [SEGMENT.LOYAL_ECOSYSTEM]:    { hero: 'Tu espacio. Tus suplementos.', cta: 'Ver novedades' },
  };
  return copies[segment] || copies[SEGMENT.NEW_VISITOR];
}

// ── Report ────────────────────────────────────────────────────

export function logSegmentReport() {
  const profile = getCrmProfile();
  const h = label => console.log(`%c── ${label}`, 'color:#00C896;font-weight:700;font-size:12px');

  console.groupCollapsed('%c[MacroForge Customer Segment]', 'color:#00C896;font-weight:800;font-size:14px');

  console.log(`%cSegment: ${profile.segment_label}`, 'font-size:13px;font-weight:700;color:#F2F0E8');
  console.log(`%cLead score: ${profile.lead_score}/100 (${profile.lead_tier})`, 'font-size:12px;color:#888');

  h('Profile');              console.table({ ...profile, goals: profile.goals.join(', '), favorite_ids: profile.favorite_ids.join(', '), recently_viewed: profile.recently_viewed.join(', ') });
  h('Category Affinity');   console.table(profile.category_affinity);
  h('Automation Triggers'); console.table(profile.triggers);

  console.groupEnd();
  return profile;
}

// Re-export helpers used by other modules
export { getRecentlyViewedIds } from '../hooks/useRecentlyViewed';
