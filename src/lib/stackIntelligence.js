/**
 * MacroForge — Stack Builder Intelligence Layer
 *
 * Dedicated analytics module for the AI Stack Builder (Phase 2/3).
 * Reads from the local event buffer to produce actionable insights:
 *
 *   - Funnel dropout: which step loses the most users?
 *   - Goal distribution: which fitness goals dominate?
 *   - Budget distribution: which investment tier is preferred?
 *   - Experience distribution: what level are customers?
 *   - Conversion rate: % of stack generates → WhatsApp clicks
 *   - Abandonment patterns: goal + step where users leave
 *   - Most popular stacks: which goal/experience/budget combos win?
 *
 * All data is local (localStorage). Zero backend, zero API, zero cost.
 *
 * ── Future evolution (Phase 5 — Automated Revenue Systems) ─────
 *
 * When Supabase is activated:
 *
 * 1. Replace event buffer reads with Supabase RPC calls:
 *    const { data } = await supabase.rpc('get_stack_funnel', { days: 30 })
 *
 * 2. Future Supabase tables this module will query:
 *
 *    ai_stack_requests (
 *      id          uuid PRIMARY KEY,
 *      session_id  text,
 *      goal        text,
 *      experience  text,
 *      budget      text,
 *      frequency   text,
 *      completed   boolean DEFAULT false,
 *      created_at  timestamptz DEFAULT now()
 *    )
 *
 *    generated_stacks (
 *      id          uuid PRIMARY KEY,
 *      request_id  uuid REFERENCES ai_stack_requests(id),
 *      slugs       text[],
 *      reasoning   text,
 *      created_at  timestamptz DEFAULT now()
 *    )
 *
 *    whatsapp_leads (
 *      id              uuid PRIMARY KEY,
 *      stack_id        uuid REFERENCES generated_stacks(id),
 *      source          text,   -- 'ai_stack_builder' | 'product_modal' | 'card'
 *      lead_score      int,    -- derived from goal + budget + experience
 *      sent_at         timestamptz DEFAULT now()
 *    )
 *
 *    abandoned_stacks (
 *      id            uuid PRIMARY KEY,
 *      request_id    uuid REFERENCES ai_stack_requests(id),
 *      step_reached  text,   -- 'goal' | 'experience' | 'budget' | 'frequency'
 *      step_index    int,
 *      goal          text,   -- null if abandoned on first step
 *      created_at    timestamptz DEFAULT now()
 *    )
 *
 * 3. With real data, enable:
 *    - Goal-specific retargeting audiences in Meta / Google
 *    - Abandoned stack WhatsApp follow-up sequences
 *    - Budget-tier pricing experiments
 *    - Personalized homepage content based on popular stacks
 *
 * ── Security note ───────────────────────────────────────────────
 * This module is read-only. No PII is collected.
 * Session IDs are anonymous random strings (no user identification).
 * All data stays in localStorage. Supabase integration will use
 * Row Level Security (RLS) to prevent unauthorized data access.
 */

import { analytics } from './analytics';

// ── Internal helpers ──────────────────────────────────────────
function getAllEvents() {
  return analytics.getBuffer();
}

function stackStepEvents() {
  return getAllEvents().filter(e => e.n === 'stack_step');
}

function stackWAEvents() {
  return getAllEvents().filter(
    e => e.n === 'whatsapp_click' && e.p?.source === 'ai_stack_builder'
  );
}

function stackGenerateEvents() {
  return stackStepEvents().filter(e => e.p?.action === 'wa_clicked');
}

function stackOpenEvents() {
  return getAllEvents().filter(
    e => e.n === 'stack_cta_click' && e.p?.goal === 'ai_builder_open'
  );
}

// ── Distribution helpers ──────────────────────────────────────
function distribution(events, key) {
  const counts = {};
  for (const e of events) {
    const val = e.p?.[key];
    if (val) counts[val] = (counts[val] || 0) + 1;
  }
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count]) => ({
      label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

// ── Public API ────────────────────────────────────────────────

/**
 * How many times the AI Stack Builder has been opened.
 */
export function getBuilderOpenCount() {
  return stackOpenEvents().length;
}

/**
 * How many stacks were fully generated (reached results screen).
 */
export function getStacksGenerated() {
  return getAllEvents().filter(
    e => e.n === 'stack_cta_click' && e.p?.label === 'AI Stack Builder'
  ).length;
}

/**
 * Goal distribution — which fitness goals customers select most.
 * Signal: inventory priority + content creation priority + retargeting segments.
 */
export function getGoalDistribution() {
  const completions = stackStepEvents().filter(
    e => e.p?.action === 'step_complete' && e.p?.step === 'goal'
  );
  return distribution(completions, 'value');
}

/**
 * Experience distribution — skill level of customers using the builder.
 * Signal: which product labels to surface, which content to prioritize.
 */
export function getExperienceDistribution() {
  const completions = stackStepEvents().filter(
    e => e.p?.action === 'step_complete' && e.p?.step === 'experience'
  );
  return distribution(completions, 'value');
}

/**
 * Budget distribution — which investment tier is preferred.
 * Signal: average order value optimization, bundle pricing strategy.
 */
export function getBudgetDistribution() {
  const completions = stackStepEvents().filter(
    e => e.p?.action === 'step_complete' && e.p?.step === 'budget'
  );
  return distribution(completions, 'value');
}

/**
 * Funnel dropout — which step loses the most users.
 * Calculated as: opened → goal → experience → budget → frequency → results
 * Signal: which step needs UX improvement or trust reinforcement.
 */
export function getFunnelDropout() {
  const steps = ['goal', 'experience', 'budget', 'frequency'];
  const opens  = stackOpenEvents().length;

  const completions = {};
  for (const step of steps) {
    completions[step] = stackStepEvents().filter(
      e => e.p?.action === 'step_complete' && e.p?.step === step
    ).length;
  }

  const waClicks = stackWAEvents().length;

  // Dropout = entered step - completed step
  const stages = [
    { stage: 'Abrieron el builder',    entered: opens,                  completed: completions.goal        || 0 },
    { stage: 'Seleccionaron objetivo',  entered: completions.goal        || 0, completed: completions.experience  || 0 },
    { stage: 'Seleccionaron exp.',      entered: completions.experience  || 0, completed: completions.budget      || 0 },
    { stage: 'Seleccionaron budget',    entered: completions.budget      || 0, completed: completions.frequency   || 0 },
    { stage: 'Generaron el stack',      entered: completions.frequency   || 0, completed: waClicks                   },
  ];

  return stages.map(s => ({
    ...s,
    dropped:     s.entered - s.completed,
    dropoutRate: s.entered > 0 ? Math.round(((s.entered - s.completed) / s.entered) * 100) : 0,
  }));
}

/**
 * WhatsApp conversion rate — % of stack generates that led to a WA click.
 * This is the most important metric: stack builder effectiveness.
 */
export function getWAConversionRate() {
  const generated = stackStepEvents().filter(e => e.p?.action === 'wa_clicked').length;
  const clicked   = stackWAEvents().length;
  return {
    stacks_completed_to_wa: generated,
    wa_clicks_from_builder: clicked,
    conversion_rate_pct:    generated > 0 ? Math.round((clicked / generated) * 100) : 0,
  };
}

/**
 * Abandonment patterns — where users leave and with what intent signal.
 * Signal: which step needs trust reinforcement or UX simplification.
 */
export function getAbandonmentPatterns() {
  const abandonments = stackStepEvents().filter(e => e.p?.action === 'abandoned');
  const byStep       = {};
  for (const e of abandonments) {
    const step = e.p?.step_reached || 'unknown';
    if (!byStep[step]) byStep[step] = { step, count: 0, goals: {} };
    byStep[step].count++;
    const goal = e.p?.goal;
    if (goal) byStep[step].goals[goal] = (byStep[step].goals[goal] || 0) + 1;
  }
  return Object.values(byStep).sort((a, b) => b.count - a.count);
}

/**
 * Most popular stack combinations — goal + experience + budget.
 * Signal: which products to feature, which stacks to promote in WhatsApp.
 */
export function getMostPopularCombinations(limit = 5) {
  const waEvents = stackStepEvents().filter(e => e.p?.action === 'wa_clicked');
  const combos   = {};
  for (const e of waEvents) {
    const key = `${e.p?.goal}|${e.p?.experience}|${e.p?.budget}`;
    combos[key] = (combos[key] || 0) + 1;
  }
  return Object.entries(combos)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key, count]) => {
      const [goal, experience, budget] = key.split('|');
      return { goal, experience, budget, count };
    });
}

/**
 * Comprehensive stack intelligence report.
 * Dev console: window.__mfStack.report()
 */
export function getStackReport() {
  return {
    opens:                  getBuilderOpenCount(),
    goalDistribution:       getGoalDistribution(),
    experienceDistribution: getExperienceDistribution(),
    budgetDistribution:     getBudgetDistribution(),
    funnelDropout:          getFunnelDropout(),
    waConversion:           getWAConversionRate(),
    abandonmentPatterns:    getAbandonmentPatterns(),
    popularCombinations:    getMostPopularCombinations(),
  };
}

/**
 * Pretty-print the stack intelligence report to the browser console.
 */
export function logStackReport() {
  const r  = getStackReport();
  const h  = label => console.log(`%c── ${label}`, 'color:#E3001E;font-weight:700;font-size:12px');
  const ok = label => console.log(`%c${label}`, 'color:#00C896;font-weight:600');

  console.groupCollapsed('%c[MacroForge Stack Intelligence]', 'color:#E3001E;font-weight:800;font-size:14px');

  ok(`Builder opened: ${r.opens} times`);
  ok(`WA conversion: ${r.waConversion.conversion_rate_pct}% (${r.waConversion.wa_clicks_from_builder} WA clicks)`);

  h('🎯 Goal Distribution');       console.table(r.goalDistribution);
  h('💪 Experience Distribution'); console.table(r.experienceDistribution);
  h('💰 Budget Distribution');     console.table(r.budgetDistribution);
  h('📊 Funnel Dropout');          console.table(r.funnelDropout);
  h('❌ Abandonment Patterns');    console.table(r.abandonmentPatterns);
  h('🏆 Most Popular Combos');     console.table(r.popularCombinations);

  console.groupEnd();
  return r;
}
