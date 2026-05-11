/**
 * MacroForge — Checkout Psychology Engine
 *
 * Phase 5 — Revenue Acceleration Layer
 * Pure logic module — no React, no DOM, no side effects.
 * All functions are deterministic given the same inputs.
 *
 * Responsibilities:
 *   - Stack tier classification (Esencial → Premium)
 *   - Stack coverage analysis (what pillars the stack covers)
 *   - Completeness scoring (% of goal-relevant pillars covered)
 *   - Smart suggestion copy (soft upsell when stack is incomplete)
 *   - Value reinforcement messaging (intelligent, goal-aware)
 *   - Save/return recognition copy (retention psychology)
 *   - Premium WhatsApp message builder (hot-buyer framing)
 *
 * Conversion psychology applied:
 *   - Progress completion: a partial score creates desire to complete
 *   - Social proof via pillar labels: "Tu stack cubre proteína + fuerza"
 *   - Soft scarcity on suggestion: educational, not pushy
 *   - Premium label elevation: "Stack Premium" > "Stack Balanceado" > "Stack Esencial"
 *   - Hot buyer signaling in WA: "quiero cerrar el pedido hoy" ≠ "tengo una pregunta"
 *
 * ── Future Shopify integration (Phase 6) ─────────────────────────
 * TODO: POST /api/orders/create (Vercel Edge Function)
 *   Map productIds to Shopify variant IDs, create draft order,
 *   return checkout_url. Replace WA button with "Comprar ahora".
 *   Requires: Shopify Admin API key (server-side only, never frontend).
 *
 * TODO: POST /api/subscriptions/create
 *   Create Shopify Selling Plan for refill cycles (e.g., 30-day whey).
 *   Enables "Suscribirse y ahorrar X%" recurring orders.
 *
 * TODO: Customer segmentation tags
 *   SEGMENT_TAGS[tier] → Shopify customer tag for CRM segmentation.
 */

import { PRODUCTS } from '../data/products';
import { parseCRCPrice, formatCRC, normalizePriceDisplay } from './priceFormatter';

// ── Category → Benefit Pillar map ────────────────────────────────
// Maps a product's category to a human-readable benefit pillar.
// Pillars are the "promise" language customers respond to.
const CAT_TO_PILLAR = {
  'Proteínas Whey':         'Proteína y crecimiento',
  'Proteínas Isoladas':     'Proteína y crecimiento',
  'Proteínas de Carne':     'Proteína y crecimiento',
  'Proteínas Veganas':      'Proteína y crecimiento',
  'Gainers de Masa':        'Proteína y crecimiento',
  'Creatinas':              'Fuerza y rendimiento',
  'Vasodilatadores / Pump': 'Fuerza y rendimiento',
  'Pre-Entrenamientos':     'Energía y enfoque',
  'Bebidas Energéticas':    'Energía y enfoque',
  'Glutamina':              'Recuperación muscular',
  'BCAA':                   'Recuperación muscular',
  'Aminoácidos Esenciales': 'Recuperación muscular',
  'Magnesio':               'Descanso y recuperación',
  'Sueño y Relajación':     'Descanso y recuperación',
  'Quemadores de Grasa':    'Reducción de grasa',
  'Control Metabólico':     'Reducción de grasa',
  'Omega y Grasas Saludables': 'Salud cardiovascular',
  'Vitaminas Esenciales':   'Nutrición y salud',
  'Multivitamínicos':       'Nutrición y salud',
  'Colágeno y Belleza':     'Salud articular y piel',
  'Articulaciones':         'Salud articular y piel',
  'Probióticos':            'Salud digestiva',
  'Electrolitos':           'Hidratación y rendimiento',
  'Snacks Proteicos':       'Proteína y crecimiento',
  'Aceites Esenciales Individuales': 'Bienestar natural',
  'Mezclas doTERRA':        'Bienestar natural',
  'Bienestar Interno doTERRA': 'Nutrición y salud',
  'Aromaterapia Emocional': 'Bienestar natural',
};

// ── Goal → required pillars ───────────────────────────────────────
// Defines what a "complete" stack looks like per goal.
// Completeness = covered required pillars / total required pillars.
const GOAL_REQUIRED_PILLARS = {
  muscle:      ['Proteína y crecimiento', 'Fuerza y rendimiento', 'Recuperación muscular'],
  cut:         ['Proteína y crecimiento', 'Reducción de grasa',   'Salud cardiovascular'],
  performance: ['Energía y enfoque',      'Fuerza y rendimiento',  'Proteína y crecimiento'],
  wellness:    ['Nutrición y salud',      'Salud cardiovascular',  'Descanso y recuperación'],
  recovery:    ['Recuperación muscular',  'Descanso y recuperación', 'Salud articular y piel'],
  sleep:       ['Descanso y recuperación', 'Salud cardiovascular'],
};

// ── Suggestion copy per goal × missing pillar ─────────────────────
// Only shown when a required pillar is absent. Educational, never pushy.
const SUGGESTIONS = {
  muscle: {
    'Proteína y crecimiento':  'Agregar proteína whey es el paso más importante para ganar músculo.',
    'Fuerza y rendimiento':    'La creatina potenciaría significativamente tu fuerza y volumen.',
    'Recuperación muscular':   'Agregar Glutamina o BCAAs optimizaría tu recuperación post-entreno.',
  },
  cut: {
    'Proteína y crecimiento':  'Mantener proteína alta es clave para no perder músculo al definir.',
    'Reducción de grasa':      'L-Carnitina o CLA complementarían tu plan de definición eficientemente.',
    'Salud cardiovascular':    'Omega-3 reduce inflamación y apoya la salud cardiovascular en definición.',
  },
  performance: {
    'Energía y enfoque':       'Un pre-entrenamiento elevaría notablemente tu rendimiento.',
    'Fuerza y rendimiento':    'La creatina es el suplemento con mayor evidencia para rendimiento atlético.',
    'Proteína y crecimiento':  'Proteína post-entreno acelera la recuperación y el crecimiento muscular.',
  },
  wellness: {
    'Nutrición y salud':       'Un multivitamínico cubre los micronutrientes que la dieta no siempre da.',
    'Salud cardiovascular':    'Omega-3 es uno de los suplementos más recomendados para salud general.',
    'Descanso y recuperación': 'El magnesio mejora la calidad del sueño y reduce el estrés.',
  },
  recovery: {
    'Recuperación muscular':   'Glutamina acelera la recuperación y refuerza el sistema inmune.',
    'Descanso y recuperación': 'El magnesio o ZMA mejoran el descanso nocturno y la recuperación.',
    'Salud articular y piel':  'El colágeno protege las articulaciones bajo carga frecuente.',
  },
  sleep: {
    'Descanso y recuperación': 'Melatonina + magnesio es la combinación más efectiva para mejorar el sueño.',
    'Salud cardiovascular':    'Omega-3 tiene propiedades antiinflamatorias que apoyan el descanso.',
  },
};

// ── Stack tier system ─────────────────────────────────────────────

/**
 * Compute the stack tier based on product count and budget preference.
 * Returns a tier object with label, icon, color, and description.
 */
export function getStackTier(productCount, budget) {
  if (budget === 'full' || productCount >= 5) {
    return {
      tier:        'premium',
      label:       'Stack Premium',
      icon:        '💎',
      color:       '#D4A843',
      description: 'Selección completa y optimizada para resultados avanzados.',
      shopifyTag:  'stack_premium', // TODO: Shopify customer tag
    };
  }
  if (budget === 'mid' || productCount >= 3) {
    return {
      tier:        'completo',
      label:       'Stack Completo',
      icon:        '⚡',
      color:       '#E3001E',
      description: 'Buen balance de producto y precio para resultados sólidos.',
      shopifyTag:  'stack_completo',
    };
  }
  if (productCount === 2) {
    return {
      tier:        'balanceado',
      label:       'Stack Balanceado',
      icon:        '✓',
      color:       '#00C896',
      description: 'Selección esencial con los productos más importantes.',
      shopifyTag:  'stack_balanceado',
    };
  }
  return {
    tier:        'esencial',
    label:       'Stack Esencial',
    icon:        '→',
    color:       '#888888',
    description: 'Un punto de partida sólido. Podés expandirlo cuando estés listo.',
    shopifyTag:  'stack_esencial',
  };
}

// ── Stack coverage analysis ───────────────────────────────────────

/**
 * Returns the unique benefit pillars covered by the stack's products.
 * Used to show "Tu stack cubre: Proteína · Fuerza · Recuperación"
 *
 * @param {string[]} productIds — array of product IDs
 * @returns {string[]} — unique pillar labels
 */
export function getStackCoverage(productIds) {
  const pillars = new Set();
  for (const id of productIds) {
    const p = PRODUCTS[id];
    if (!p) continue;
    const pillar = CAT_TO_PILLAR[p.c];
    if (pillar) pillars.add(pillar);
  }
  return [...pillars];
}

// ── Completeness scoring ──────────────────────────────────────────

/**
 * Returns a completeness score (0–100) based on how many required
 * pillars for the given goal are covered by the stack.
 *
 * @param {string[]} coverage — result of getStackCoverage()
 * @param {string}   goal     — 'muscle'|'cut'|'performance'|'wellness'|'recovery'|'sleep'
 * @returns {number}          — 0 to 100 (integer)
 */
export function getCompletenessScore(coverage, goal) {
  const required = GOAL_REQUIRED_PILLARS[goal];
  if (!required || required.length === 0) return 100;
  const coveredSet = new Set(coverage);
  const covered = required.filter(p => coveredSet.has(p)).length;
  return Math.round((covered / required.length) * 100);
}

// ── Smart suggestion ──────────────────────────────────────────────

/**
 * Returns a soft upsell suggestion string when the stack is incomplete,
 * or null when the stack is already complete for the goal.
 * Educational in tone — never pushy.
 *
 * @param {string[]} coverage — result of getStackCoverage()
 * @param {string}   goal     — goal identifier
 * @returns {string|null}
 */
export function getSuggestion(coverage, goal) {
  const required  = GOAL_REQUIRED_PILLARS[goal];
  if (!required) return null;
  const coveredSet = new Set(coverage);
  const missing = required.find(p => !coveredSet.has(p));
  if (!missing) return null;
  return SUGGESTIONS[goal]?.[missing] || null;
}

// ── Value reinforcement message ───────────────────────────────────

/**
 * Returns a dynamic value reinforcement message based on tier + completeness.
 * Designed to reduce hesitation and confirm the customer's good judgment.
 */
export function getValueMessage(goal, tier, score) {
  if (tier === 'premium' && score >= 90) {
    return `Tu stack está completamente optimizado para ${GOAL_LABELS[goal] || 'tu objetivo'}. Relación rendimiento/inversión: excelente.`;
  }
  if (tier === 'completo' && score >= 66) {
    return `Muy buena selección. Tu stack tiene una sólida relación precio-resultado para ${GOAL_LABELS[goal] || 'tu objetivo'}.`;
  }
  if (tier === 'balanceado') {
    return `Buen punto de partida. Cubrís lo esencial — podés expandir el stack cuando estés listo.`;
  }
  return `Tu selección está lista para confirmar. Podés ajustar el stack en cualquier momento.`;
}

const GOAL_LABELS = {
  muscle: 'ganar músculo', cut: 'definición', performance: 'rendimiento',
  wellness: 'bienestar general', recovery: 'recuperación', sleep: 'mejorar el sueño',
};

// ── Save/return copy ──────────────────────────────────────────────

/**
 * Returns a recognition message for users who restore a saved stack.
 * Warm, premium, non-invasive.
 */
export function getReturnCopy(savedAt) {
  if (!savedAt) return null;
  const hoursSince = Math.floor((Date.now() - savedAt) / 3600000);
  if (hoursSince < 1)   return 'Tu stack está listo — exactamente donde lo dejaste.';
  if (hoursSince < 24)  return 'Tu selección premium sigue esperándote.';
  if (hoursSince < 72)  return 'Tu stack guardado sigue activo y listo para confirmar.';
  return 'Retomás donde quedaste. Tu stack está listo para confirmar.';
}

// ── Premium WhatsApp message ──────────────────────────────────────

/**
 * Builds the hot-buyer WhatsApp message.
 * Key psychological upgrades over Phase 4:
 *   - Stack tier label in the profile ("Stack Premium")
 *   - Coverage pillars ("Cubre: Proteína · Fuerza · Recuperación")
 *   - Closing phrase: "¿Confirman disponibilidad para cerrar el pedido hoy?"
 *
 * The seller reads this and instantly knows: THIS IS A SERIOUS BUYER.
 * Close in one message. No back-and-forth needed to establish intent.
 */
export function buildPremiumWAMessage({ source, productIds, total, guidedSelections, tierLabel, coverage }) {
  const lines = productIds.map((id, i) => {
    const p = PRODUCTS[id];
    if (!p) return null;
    const price = normalizePriceDisplay(p.p[0], 'consultar precio');
    return `${i + 1}. ${p.n} — ${p.b} — ${price}`;
  }).filter(Boolean).join('\n');

  const totalLine  = total > 0 ? `\nTotal estimado: ~${formatCRC(total)} (+IVA)` : '';
  const coverLine  = coverage?.length > 0 ? `\nCubre: ${coverage.slice(0, 3).join(' · ')}` : '';

  const GOAL_LABELS_WA = {
    muscle:'Ganar músculo', cut:'Definición', performance:'Más rendimiento',
    wellness:'Salud general', recovery:'Recuperación', sleep:'Dormir mejor',
  };
  const EXP_LABELS_WA  = { beginner:'Principiante', intermediate:'Intermedio', advanced:'Avanzado' };

  if (source === 'guided' && guidedSelections?.goal) {
    const { goal, experience } = guidedSelections;
    return `Hola MacroForge! 🎯

Armé mi ${tierLabel || 'stack'} y quiero cerrar el pedido.

📋 Mi perfil:
• Objetivo: ${GOAL_LABELS_WA[goal] || goal}
• Experiencia: ${EXP_LABELS_WA[experience] || experience}
• Nivel: ${tierLabel || 'Stack personalizado'}

📦 Stack (${productIds.length} producto${productIds.length !== 1 ? 's' : ''}):
${lines}
${totalLine}${coverLine}

¿Confirman disponibilidad para cerrar el pedido hoy?`;
  }

  return `Hola MacroForge! 🎯

Armé mi ${tierLabel || 'stack personalizado'} y quiero cerrar el pedido.

📦 Stack (${productIds.length} producto${productIds.length !== 1 ? 's' : ''}):
${lines}
${totalLine}${coverLine}

¿Confirman disponibilidad para cerrar el pedido hoy?`;
}
