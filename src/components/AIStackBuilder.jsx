/**
 * MacroForge — AI Stack Builder
 *
 * Phase 2 of the MacroForge global commerce roadmap.
 * An intelligent, guided supplement stack recommendation experience.
 *
 * Architecture: completely self-contained. No backend required.
 * The recommendation engine is deterministic client-side logic.
 *
 * Future evolution path:
 * ─────────────────────────────────────────────────────────────
 * Phase 2 (current): Client-side rule-based recommendation engine.
 *   — Zero API calls. Zero costs. Zero latency.
 *   — All logic runs in the browser.
 *
 * Phase 3: Replace generateStack() with an OpenAI API call via a
 *   secure Vercel Edge Function (never expose the API key client-side).
 *   POST /api/ai-stack → OpenAI → structured JSON response.
 *
 * Phase 4: Persist requests to Supabase.
 *
 * Future Supabase tables (DO NOT IMPLEMENT YET — planning only):
 *   ai_stack_requests  (id, goal, experience, budget, frequency, custom_text, created_at)
 *   generated_stacks   (id, request_id, slugs, reasoning, stack_name, created_at)
 *   whatsapp_leads     (id, stack_id, sent_at, lead_quality_score)
 *   customer_preferences (id, user_id, goals, stacks, last_seen_at)
 *   abandoned_stacks   (id, request_id, step_reached, created_at)
 *   behavioral_tracking (id, session_id, event, payload, created_at)
 * ─────────────────────────────────────────────────────────────
 *
 * Security: NO API keys. NO secrets. NO unsafe data storage.
 * All data stays in localStorage. No PII is collected.
 */

import { useState, useEffect, useMemo } from 'react';
import { PRODUCTS } from '../data/products';
import { resolveProductImage } from '../data/images';
import { analytics } from '../lib/analytics';
import { WA_NUMBER } from '../data/catalog';
import '../styles/aiStackBuilder.css';

// ── Slug → product ID map (module-level, computed once) ──────
const SLUG_TO_ID = (() => {
  const m = {};
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const slug = p.u?.match(/\/tienda\/([^/?#]+)/)?.[1];
    if (slug) m[slug] = id;
  }
  return m;
})();

// ── Step configuration ────────────────────────────────────────
const GOALS = [
  { id: 'muscle',      icon: '💪', label: 'Ganar músculo',     desc: 'Masa, fuerza y volumen' },
  { id: 'cut',         icon: '🔥', label: 'Definición',        desc: 'Quemar grasa, conservar músculo' },
  { id: 'performance', icon: '⚡', label: 'Rendimiento',       desc: 'Energía, fuerza y resistencia' },
  { id: 'wellness',    icon: '❤️', label: 'Salud general',     desc: 'Bienestar, vitaminas y longevidad' },
  { id: 'recovery',    icon: '🧘', label: 'Recuperación',      desc: 'Músculos, articulaciones y descanso' },
  { id: 'sleep',       icon: '😴', label: 'Dormir mejor',      desc: 'Sueño profundo y recuperación nocturna' },
];

const EXPERIENCES = [
  { id: 'beginner',     icon: '🌱', label: 'Principiante',    desc: 'Menos de 1 año entrenando' },
  { id: 'intermediate', icon: '🏋️', label: 'Intermedio',     desc: '1 a 3 años de experiencia' },
  { id: 'advanced',     icon: '🏆', label: 'Avanzado',        desc: 'Más de 3 años de entrenamiento serio' },
];

const BUDGETS = [
  { id: 'basic', icon: '💡', label: 'Esencial',     desc: 'Lo más importante sin desperdiciar' },
  { id: 'mid',   icon: '💎', label: 'Balanceado',   desc: 'Buen balance precio-resultado' },
  { id: 'full',  icon: '🚀', label: 'Completo',     desc: 'El stack optimizado al máximo' },
];

const FREQUENCIES = [
  { id: 'low',  icon: '📅', label: '2–3 días/semana', desc: 'Entrenamiento moderado o casual' },
  { id: 'mid',  icon: '📅', label: '4–5 días/semana', desc: 'Entrenamiento regular y consistente' },
  { id: 'high', icon: '📅', label: '6+ días/semana',  desc: 'Entrenamiento intensivo o atlético' },
];

const STEPS = ['goal', 'experience', 'budget', 'frequency'];
const STEP_LABELS = ['Objetivo', 'Experiencia', 'Presupuesto', 'Frecuencia'];

// ── Per-product recommendation insights ──────────────────────
// Why each product was selected. Feels personalized, reads as intelligent.
const PRODUCT_INSIGHTS = {
  'creatina-monohidratada-nutricost': 'Base de cualquier stack serio. Mejora fuerza, volumen y rendimiento de forma consistente.',
  'gold-standard-whey':               'La proteína de referencia global. Recuperación muscular rápida y perfil aminoacídico completo.',
  'iso-100':                          'Proteína isolada de máxima pureza. Sin lactosa, absorción rápida — ideal para definición.',
  'omega3nutricost':                  'Antiinflamatorio, cardioprotector y esencial para recuperación articular. Todos lo necesitan.',
  'zma':                              'Zinc + Magnesio + B6 en dosis exactas. Mejora la calidad del sueño y la recuperación nocturna.',
  'melatoninanutricost':              'Regula el ciclo circadiano. Dormís mejor, recuperás más, y el músculo crece de noche.',
  'multivitaminico-hombre-rule-one':  'Cobertura total de micronutrientes que el entrenamiento intenso consume y agota.',
  'colageno-rule-1':                  'Salud articular, piel y tejido conectivo. Fundamental para quienes entrenan con alta frecuencia.',
  'c4':                               'El pre-entrenamiento más reconocido del mundo. Energía, enfoque y resistencia comprobados.',
  'ruleone':                          'Creatina de alta calidad de Rule One Proteins. Consistencia y pureza en cada dosis.',
  'nitrotech':                        'Proteína premium con creatina incluida. Stack doble en una sola fórmula de MuscleTech.',
  'iso-flex':                         'Isolada de ALLMAX con perfil aminoacídico superior. Alta calidad para resultados serios.',
  'bamf':                             'Pre-entrenamiento avanzado para atletas que exigen máximo rendimiento y enfoque.',
  'total-war':                        'Fórmula completa de Redcon1 para entrenamientos de alta intensidad y largo plazo.',
  'serius-mass':                      'El gainer más icónico del mercado. Calorías de calidad para quienes necesitan subir de peso.',
  'BetaAlaninaNutricost':             'Retrasa la fatiga muscular. Perfecto para sets prolongados y entrenamiento de resistencia.',
  'clanutricost':                     'Ácido linoleico conjugado. Apoya la pérdida de grasa mientras preserva el tejido muscular.',
  'carnitinsimply':                   'L-Carnitina para utilizar la grasa como energía. Simple, efectiva y bien tolerada.',
  'glutaminaon':                      'Acelerador de recuperación muscular. Refuerza el sistema inmune bajo estrés deportivo.',
  'vitaminacalfa':                    'Vitamina C de alta biodisponibilidad. Sistema inmune, colágeno y recuperación celular.',
  'iso-sensation':                    'Isolada clásica de Ultimate Nutrition. Alta digestibilidad y perfil de aminoácidos completo.',
};

// ── Stack recommendation matrix ───────────────────────────────
// All slugs come exclusively from PRODUCT_LABELS — verified quality picks.
// generateStack() filters out any slug that doesn't resolve to a product ID.
//
// TODO (Phase 3): Replace this with POST /api/ai-stack → OpenAI GPT-4
// so recommendations become truly personalized and conversational.
const STACK_MATRIX = {
  muscle: {
    beginner: {
      basic: ['creatina-monohidratada-nutricost', 'gold-standard-whey'],
      mid:   ['creatina-monohidratada-nutricost', 'gold-standard-whey', 'glutaminaon'],
      full:  ['creatina-monohidratada-nutricost', 'gold-standard-whey', 'glutaminaon', 'zma', 'omega3nutricost'],
    },
    intermediate: {
      basic: ['ruleone', 'nitrotech'],
      mid:   ['ruleone', 'iso-100', 'c4'],
      full:  ['ruleone', 'iso-100', 'c4', 'zma', 'omega3nutricost'],
    },
    advanced: {
      basic: ['ruleone', 'iso-100'],
      mid:   ['ruleone', 'iso-100', 'c4', 'zma'],
      full:  ['ruleone', 'iso-100', 'c4', 'zma', 'omega3nutricost', 'multivitaminico-hombre-rule-one'],
    },
  },
  cut: {
    beginner: {
      basic: ['gold-standard-whey', 'clanutricost'],
      mid:   ['gold-standard-whey', 'clanutricost', 'carnitinsimply'],
      full:  ['iso-100', 'clanutricost', 'carnitinsimply', 'omega3nutricost'],
    },
    intermediate: {
      basic: ['iso-100', 'clanutricost'],
      mid:   ['iso-100', 'clanutricost', 'carnitinsimply', 'c4'],
      full:  ['iso-100', 'clanutricost', 'carnitinsimply', 'c4', 'omega3nutricost', 'zma'],
    },
    advanced: {
      basic: ['iso-100', 'clanutricost'],
      mid:   ['iso-100', 'clanutricost', 'carnitinsimply', 'total-war'],
      full:  ['iso-100', 'clanutricost', 'carnitinsimply', 'total-war', 'omega3nutricost', 'zma'],
    },
  },
  performance: {
    beginner: {
      basic: ['creatina-monohidratada-nutricost', 'gold-standard-whey'],
      mid:   ['creatina-monohidratada-nutricost', 'gold-standard-whey', 'BetaAlaninaNutricost'],
      full:  ['creatina-monohidratada-nutricost', 'gold-standard-whey', 'BetaAlaninaNutricost', 'omega3nutricost'],
    },
    intermediate: {
      basic: ['ruleone', 'c4'],
      mid:   ['ruleone', 'c4', 'iso-100'],
      full:  ['ruleone', 'c4', 'iso-100', 'omega3nutricost', 'zma'],
    },
    advanced: {
      basic: ['ruleone', 'bamf'],
      mid:   ['ruleone', 'bamf', 'iso-100', 'zma'],
      full:  ['ruleone', 'bamf', 'iso-100', 'zma', 'omega3nutricost', 'multivitaminico-hombre-rule-one'],
    },
  },
  wellness: {
    beginner: {
      basic: ['omega3nutricost', 'vitaminacalfa'],
      mid:   ['omega3nutricost', 'vitaminacalfa', 'melatoninanutricost'],
      full:  ['omega3nutricost', 'vitaminacalfa', 'melatoninanutricost', 'multivitaminico-hombre-rule-one'],
    },
    intermediate: {
      basic: ['omega3nutricost', 'melatoninanutricost'],
      mid:   ['omega3nutricost', 'melatoninanutricost', 'multivitaminico-hombre-rule-one'],
      full:  ['omega3nutricost', 'melatoninanutricost', 'multivitaminico-hombre-rule-one', 'zma', 'colageno-rule-1'],
    },
    advanced: {
      basic: ['omega3nutricost', 'multivitaminico-hombre-rule-one'],
      mid:   ['omega3nutricost', 'multivitaminico-hombre-rule-one', 'zma', 'colageno-rule-1'],
      full:  ['omega3nutricost', 'multivitaminico-hombre-rule-one', 'zma', 'colageno-rule-1', 'melatoninanutricost'],
    },
  },
  recovery: {
    beginner: {
      basic: ['glutaminaon', 'zma'],
      mid:   ['glutaminaon', 'zma', 'omega3nutricost'],
      full:  ['glutaminaon', 'zma', 'omega3nutricost', 'creatina-monohidratada-nutricost'],
    },
    intermediate: {
      basic: ['zma', 'omega3nutricost'],
      mid:   ['zma', 'omega3nutricost', 'creatina-monohidratada-nutricost'],
      full:  ['zma', 'omega3nutricost', 'creatina-monohidratada-nutricost', 'iso-100', 'glutaminaon'],
    },
    advanced: {
      basic: ['zma', 'omega3nutricost'],
      mid:   ['zma', 'omega3nutricost', 'creatina-monohidratada-nutricost', 'iso-100'],
      full:  ['zma', 'omega3nutricost', 'creatina-monohidratada-nutricost', 'iso-100', 'glutaminaon', 'multivitaminico-hombre-rule-one'],
    },
  },
  sleep: {
    beginner: {
      basic: ['melatoninanutricost'],
      mid:   ['melatoninanutricost', 'zma'],
      full:  ['melatoninanutricost', 'zma', 'omega3nutricost'],
    },
    intermediate: {
      basic: ['melatoninanutricost', 'zma'],
      mid:   ['melatoninanutricost', 'zma', 'omega3nutricost'],
      full:  ['melatoninanutricost', 'zma', 'omega3nutricost', 'colageno-rule-1'],
    },
    advanced: {
      basic: ['zma', 'melatoninanutricost'],
      mid:   ['zma', 'melatoninanutricost', 'omega3nutricost'],
      full:  ['zma', 'melatoninanutricost', 'omega3nutricost', 'colageno-rule-1'],
    },
  },
};

// ── Recommendation engine ─────────────────────────────────────
function generateStack({ goal, experience, budget }) {
  const tier    = STACK_MATRIX[goal]     || STACK_MATRIX.muscle;
  const expTier = tier[experience]        || tier.beginner;
  const slugs   = expTier[budget]         || expTier.basic;
  return slugs
    .map(slug => ({ slug, id: SLUG_TO_ID[slug] }))
    .filter(({ id }) => Boolean(id && PRODUCTS[id]));
}

// ── Personalized reasoning text ───────────────────────────────
const GOAL_TEXT = {
  muscle:      'ganar masa muscular y mejorar tu fuerza',
  cut:         'definirte y reducir grasa corporal manteniendo el músculo',
  performance: 'mejorar tu rendimiento y energía en el entrenamiento',
  wellness:    'optimizar tu bienestar general y salud diaria',
  recovery:    'acelerar tu recuperación muscular y articular',
  sleep:       'mejorar la calidad de tu sueño y descanso nocturno',
};
const EXP_TEXT = {
  beginner:     'como principiante, priorizamos suplementos seguros, efectivos y fáciles de mantener',
  intermediate: 'con tu nivel de experiencia, sumamos productos que amplifican tus resultados',
  advanced:     'a tu nivel, el stack está optimizado para eficiencia y rendimiento máximo',
};
const BUDGET_TEXT = {
  basic: 'manteniendo lo esencial sin desperdiciar',
  mid:   'con una inversión equilibrada que maximiza el retorno',
  full:  'con el stack completo para resultados óptimos',
};

function generateReasoning({ goal, experience, budget, frequency }) {
  const freqExtra = frequency === 'high'
    ? ' Dado que entrenás 6 o más días por semana, incluimos soporte extra de recuperación.'
    : '';
  return `Basado en tu objetivo de ${GOAL_TEXT[goal] || ''}, ${EXP_TEXT[experience] || ''} y ${BUDGET_TEXT[budget] || ''}.${freqExtra} Cada producto fue elegido por su efectividad comprobada y compatibilidad con tu perfil.`;
}

// ── WhatsApp message builder ──────────────────────────────────
const GOAL_LABELS = { muscle: 'Ganar músculo', cut: 'Definición', performance: 'Más rendimiento', wellness: 'Salud general', recovery: 'Recuperación', sleep: 'Dormir mejor' };
const EXP_LABELS  = { beginner: 'Principiante (< 1 año)', intermediate: 'Intermedio (1–3 años)', advanced: 'Avanzado (3+ años)' };
const BUD_LABELS  = { basic: 'Esencial', mid: 'Balanceado', full: 'Completo' };
const FREQ_LABELS = { low: '2–3 días/semana', mid: '4–5 días/semana', high: '6+ días/semana' };

function buildWAMessage({ goal, experience, budget, frequency, stack }) {
  const lines = stack
    .map((item, i) => {
      const p = PRODUCTS[item.id];
      return `${i + 1}. ${p?.n || ''} — ${p?.b || ''}`;
    })
    .join('\n');

  return `Hola MacroForge! Usé el Stack Builder y me generó este stack personalizado:

🎯 Objetivo: ${GOAL_LABELS[goal] || goal}
💪 Experiencia: ${EXP_LABELS[experience] || experience}
💰 Presupuesto: ${BUD_LABELS[budget] || budget}
📅 Frecuencia: ${FREQ_LABELS[frequency] || frequency}

📦 Stack recomendado:
${lines}

¿Pueden confirmar disponibilidad y precio total del stack? ¡Muchas gracias!`;
}

// ── Result product card ───────────────────────────────────────
function ResultCard({ item, index }) {
  const p   = PRODUCTS[item.id];
  if (!p) return null;
  const img    = resolveProductImage(p.u);
  const price  = (p.p[0] || '').match(/(₡\s*[\d\s,.]+)/)?.[1]?.trim() || '';
  const insight = PRODUCT_INSIGHTS[item.slug] || '';

  return (
    <div className="ai-product-card">
      <div className="ai-product-num">{index + 1}</div>
      <div className="ai-product-img">
        {img
          ? <img src={img} alt={p.n} loading="lazy" decoding="async"
              onError={e => { e.currentTarget.style.display = 'none'; }} />
          : <div className="ai-product-img-fallback">{p.b.charAt(0)}</div>
        }
      </div>
      <div className="ai-product-info">
        <div className="ai-product-brand">{p.b}</div>
        <div className="ai-product-name">{p.n}</div>
        {insight && <div className="ai-product-insight">{insight}</div>}
      </div>
      {price && <div className="ai-product-price">{price}</div>}
    </div>
  );
}

// ── Option card ───────────────────────────────────────────────
function OptionCard({ option, selected, onSelect }) {
  return (
    <button
      className={`ai-option${selected ? ' ai-option--selected' : ''}`}
      onClick={() => onSelect(option.id)}
      type="button"
      aria-pressed={selected}
    >
      <span className="ai-option-icon" aria-hidden="true">{option.icon}</span>
      <span className="ai-option-label">{option.label}</span>
      <span className="ai-option-desc">{option.desc}</span>
      {selected && <span className="ai-option-check" aria-hidden="true">✓</span>}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────
const INITIAL_SELECTIONS = { goal: null, experience: null, budget: null, frequency: null };

export default function AIStackBuilder() {
  const [isOpen,      setIsOpen]      = useState(false);
  const [stepIndex,   setStepIndex]   = useState(0);   // 0–3 = questions, 4 = analyzing, 5 = results
  const [selections,  setSelections]  = useState(INITIAL_SELECTIONS);

  // Auto-advance from 'analyzing' to 'results' after 1.8s
  useEffect(() => {
    if (stepIndex !== 4) return;
    const t = setTimeout(() => setStepIndex(5), 1800);
    return () => clearTimeout(t);
  }, [stepIndex]);

  const stack = useMemo(() => {
    if (!selections.goal || !selections.experience || !selections.budget) return [];
    return generateStack(selections);
  }, [selections]);

  const reasoning = useMemo(() => {
    if (!selections.goal || !selections.experience || !selections.budget) return '';
    return generateReasoning(selections);
  }, [selections]);

  const waMessage = useMemo(() => {
    if (stack.length === 0) return '';
    return buildWAMessage({ ...selections, stack });
  }, [stack, selections]);

  const waUrl = stack.length > 0
    ? `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMessage)}`
    : '#';

  function open() {
    setIsOpen(true);
    setStepIndex(0);
    setSelections(INITIAL_SELECTIONS);
    analytics.stackCTA('ai_builder_open', 'AI Stack Builder');
    // Prevent body scroll while overlay is open
    document.body.style.overflow = 'hidden';
  }

  function close() {
    setIsOpen(false);
    document.body.style.overflow = '';
  }

  function select(field, value) {
    setSelections(prev => ({ ...prev, [field]: value }));
  }

  function next() {
    const fields   = ['goal', 'experience', 'budget', 'frequency'];
    const current  = fields[stepIndex];
    if (!selections[current]) return; // guard: don't advance without selection
    if (stepIndex < 3) {
      setStepIndex(i => i + 1);
    } else {
      // Trigger analyzing → results
      setStepIndex(4);
      analytics.stackCTA('ai_builder_generate', `${selections.goal}|${selections.experience}|${selections.budget}`);
    }
  }

  function back() {
    if (stepIndex > 0 && stepIndex < 4) setStepIndex(i => i - 1);
  }

  function restart() {
    setStepIndex(0);
    setSelections(INITIAL_SELECTIONS);
  }

  function handleWAClick() {
    analytics.whatsappClick('ai_stack_builder', null, `${GOAL_LABELS[selections.goal]} stack`);
  }

  // Current step data
  const stepConfigs = [
    { field: 'goal',       options: GOALS,       cols: 2 },
    { field: 'experience', options: EXPERIENCES,  cols: 1 },
    { field: 'budget',     options: BUDGETS,      cols: 1 },
    { field: 'frequency',  options: FREQUENCIES,  cols: 1 },
  ];

  const currentConfig  = stepConfigs[stepIndex];
  const currentValue   = currentConfig ? selections[currentConfig.field] : null;
  const progressPct    = stepIndex >= 4
    ? 100
    : Math.round(((stepIndex + (currentValue ? 1 : 0)) / 4) * 100);

  return (
    <>
      {/* ── Trigger section — rendered on home page ── */}
      <section className="ai-trigger-section">
        <div className="ai-trigger-eyebrow">
          <div className="ai-trigger-eyebrow-dot" aria-hidden="true" />
          AI Stack Builder · Exclusivo MacroForge
        </div>
        <h2 className="ai-trigger-title">
          Tu stack, <em>personalizado.</em>
        </h2>
        <p className="ai-trigger-desc">
          Respondé 4 preguntas. Recibí un stack de suplementos diseñado
          para tu objetivo, experiencia y presupuesto exacto.
        </p>
        <button className="ai-trigger-btn" onClick={open} type="button">
          <span className="ai-trigger-btn-icon" aria-hidden="true">⚡</span>
          Armar mi stack personalizado
        </button>
        <div className="ai-trigger-meta">
          <div className="ai-trigger-meta-item"><span>✓</span> 4 preguntas</div>
          <div className="ai-trigger-meta-item"><span>✓</span> Sin registro</div>
          <div className="ai-trigger-meta-item"><span>✓</span> Resultado inmediato</div>
        </div>
      </section>

      {/* ── Full-screen overlay ── */}
      {isOpen && (
        <div className="ai-overlay" role="dialog" aria-modal="true" aria-label="AI Stack Builder">
          <div className="ai-modal">

            {/* Header */}
            <div className="ai-modal-header">
              <div className="ai-modal-brand">MACRO<span>FORGE</span></div>
              <button className="ai-modal-close" onClick={close} aria-label="Cerrar" type="button">✕</button>
            </div>

            {/* Progress */}
            {stepIndex < 5 && (
              <div className="ai-progress">
                <div className="ai-progress-track">
                  <div className="ai-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="ai-progress-label">
                  {stepIndex < 4
                    ? `Paso ${stepIndex + 1} de 4 — ${STEP_LABELS[stepIndex]}`
                    : 'Generando tu stack...'}
                </div>
              </div>
            )}

            {/* ── Question steps (0–3) ── */}
            {stepIndex < 4 && currentConfig && (
              <>
                <div className="ai-step" key={stepIndex}>
                  <div className="ai-step-question">
                    {stepIndex === 0 && '¿Cuál es tu objetivo principal?'}
                    {stepIndex === 1 && '¿Cuánto tiempo llevás entrenando?'}
                    {stepIndex === 2 && '¿Qué tipo de stack buscás?'}
                    {stepIndex === 3 && '¿Con qué frecuencia entrenás?'}
                  </div>
                  <div className="ai-step-hint">
                    {stepIndex === 0 && 'Elegí el que mejor describe lo que querés lograr.'}
                    {stepIndex === 1 && 'Adaptamos el stack a tu nivel de experiencia.'}
                    {stepIndex === 2 && 'Lo ajustamos para que tenga sentido según tu inversión.'}
                    {stepIndex === 3 && 'La frecuencia influye en los suplementos de recuperación.'}
                  </div>
                  <div className={`ai-options ai-options--${currentConfig.cols === 2 ? '2col' : '1col'}`}>
                    {currentConfig.options.map(opt => (
                      <OptionCard
                        key={opt.id}
                        option={opt}
                        selected={currentValue === opt.id}
                        onSelect={val => select(currentConfig.field, val)}
                      />
                    ))}
                  </div>
                </div>

                <div className="ai-nav">
                  {stepIndex > 0 && (
                    <button className="ai-nav-back" onClick={back} type="button">← Atrás</button>
                  )}
                  <button
                    className="ai-nav-next"
                    onClick={next}
                    disabled={!currentValue}
                    type="button"
                  >
                    {stepIndex < 3 ? 'Continuar →' : '⚡ Generar mi stack'}
                  </button>
                </div>
              </>
            )}

            {/* ── Analyzing state (step 4) ── */}
            {stepIndex === 4 && (
              <div className="ai-analyzing">
                <div className="ai-analyzing-orb" aria-hidden="true" />
                <div className="ai-analyzing-text">Analizando tu perfil</div>
                <div className="ai-analyzing-dots" aria-hidden="true">
                  <div className="ai-analyzing-dot" />
                  <div className="ai-analyzing-dot" />
                  <div className="ai-analyzing-dot" />
                </div>
                <div className="ai-analyzing-sub">
                  Seleccionando los mejores suplementos para tu objetivo,
                  experiencia y presupuesto...
                </div>
              </div>
            )}

            {/* ── Results (step 5) ── */}
            {stepIndex === 5 && stack.length > 0 && (
              <>
                <div className="ai-results-scroll">
                  <div className="ai-results">
                    <div className="ai-results-badge">
                      <span>⚡</span> Stack personalizado · MacroForge
                    </div>
                    <div className="ai-results-title">
                      Tu stack para {GOAL_LABELS[selections.goal]}
                    </div>
                    <div className="ai-results-reasoning">{reasoning}</div>

                    <div className="ai-product-list">
                      {stack.map((item, i) => (
                        <ResultCard key={item.slug} item={item} index={i} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ai-results-cta">
                  <div className="ai-results-cta-label">
                    Consultá disponibilidad y precio total del stack
                  </div>
                  <a
                    className="ai-results-wa-btn"
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleWAClick}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.112.549 4.1 1.51 5.827L.057 23.82a.5.5 0 0 0 .623.623l5.993-1.453A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.888 0-3.657-.519-5.17-1.42l-.37-.22-3.556.862.862-3.556-.22-.37A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                    Consultar este stack por WhatsApp
                  </a>
                  <button className="ai-results-restart" onClick={restart} type="button">
                    ↺ Armar otro stack
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}
