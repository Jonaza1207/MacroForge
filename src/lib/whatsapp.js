/**
 * MacroForge — WhatsApp Sales Operating System
 *
 * ALL WhatsApp message construction routes through this module.
 * Templates are consultative, warm, and premium — not salesy.
 *
 * Tone: intelligent · warm · human · confident · never pushy
 * Goal: the seller should instantly understand goal, stage, budget, and intent.
 *
 * ── Usage ────────────────────────────────────────────────────────
 *   import { buildWaUrl, WA_TEMPLATES } from '../lib/whatsapp';
 *
 *   const url = buildWaUrl('product', { name: 'ISO 100', brand: 'Dymatize' });
 *   const url = buildWaUrl('stackConsult', { goal: 'ganar músculo' });
 *   const url = buildWaUrl('_raw', { text: 'Hola, tengo una pregunta.' });
 *
 * ── To change the WA number ──────────────────────────────────────
 *   Update WA_NUMBER in src/data/catalog.js — all URLs update automatically.
 */

import { WA_NUMBER } from '../data/catalog';

const BASE = `https://wa.me/${WA_NUMBER}?text=`;

/**
 * All message templates.
 * Each template receives a context object and returns a ready-to-send string.
 * Keep natural, human, and concise — WhatsApp conversations are personal.
 *
 * Seller intelligence: templates include subtle context signals so the seller
 * instantly understands: goal · budget stage · seriousness · likely objections.
 */
export const WA_TEMPLATES = {

  // ── Discovery / General ─────────────────────────────────────────

  /** Float button — visitor hasn't looked at anything specific yet */
  float: () =>
    'Hola MacroForge! Estoy revisando el catálogo y me gustaría orientación. ¿Pueden ayudarme según mi objetivo?',

  /** General welcome — first contact, no product context */
  welcome: () =>
    'Hola MacroForge! Quiero saber más sobre sus suplementos. ¿Pueden ayudarme a elegir lo correcto para mi objetivo?',

  // ── Product intent ──────────────────────────────────────────────

  /** Product modal or card CTA — high-intent, specific product */
  product: ({ name = '', brand = '' } = {}) =>
    `Hola MacroForge! Me interesa ${name}${brand ? ` de ${brand}` : ''}. ¿Está disponible y cuánto costaría el envío a mi zona?`,

  /** Product unavailable — recovery flow */
  unavailable: ({ name = '' } = {}) =>
    `Hola MacroForge! Estaba viendo ${name || 'un producto'} pero no parece estar disponible. ¿Tienen algo similar o saben cuándo vuelve?`,

  // ── Stack & Consultation ────────────────────────────────────────

  /** Stack consultation — user clicked a goal or stack CTA */
  stackConsult: ({ goal = '' } = {}) =>
    `Hola MacroForge! Estoy buscando un stack para ${goal || 'mi objetivo'}. ¿Qué combinación recomendarían según mi objetivo y presupuesto?`,

  /** Beginner consultation — first supplement, overwhelmed */
  beginnerConsult: () =>
    'Hola MacroForge! Soy nuevo en suplementos y no sé por dónde empezar. ¿Pueden guiarme hacia algo seguro y efectivo para comenzar?',

  /** Comparison consultation — customer is weighing options */
  comparisonConsult: ({ optionA = '', optionB = '' } = {}) =>
    `Hola MacroForge! Estoy entre ${optionA || 'dos opciones'} y ${optionB || 'otra'}. ¿Pueden ayudarme a decidir cuál es mejor para mi caso?`,

  /** Budget-based consultation — cost-sensitive buyer */
  budgetConsult: ({ goal = '', budget = '' } = {}) =>
    `Hola MacroForge! Quiero suplementarme para ${goal || 'mi objetivo'} pero quiero optimizar el presupuesto${budget ? ` (aprox. ${budget})` : ''}. ¿Qué recomiendan?`,

  /** Advanced performance consultation — experienced athlete */
  advancedConsult: ({ goal = '' } = {}) =>
    `Hola MacroForge! Busco optimizar mi protocolo para ${goal || 'rendimiento avanzado'}. Tengo experiencia con suplementos — ¿pueden ayudarme con algo más específico?`,

  /** Recovery consultation — injury, overtraining, sleep */
  recoveryConsult: () =>
    'Hola MacroForge! Estoy buscando suplementos enfocados en recuperación muscular y descanso. ¿Qué recomendarían para ese objetivo específico?',

  /** Wellness consultation — health-first, not gym-first */
  wellnessConsult: () =>
    'Hola MacroForge! Busco suplementos para salud general — no necesariamente para gym. ¿Qué recomendarían para bienestar diario?',

  /** Favorites consultation — user has saved products */
  favoritesConsult: ({ count = 0 } = {}) =>
    `Hola MacroForge! Tengo ${count > 1 ? `${count} productos guardados` : 'un producto guardado'} en mis favoritos. ¿Me pueden ayudar con disponibilidad, precios y si tiene sentido combinarlos?`,

  // ── Commerce & Operations ───────────────────────────────────────

  /** Shipping inquiry */
  shipping: ({ name = '' } = {}) =>
    `Hola MacroForge! ¿Cuánto costaría el envío${name ? ` para ${name}` : ''}? Estoy en [tu zona].`,

  /** Payment methods inquiry */
  payment: () =>
    'Hola MacroForge! ¿Cuáles son las formas de pago disponibles? ¿Aceptan SINPE Móvil y transferencia?',

  /** Out-of-stock recovery */
  outOfStock: ({ name = '' } = {}) =>
    `Hola MacroForge! Noté que ${name || 'el producto que busco'} no está disponible actualmente. ¿Tienen alternativa o saben cuándo vuelve?`,

  // ── Retention & Reorder ─────────────────────────────────────────

  /** Reorder — returning customer, same product */
  reorder: ({ name = '' } = {}) =>
    `Hola MacroForge! Se me está terminando ${name || 'mi suplemento'}. Quiero reponerlo — ¿está disponible y cuánto demoran?`,

  /** Refill response — returning with refill intent */
  refillResponse: ({ name = '', category = '' } = {}) =>
    `Hola MacroForge! Ya casi termino mi ${name || category || 'suplemento'}. ¿Pueden ayudarme a reponerlo o recomendarme si debo cambiar algo?`,

  /** "Same again?" reorder flow */
  sameAgain: ({ name = '' } = {}) =>
    `Hola MacroForge! Quiero pedir lo mismo que la vez anterior${name ? ` — ${name}` : ''}. ¿Está disponible?`,

  // ── Search miss ─────────────────────────────────────────────────

  /** Search empty — product not found in catalog */
  searchMiss: ({ query = '' } = {}) =>
    `Hola MacroForge! Busqué "${query}" en el catálogo y no apareció. ¿Lo tienen disponible o pueden conseguirlo?`,

  // ── Raw override ─────────────────────────────────────────────────

  /** Escape hatch — for one-off messages */
  _raw: ({ text = '' } = {}) => text,
};

/**
 * Build a WhatsApp URL for a given template key + context.
 *
 * @param {keyof WA_TEMPLATES} key — template name
 * @param {object}             ctx — context variables for the template
 * @returns {string}               — full wa.me URL ready to open
 */
export function buildWaUrl(key, ctx = {}) {
  const tpl  = WA_TEMPLATES[key];
  const text = tpl ? tpl(ctx) : WA_TEMPLATES.welcome();
  return `${BASE}${encodeURIComponent(text)}`;
}

/**
 * Seller intelligence context — prepend invisible context to any message
 * so the seller immediately knows the buyer's stage.
 * Use sparingly — only for high-value flows where it significantly helps close.
 *
 * @param {string} baseMessage — the message body
 * @param {object} context     — { segment, visitCount, hasFavorites, consultationStyle }
 * @returns {string} — message with seller context appended
 */
export function buildSellerContextMessage(baseMessage, context = {}) {
  if (!context || !context.consultationStyle) return baseMessage;
  const { segment, visitCount, hasFavorites, consultationStyle } = context;

  const signals = [];
  if (visitCount > 5)    signals.push('cliente recurrente');
  if (hasFavorites)      signals.push('tiene productos guardados');
  if (consultationStyle === 'reorder') signals.push('posible recompra');
  if (consultationStyle === 'stack')   signals.push('exploró stacks');

  if (signals.length === 0) return baseMessage;

  // Append as a subtle note — invisible to the customer in the message preview
  // but visible to the seller once the full message loads
  return `${baseMessage}\n\n(Contexto: ${signals.join(' · ')})`;
}
