/**
 * MacroForge — Stack Commerce Gateway + AI Stack Builder
 *
 * Phase 3.5: Stack Commerce Gateway
 * Adds a premium two-path entry layer before the existing AI-guided flow.
 *
 * Modes:
 *   'gateway' — Initial choice screen (Manual vs AI-guided)
 *   'manual'  — Manual Stack Builder (user selects products directly)
 *   'guided'  — Existing AI-guided flow (4 questions → analysis → results)
 *
 * Architecture: completely self-contained, no backend required.
 *
 * Future backend hooks (DO NOT IMPLEMENT YET):
 *   ai_stack_requests, generated_stacks, whatsapp_leads,
 *   customer_preferences, abandoned_stacks, behavioral_tracking
 *
 * Security: NO API keys. NO secrets. No PII collected.
 */

import { useState, useEffect, useMemo } from 'react';
import { PRODUCTS } from '../data/products';
import { resolveProductImage } from '../data/images';
import { analytics } from '../lib/analytics';
import { WA_NUMBER } from '../data/catalog';
import { saveStack, getSavedStack, hasSavedStack, STACK_SAVED_EVENT } from '../lib/stackPersistence';
import { getFavoriteStacks, openFavoriteStack, FAVORITE_STACKS_EVENT } from '../lib/favoriteStacks';
import StackCheckoutLayer from './StackCheckoutLayer';
import ManualStackBuilder from './ManualStackBuilder';
import '../styles/aiStackBuilder.css';
import '../styles/stackCommerce.css';

// ── Module-level maps (computed once, used by guided flow) ─────
const SLUG_TO_ID = (() => {
  const m = {};
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const slug = p.u?.match(/\/tienda\/([^/?#]+)/)?.[1];
    if (slug) m[slug] = id;
  }
  return m;
})();

const MAX_MANUAL = 8; // passed to addToStack guard

// ── Guided-flow constants (unchanged from Phase 2) ────────────
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
const STEPS       = ['goal', 'experience', 'budget', 'frequency'];
const STEP_LABELS = ['Objetivo', 'Experiencia', 'Presupuesto', 'Frecuencia'];

// ── Product insights for guided results ──────────────────────
const PRODUCT_INSIGHTS = {
  'creatina-monohidratada-nutricost': 'Base de cualquier stack serio. Mejora fuerza, volumen y rendimiento.',
  'gold-standard-whey':               'La proteína de referencia global. Recuperación muscular rápida.',
  'iso-100':                          'Proteína isolada de máxima pureza. Sin lactosa, absorción rápida.',
  'omega3nutricost':                  'Antiinflamatorio, cardioprotector y esencial para recuperación articular.',
  'zma':                              'Zinc + Magnesio + B6. Mejora sueño y recuperación nocturna.',
  'melatoninanutricost':              'Regula el ciclo circadiano. Dormís mejor, recuperás más.',
  'multivitaminico-hombre-rule-one':  'Cobertura total de micronutrientes para entrenamiento intenso.',
  'colageno-rule-1':                  'Salud articular, piel y tejido conectivo. Fundamental si entrenás con alta frecuencia.',
  'c4':                               'El pre-entrenamiento más reconocido del mundo. Energía y enfoque comprobados.',
  'ruleone':                          'Creatina de alta calidad. Consistencia y pureza en cada dosis.',
  'nitrotech':                        'Proteína + creatina en una sola fórmula premium de MuscleTech.',
  'iso-flex':                         'Isolada de ALLMAX con perfil aminoacídico superior.',
  'bamf':                             'Pre-entrenamiento avanzado para atletas que exigen rendimiento máximo.',
  'total-war':                        'Fórmula completa de Redcon1 para entrenamientos de alta intensidad.',
  'serius-mass':                      'El gainer más icónico del mercado. Calorías de calidad para subir.',
  'BetaAlaninaNutricost':             'Retrasa la fatiga muscular para sets prolongados.',
  'clanutricost':                     'Ácido linoleico. Apoya la pérdida de grasa preservando músculo.',
  'carnitinsimply':                   'L-Carnitina para utilizar la grasa como energía. Simple y efectiva.',
  'glutaminaon':                      'Acelerador de recuperación muscular y refuerzo inmune.',
  'vitaminacalfa':                    'Vitamina C de alta biodisponibilidad. Colágeno y recuperación celular.',
  'iso-sensation':                    'Isolada clásica con alta digestibilidad y perfil completo.',
};

// ── Stack matrix (guided flow — Phase 2, unchanged) ───────────
const STACK_MATRIX = {
  muscle: {
    beginner: { basic: ['creatina-monohidratada-nutricost','gold-standard-whey'], mid: ['creatina-monohidratada-nutricost','gold-standard-whey','glutaminaon'], full: ['creatina-monohidratada-nutricost','gold-standard-whey','glutaminaon','zma','omega3nutricost'] },
    intermediate: { basic: ['ruleone','nitrotech'], mid: ['ruleone','iso-100','c4'], full: ['ruleone','iso-100','c4','zma','omega3nutricost'] },
    advanced: { basic: ['ruleone','iso-100'], mid: ['ruleone','iso-100','c4','zma'], full: ['ruleone','iso-100','c4','zma','omega3nutricost','multivitaminico-hombre-rule-one'] },
  },
  cut: {
    beginner: { basic: ['gold-standard-whey','clanutricost'], mid: ['gold-standard-whey','clanutricost','carnitinsimply'], full: ['iso-100','clanutricost','carnitinsimply','omega3nutricost'] },
    intermediate: { basic: ['iso-100','clanutricost'], mid: ['iso-100','clanutricost','carnitinsimply','c4'], full: ['iso-100','clanutricost','carnitinsimply','c4','omega3nutricost','zma'] },
    advanced: { basic: ['iso-100','clanutricost'], mid: ['iso-100','clanutricost','carnitinsimply','total-war'], full: ['iso-100','clanutricost','carnitinsimply','total-war','omega3nutricost','zma'] },
  },
  performance: {
    beginner: { basic: ['creatina-monohidratada-nutricost','gold-standard-whey'], mid: ['creatina-monohidratada-nutricost','gold-standard-whey','BetaAlaninaNutricost'], full: ['creatina-monohidratada-nutricost','gold-standard-whey','BetaAlaninaNutricost','omega3nutricost'] },
    intermediate: { basic: ['ruleone','c4'], mid: ['ruleone','c4','iso-100'], full: ['ruleone','c4','iso-100','omega3nutricost','zma'] },
    advanced: { basic: ['ruleone','bamf'], mid: ['ruleone','bamf','iso-100','zma'], full: ['ruleone','bamf','iso-100','zma','omega3nutricost','multivitaminico-hombre-rule-one'] },
  },
  wellness: {
    beginner: { basic: ['omega3nutricost','vitaminacalfa'], mid: ['omega3nutricost','vitaminacalfa','melatoninanutricost'], full: ['omega3nutricost','vitaminacalfa','melatoninanutricost','multivitaminico-hombre-rule-one'] },
    intermediate: { basic: ['omega3nutricost','melatoninanutricost'], mid: ['omega3nutricost','melatoninanutricost','multivitaminico-hombre-rule-one'], full: ['omega3nutricost','melatoninanutricost','multivitaminico-hombre-rule-one','zma','colageno-rule-1'] },
    advanced: { basic: ['omega3nutricost','multivitaminico-hombre-rule-one'], mid: ['omega3nutricost','multivitaminico-hombre-rule-one','zma','colageno-rule-1'], full: ['omega3nutricost','multivitaminico-hombre-rule-one','zma','colageno-rule-1','melatoninanutricost'] },
  },
  recovery: {
    beginner: { basic: ['glutaminaon','zma'], mid: ['glutaminaon','zma','omega3nutricost'], full: ['glutaminaon','zma','omega3nutricost','creatina-monohidratada-nutricost'] },
    intermediate: { basic: ['zma','omega3nutricost'], mid: ['zma','omega3nutricost','creatina-monohidratada-nutricost'], full: ['zma','omega3nutricost','creatina-monohidratada-nutricost','iso-100','glutaminaon'] },
    advanced: { basic: ['zma','omega3nutricost'], mid: ['zma','omega3nutricost','creatina-monohidratada-nutricost','iso-100'], full: ['zma','omega3nutricost','creatina-monohidratada-nutricost','iso-100','glutaminaon','multivitaminico-hombre-rule-one'] },
  },
  sleep: {
    beginner: { basic: ['melatoninanutricost'], mid: ['melatoninanutricost','zma'], full: ['melatoninanutricost','zma','omega3nutricost'] },
    intermediate: { basic: ['melatoninanutricost','zma'], mid: ['melatoninanutricost','zma','omega3nutricost'], full: ['melatoninanutricost','zma','omega3nutricost','colageno-rule-1'] },
    advanced: { basic: ['zma','melatoninanutricost'], mid: ['zma','melatoninanutricost','omega3nutricost'], full: ['zma','melatoninanutricost','omega3nutricost','colageno-rule-1'] },
  },
};

// ── Guided flow helpers (Phase 2, unchanged) ─────────────────
function generateStack({ goal, experience, budget }) {
  const tier    = STACK_MATRIX[goal]  || STACK_MATRIX.muscle;
  const expTier = tier[experience]    || tier.beginner;
  const slugs   = expTier[budget]     || expTier.basic;
  return slugs.map(slug => ({ slug, id: SLUG_TO_ID[slug] })).filter(({ id }) => Boolean(id && PRODUCTS[id]));
}
const GOAL_TEXT = { muscle:'ganar masa muscular y mejorar tu fuerza',cut:'definirte y reducir grasa corporal manteniendo el músculo',performance:'mejorar tu rendimiento y energía en el entrenamiento',wellness:'optimizar tu bienestar general y salud diaria',recovery:'acelerar tu recuperación muscular y articular',sleep:'mejorar la calidad de tu sueño y descanso nocturno' };
const EXP_TEXT  = { beginner:'como principiante, priorizamos suplementos seguros, efectivos y fáciles de mantener',intermediate:'con tu nivel de experiencia, sumamos productos que amplifican tus resultados',advanced:'a tu nivel, el stack está optimizado para eficiencia y rendimiento máximo' };
const BUD_TEXT  = { basic:'manteniendo lo esencial sin desperdiciar',mid:'con una inversión equilibrada que maximiza el retorno',full:'con el stack completo para resultados óptimos' };
function generateReasoning({ goal, experience, budget, frequency }) {
  const freqExtra = frequency === 'high' ? ' Dado que entrenás 6 o más días por semana, incluimos soporte extra de recuperación.' : '';
  return `Basado en tu objetivo de ${GOAL_TEXT[goal]||''}, ${EXP_TEXT[experience]||''} y ${BUD_TEXT[budget]||''}.${freqExtra} Cada producto fue elegido por su efectividad comprobada y compatibilidad con tu perfil.`;
}
const GOAL_LABELS = { muscle:'Ganar músculo',cut:'Definición',performance:'Más rendimiento',wellness:'Salud general',recovery:'Recuperación',sleep:'Dormir mejor' };
const EXP_LABELS  = { beginner:'Principiante (< 1 año)',intermediate:'Intermedio (1–3 años)',advanced:'Avanzado (3+ años)' };
const BUD_LABELS  = { basic:'Esencial',mid:'Balanceado',full:'Completo' };
const FREQ_LABELS = { low:'2–3 días/semana',mid:'4–5 días/semana',high:'6+ días/semana' };

function buildGuidedWAMessage({ goal, experience, budget, frequency, stack }) {
  const lines = stack.map((item,i)=>{const p=PRODUCTS[item.id];return `${i+1}. ${p?.n||''} — ${p?.b||''}`;}).join('\n');
  return `Hola MacroForge! Usé el Stack Builder y me generó este stack personalizado:\n\n🎯 Objetivo: ${GOAL_LABELS[goal]}\n💪 Experiencia: ${EXP_LABELS[experience]}\n💰 Presupuesto: ${BUD_LABELS[budget]}\n📅 Frecuencia: ${FREQ_LABELS[frequency]}\n\n📦 Stack recomendado:\n${lines}\n\n¿Pueden confirmar disponibilidad y precio total del stack? ¡Muchas gracias!`;
}

// ── Manual stack helpers ──────────────────────────────────────
function extractPrice(priceStr) {
  const m = (priceStr || '').match(/([\d,]+)/);
  return m ? parseFloat(m[1].replace(/,/g, '')) || 0 : 0;
}

function formatTotal(num) {
  return num > 0 ? `₡${num.toLocaleString('es-CR')}` : null;
}

function buildManualWAMessage(stackIds) {
  const lines = stackIds.map((id, i) => {
    const p = PRODUCTS[id];
    if (!p) return null;
    const price = (p.p[0] || '').match(/(₡\s*[\d\s,.]+)/)?.[1]?.trim() || 'consultar precio';
    return `${i + 1}. ${p.n} — ${p.b} — ${price}`;
  }).filter(Boolean).join('\n');

  const total = stackIds.reduce((sum, id) => {
    const p = PRODUCTS[id];
    return sum + extractPrice(p?.p?.[0] || '');
  }, 0);
  const totalLine = total > 0 ? `\nTotal estimado: ~${formatTotal(total)} (+IVA)` : '';

  return `Hola MacroForge! Armé mi propio stack personalizado:\n\n📦 Mi stack:\n\n${lines}\n${totalLine}\n\n¿Me pueden confirmar disponibilidad y precio final para comprarlo?`;
}

// ── Sub-components ────────────────────────────────────────────
function OptionCard({ option, selected, onSelect }) {
  return (
    <button className={`ai-option${selected ? ' ai-option--selected' : ''}`} onClick={() => onSelect(option.id)} type="button" aria-pressed={selected}>
      <span className="ai-option-icon" aria-hidden="true">{option.icon}</span>
      <span className="ai-option-label">{option.label}</span>
      <span className="ai-option-desc">{option.desc}</span>
      {selected && <span className="ai-option-check" aria-hidden="true">✓</span>}
    </button>
  );
}

function ResultCard({ item, index }) {
  const p = PRODUCTS[item.id];
  if (!p) return null;
  const img    = resolveProductImage(p.u);
  const price  = (p.p?.[0] || '').match(/(₡\s*[\d\s,.]+)/)?.[1]?.trim() || '';
  const insight = PRODUCT_INSIGHTS[item.slug] || '';
  return (
    <div className="ai-product-card">
      <div className="ai-product-num">{index + 1}</div>
      <div className="ai-product-img">
        {img ? <img src={img} alt={p.n} loading="lazy" decoding="async" onError={e=>{e.currentTarget.style.display='none';}} />
              : <div className="ai-product-img-fallback">{(p.b || '?').charAt(0)}</div>}
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

// ── Main component ────────────────────────────────────────────
const INITIAL_SELECTIONS = { goal: null, experience: null, budget: null, frequency: null };

export default function AIStackBuilder() {
  // ── Shared state ──────────────────────────────────────────
  const [isOpen,     setIsOpen]     = useState(false);
  const [mode,       setMode]       = useState(null); // 'gateway'|'guided'|'manual'|'checkout'

  // ── Guided-flow state (Phase 2, unchanged) ────────────────
  const [stepIndex,  setStepIndex]  = useState(0);
  const [selections, setSelections] = useState(INITIAL_SELECTIONS);

  // ── Manual-builder state ──────────────────────────────────
  // ManualStackBuilder.jsx owns all internal step/search/filter state.
  // AIStackBuilder only owns the stack array (shared with checkout + persistence).
  const [manualStack, setManualStack] = useState([]);

  // ── Phase 4: Checkout + persistence state ─────────────────
  const [checkoutSource,  setCheckoutSource]  = useState(null);
  const [hasSaved,        setHasSaved]        = useState(() => hasSavedStack());

  // ── Phase 5: Restoration context for acceleration layer ───
  const [isRestored,      setIsRestored]      = useState(false);
  const [restoredAt,      setRestoredAt]      = useState(null);

  // Phase 6: Favorite stacks state
  const [favStacks, setFavStacks] = useState(() => getFavoriteStacks());

  // Re-read saved + favorites state when they change
  useEffect(() => {
    const handleSaved = () => setHasSaved(hasSavedStack());
    const handleFavs  = () => setFavStacks(getFavoriteStacks());
    window.addEventListener(STACK_SAVED_EVENT, handleSaved);
    window.addEventListener(FAVORITE_STACKS_EVENT, handleFavs);
    return () => {
      window.removeEventListener(STACK_SAVED_EVENT, handleSaved);
      window.removeEventListener(FAVORITE_STACKS_EVENT, handleFavs);
    };
  }, []);

  // ── Auto-advance analyzing → results ─────────────────────
  useEffect(() => {
    if (mode !== 'guided' || stepIndex !== 4) return;
    const t = setTimeout(() => setStepIndex(5), 1800);
    return () => clearTimeout(t);
  }, [mode, stepIndex]);

  // ── Guided-flow derived values ────────────────────────────
  const guidedStack = useMemo(() => {
    if (!selections.goal || !selections.experience || !selections.budget) return [];
    return generateStack(selections);
  }, [selections]);

  const reasoning = useMemo(() => {
    if (!selections.goal || !selections.experience || !selections.budget) return '';
    return generateReasoning(selections);
  }, [selections]);

  const guidedWaUrl = useMemo(() => {
    if (guidedStack.length === 0) return '#';
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(buildGuidedWAMessage({ ...selections, stack: guidedStack }))}`;
  }, [guidedStack, selections]);

  // All manual-builder UI state (search, filter, sort, steps) lives in
  // ManualStackBuilder.jsx. Only manualStack array remains here for
  // checkout → retention → persistence → analytics continuity.

  // ── Core actions ──────────────────────────────────────────
  function open() {
    setIsOpen(true);
    setMode('gateway');
    setStepIndex(0);
    setSelections(INITIAL_SELECTIONS);
    setManualStack([]);
    setCheckoutSource(null);
    setIsRestored(false);
    setRestoredAt(null);
    analytics.stackCTA('ai_builder_open', 'Stack Commerce Gateway');
    document.body.style.overflow = 'hidden';
  }

  /** Open the builder directly to checkout with a saved stack */
  function openSaved() {
    const data = getSavedStack();
    if (!data) { setHasSaved(false); return; }

    const savedAt = data.savedAt || null;
    setIsOpen(true);
    setCheckoutSource(data.type);
    setMode('checkout');
    setIsRestored(true);
    setRestoredAt(savedAt);
    document.body.style.overflow = 'hidden';

    if (data.type === 'guided' && data.selections) {
      setSelections(data.selections);
      setStepIndex(5);
    } else if (data.type === 'manual' && Array.isArray(data.productIds)) {
      setManualStack(data.productIds.filter(id => Boolean(PRODUCTS[id])));
    }
    analytics.stackStep('saved_stack_restored', { type: data.type });
    analytics.revenueAcceleration('stack_restored', { type: data.type, saved_at: savedAt });
  }

  function close() {
    // Track guided abandonment (not checkout — that's a serious moment)
    if (mode === 'guided' && stepIndex >= 1 && stepIndex < 5) {
      const stepNames = ['goal','experience','budget','frequency','analyzing'];
      analytics.stackStep('abandoned', { step_reached: stepNames[stepIndex]||'goal', step_index: stepIndex, goal: selections.goal, selections_made: Object.values(selections).filter(Boolean).length });
    }
    // Track manual abandonment
    if (mode === 'manual' && manualStack.length > 0) {
      analytics.manualStack('abandoned', { stack_size: manualStack.length });
    }
    setIsOpen(false);
    setMode(null);
    document.body.style.overflow = '';
  }

  /** Open a named favorite stack directly to checkout — quick reorder */
  function openFavorite(favId) {
    const fav = openFavoriteStack(favId); // marks as opened, increments count
    if (!fav) return;

    setIsOpen(true);
    setCheckoutSource(fav.type);
    setMode('checkout');
    setIsRestored(true);
    setRestoredAt(fav.savedAt);
    document.body.style.overflow = 'hidden';

    if (fav.type === 'guided' && fav.selections) {
      setSelections(fav.selections);
      setStepIndex(5);
    } else if (fav.type === 'manual' && Array.isArray(fav.productIds)) {
      setManualStack(fav.productIds.filter(id => Boolean(PRODUCTS[id])));
    }

    analytics.retentionEvent('favorite_stack_opened', {
      stack_name:  fav.name,
      tier:        fav.tier,
      open_count:  (fav.openCount || 0) + 1,
      source:      fav.type,
    });
  }

  /** Transition to the checkout layer from guided or manual */
  function enterCheckout(source) {
    setCheckoutSource(source);
    setMode('checkout');
    setIsRestored(false);  // fresh checkout — not a restoration
    setRestoredAt(null);
    const sz = source === 'guided' ? guidedStack.length : manualStack.length;
    analytics.checkoutLayer('viewed', { source, stack_size: sz });
  }

  /** Save the current stack to localStorage */
  function handleSaveStack() {
    const data = checkoutSource === 'guided'
      ? { type: 'guided', selections, productIds: guidedStack.map(i => i.id) }
      : { type: 'manual', productIds: [...manualStack] };
    saveStack(data);
    analytics.checkoutLayer('save', {
      source:     checkoutSource,
      stack_size: checkoutSource === 'guided' ? guidedStack.length : manualStack.length,
    });
    // hasSaved state updates via STACK_SAVED_EVENT listener
  }

  function goGateway() {
    setMode('gateway');
    setStepIndex(0);
    setSelections(INITIAL_SELECTIONS);
  }

  function selectGateway(choice) {
    analytics.gatewaySelect(choice);
    if (choice === 'guided') {
      setMode('guided');
    } else {
      setMode('manual');
    }
  }

  // ── Guided-flow actions ───────────────────────────────────
  function select(field, value) { setSelections(prev => ({ ...prev, [field]: value })); }

  function next() {
    const fields  = ['goal','experience','budget','frequency'];
    const current = fields[stepIndex];
    if (!selections[current]) return;
    analytics.stackStep('step_complete', { step: current, step_index: stepIndex, value: selections[current] });
    if (stepIndex < 3) {
      setStepIndex(i => i + 1);
    } else {
      setStepIndex(4);
      analytics.stackCTA('ai_builder_generate', `${selections.goal}|${selections.experience}|${selections.budget}`);
    }
  }

  function back() {
    if (stepIndex === 0) { goGateway(); return; }
    if (stepIndex > 0 && stepIndex < 4) setStepIndex(i => i - 1);
  }

  function restart() {
    analytics.stackStep('restarted', { goal: selections.goal, experience: selections.experience, budget: selections.budget });
    setStepIndex(0);
    setSelections(INITIAL_SELECTIONS);
  }

  function handleGuidedWA() {
    analytics.whatsappClick('ai_stack_builder', null, `${GOAL_LABELS[selections.goal]} stack`);
    analytics.stackStep('wa_clicked', { goal: selections.goal, experience: selections.experience, budget: selections.budget, frequency: selections.frequency, stack_size: guidedStack.length });
  }

  // ── Manual-builder actions ────────────────────────────────
  function addToStack(id) {
    if (manualStack.includes(id) || manualStack.length >= MAX_MANUAL) return;
    const p = PRODUCTS[id];
    analytics.manualStack('product_added', { item_id: String(id), item_name: p?.n, item_category: p?.c, stack_size: manualStack.length + 1 });
    setManualStack(prev => [...prev, id]);
  }

  function removeFromStack(id) {
    const p = PRODUCTS[id];
    analytics.manualStack('product_removed', { item_id: String(id), item_name: p?.n });
    setManualStack(prev => prev.filter(x => x !== id));
  }

  function handleManualWA() {
    analytics.manualStack('wa_clicked', { stack_size: manualStack.length, estimated_total: manualTotal });
    analytics.whatsappClick('manual_stack_builder', null, `Stack manual: ${manualStack.length} productos`);
  }

  // ── Guided-flow derived UI ────────────────────────────────
  const stepConfigs    = [{ field:'goal',options:GOALS,cols:2 },{ field:'experience',options:EXPERIENCES,cols:1 },{ field:'budget',options:BUDGETS,cols:1 },{ field:'frequency',options:FREQUENCIES,cols:1 }];
  const currentConfig  = mode === 'guided' ? stepConfigs[stepIndex] : null;
  const currentValue   = currentConfig ? selections[currentConfig.field] : null;
  const progressPct    = stepIndex >= 4 ? 100 : Math.round(((stepIndex + (currentValue ? 1 : 0)) / 4) * 100);


  return (
    <>
      {/* ── Trigger section — inline on home page ── */}
      <section className="ai-trigger-section">
        <div className="ai-trigger-eyebrow">
          <div className="ai-trigger-eyebrow-dot" aria-hidden="true" />
          Stack Builder · Exclusivo MacroForge
        </div>
        <h2 className="ai-trigger-title">
          Tu stack, <em>tu decisión.</em>
        </h2>
        <p className="ai-trigger-desc">
          Elegí vos o dejate guiar. En ambos casos, tu stack llega directo a WhatsApp
          con todo el detalle para cotizarlo al instante.
        </p>
        <button className="ai-trigger-btn" onClick={open} type="button">
          <span className="ai-trigger-btn-icon" aria-hidden="true">⚡</span>
          Armar mi stack
        </button>
        <div className="ai-trigger-meta">
          <div className="ai-trigger-meta-item"><span>✓</span> Manual o guiado</div>
          <div className="ai-trigger-meta-item"><span>✓</span> Sin registro</div>
          <div className="ai-trigger-meta-item"><span>✓</span> A WhatsApp en segundos</div>
        </div>

        {/* Favorite stacks — quick reorder for returning customers */}
        {favStacks.length > 0 && (
          <div className="ai-trigger-favorites">
            <div className="ai-trigger-favorites-label">Mis stacks favoritos</div>
            <div className="ai-trigger-favorites-list">
              {favStacks.slice(0, 3).map(fav => (
                <button
                  key={fav.id}
                  className="ai-trigger-favorite-btn"
                  onClick={() => openFavorite(fav.id)}
                  type="button"
                  aria-label={`Abrir ${fav.name}`}
                >
                  <span className="ai-trigger-favorite-name">{fav.name}</span>
                  <span className="ai-trigger-favorite-meta">
                    {fav.productIds?.length || 0} prod.
                    {fav.openCount > 0 ? ` · ${fav.openCount + 1}ª vez` : ''}
                  </span>
                  <span className="ai-trigger-favorite-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved stack restore — shown when user has a previously saved stack */}
        {hasSaved && (
          <div className="ai-trigger-restore">
            <button onClick={openSaved} type="button">
              <span>📦</span>
              <span>Tenés un stack guardado — <strong>Restaurar →</strong></span>
            </button>
          </div>
        )}
      </section>

      {/* ── Full-screen overlay ── */}
      {isOpen && (
        <div className="ai-overlay" role="dialog" aria-modal="true" aria-label="Stack Builder MacroForge">
          <div className="ai-modal">

            {/* ── Header ── */}
            <div className="ai-modal-header">
              <div className="ai-modal-brand">MACRO<span>FORGE</span></div>
              <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                {(mode === 'guided' || mode === 'manual') && (
                  <button className="sb-mode-back" onClick={goGateway} type="button">← Cambiar</button>
                )}
                {mode === 'checkout' && (
                  <button className="sb-mode-back" onClick={() => {
                    setMode(checkoutSource);
                    analytics.checkoutLayer('edit', { source: checkoutSource });
                  }} type="button">← Editar</button>
                )}
                <button className="ai-modal-close" onClick={close} aria-label="Cerrar" type="button">✕</button>
              </div>
            </div>

            {/* ── Progress bar — guided mode only ── */}
            {mode === 'guided' && stepIndex < 5 && (
              <div className="ai-progress">
                <div className="ai-progress-track">
                  <div className="ai-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="ai-progress-label">
                  {stepIndex < 4 ? `Paso ${stepIndex + 1} de 4 — ${STEP_LABELS[stepIndex]}` : 'Generando tu stack...'}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                CHECKOUT LAYER — Phase 4 Revenue Infrastructure
                ════════════════════════════════════════════ */}
            {mode === 'checkout' && checkoutSource && (
              <StackCheckoutLayer
                source={checkoutSource}
                guidedStack={guidedStack}
                manualProductIds={manualStack}
                guidedSelections={selections}
                isRestored={isRestored}
                restoredAt={restoredAt}
                onEdit={() => {
                  setMode(checkoutSource);
                  analytics.checkoutLayer('edit', { source: checkoutSource });
                }}
                onSave={handleSaveStack}
                onContinue={(sz, total) => {
                  analytics.checkoutLayer('continue', {
                    source:          checkoutSource,
                    stack_size:      sz,
                    estimated_total: total,
                  });
                }}
              />
            )}

            {/* ════════════════════════════════════════════
                GATEWAY — choose path
                ════════════════════════════════════════════ */}
            {mode === 'gateway' && (
              <div className="sb-gateway">
                <div className="sb-gateway-heading">¿Cómo querés armar tu stack?</div>
                <div className="sb-gateway-sub">Elegí el camino que mejor te representa.</div>
                <div className="sb-gateway-cards">

                  {/* Option 1 — Manual (advanced / high-intent) */}
                  <button className="sb-gateway-card sb-gateway-card--manual" onClick={() => selectGateway('manual')} type="button">
                    <div className="sb-gateway-card-icon">⚡</div>
                    <div className="sb-gateway-card-title">Ya sé lo que quiero</div>
                    <div className="sb-gateway-card-desc">
                      Elegí tus productos directamente y armá tu pedido exacto.
                      Ideal si ya tenés marcas favoritas.
                    </div>
                    <div className="sb-gateway-card-footer">
                      <div className="sb-gateway-card-tags">
                        <span className="sb-gateway-card-tag">Rápido</span>
                        <span className="sb-gateway-card-tag">Control total</span>
                        <span className="sb-gateway-card-tag">Avanzado</span>
                      </div>
                      <span className="sb-gateway-card-arrow">→</span>
                    </div>
                  </button>

                  {/* Option 2 — AI Guided (undecided / beginner) */}
                  <button className="sb-gateway-card sb-gateway-card--guided" onClick={() => selectGateway('guided')} type="button">
                    <div className="sb-gateway-card-icon">✨</div>
                    <div className="sb-gateway-card-title">Ayúdenme a armarlo</div>
                    <div className="sb-gateway-card-desc">
                      Respondé 4 preguntas y MacroForge te recomienda el stack
                      ideal según tu objetivo, experiencia y presupuesto.
                    </div>
                    <div className="sb-gateway-card-footer">
                      <div className="sb-gateway-card-tags">
                        <span className="sb-gateway-card-tag">Guiado</span>
                        <span className="sb-gateway-card-tag">Personalizado</span>
                        <span className="sb-gateway-card-tag">4 preguntas</span>
                      </div>
                      <span className="sb-gateway-card-arrow">→</span>
                    </div>
                  </button>

                </div>
                <div className="sb-gateway-note">
                  Más productos en tu stack = mejor contexto para cotizarte rápido.
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                MANUAL BUILDER — Phase 6.5 Upgrade
                Structured 3-step: Focus → Category → Products
                All 649 products accessible. No artificial limits.
                ════════════════════════════════════════════ */}
            {mode === 'manual' && (
              <ManualStackBuilder
                stack={manualStack}
                onAdd={addToStack}
                onRemove={removeFromStack}
                onCheckout={() => enterCheckout('manual')}
              />
            )}

            {/* ════════════════════════════════════════════
                GUIDED FLOW — Phase 2, structurally unchanged
                ════════════════════════════════════════════ */}

            {/* Question steps (0–3) */}
            {mode === 'guided' && stepIndex < 4 && currentConfig && (
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
                      <OptionCard key={opt.id} option={opt} selected={currentValue === opt.id} onSelect={val => select(currentConfig.field, val)} />
                    ))}
                  </div>
                </div>
                <div className="ai-nav">
                  <button className="ai-nav-back" onClick={back} type="button">← Atrás</button>
                  <button className="ai-nav-next" onClick={next} disabled={!currentValue} type="button">
                    {stepIndex < 3 ? 'Continuar →' : '⚡ Generar mi stack'}
                  </button>
                </div>
              </>
            )}

            {/* Analyzing state (step 4) */}
            {mode === 'guided' && stepIndex === 4 && (
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

            {/* Results (step 5) */}
            {mode === 'guided' && stepIndex === 5 && guidedStack.length > 0 && (
              <>
                <div className="ai-results-scroll">
                  <div className="ai-results">
                    <div className="ai-results-badge"><span>⚡</span> Stack personalizado · MacroForge</div>
                    <div className="ai-results-title">Tu stack para {GOAL_LABELS[selections.goal]}</div>
                    <div className="ai-results-reasoning">{reasoning}</div>
                    <div className="ai-product-list">
                      {guidedStack.map((item, i) => <ResultCard key={item.slug} item={item} index={i} />)}
                    </div>
                  </div>
                </div>
                <div className="ai-results-cta">
                  <div className="ai-results-cta-label">Tu stack está listo — revisá el resumen antes de confirmar</div>
                  <button className="ai-results-wa-btn" onClick={() => enterCheckout('guided')} type="button">
                    📋 Ver resumen y confirmar →
                  </button>
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
