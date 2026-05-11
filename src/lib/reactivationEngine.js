/**
 * MacroForge — Reactivation Engine
 *
 * Phase 7 — CRM + Automated Reactivation Engine
 * Pure logic module. No React. No DOM. No side effects.
 *
 * This is the "nervous system" of the lifecycle commerce engine.
 * Synthesizes all behavioral signals into actionable reactivation data:
 *
 *   - Abandoned checkout detection (visited checkout, didn't continue)
 *   - Refill reactivation (supplement cycles running low)
 *   - VIP customer recognition (premium tier, high engagement)
 *   - Reorder readiness signals (repeat buyer patterns)
 *   - WhatsApp lifecycle message selection
 *
 * All data is local. Zero backend. Zero PII.
 *
 * ── Future automation (Phase 8) ──────────────────────────────────
 * TODO: WhatsApp lifecycle automation via 360dialog or Twilio
 *   Trigger: 'refill_ready' state detected on return visit
 *   Action:  POST /api/whatsapp/send-refill-reminder
 *     Body:  { anonymous_id, product_names, days_since_purchase }
 *   Requires: WhatsApp Business API key (server-side only)
 *
 * TODO: Abandoned checkout recovery via WhatsApp (75% of cycle elapsed)
 *   Trigger: 'recovering' state + stateAge > 24 hours
 *   Action:  POST /api/whatsapp/send-recovery-message
 *     Body:  { anonymous_id, stack_name, tier_label }
 *   Requires: WhatsApp Business API + Supabase (server-side only)
 *
 * TODO: VIP customer upgrade messaging
 *   Trigger: 'premium' state detected on 5th+ visit
 *   Action:  POST /api/whatsapp/send-vip-welcome
 *   Requires: WhatsApp Business API (server-side only)
 *
 * Future Supabase tables:
 *   lifecycle_events(id, user_id, event_type, state, triggered_at)
 *   reactivation_campaigns(id, campaign_type, segment, sent_at, converted)
 *   wa_automation_queue(id, user_id, message_type, scheduled_at, status)
 */

import { analytics }                     from './analytics';
import { getCustomerState }              from './customerState';
import { getFavoriteStacks, hasFavoriteStacks } from './favoriteStacks';
import { hasSavedStack, getSavedStack }  from './stackPersistence';
import { getRefillCandidates }           from './retention';
import { getLeadScore, getLeadTier }     from './segmentation';
import { PRODUCTS }                      from '../data/products';

// ── Abandonment signal ────────────────────────────────────────────

/**
 * Detect an abandoned checkout — user built a stack, viewed the summary,
 * but did not send to WhatsApp.
 *
 * Returns details about the abandoned stack for recovery messaging.
 */
export function getAbandonmentSignal() {
  const hasFavs  = hasFavoriteStacks();
  const hasSaved = hasSavedStack();
  if (!hasFavs && !hasSaved) return null;

  // Read event buffer for checkout behavior
  const events     = analytics.getBuffer();
  const viewed     = events.some(e => e.n === 'checkout_layer' && e.p?.action === 'viewed');
  const continued  = events.some(e => e.n === 'checkout_layer' && e.p?.action === 'continue');

  const favs = getFavoriteStacks();
  const saved = getSavedStack();

  // Prioritize the most prominent stack for messaging
  const topFav  = favs.length > 0 ? favs[0] : null;
  const stackName = topFav?.name || null;
  const tier      = topFav?.tier || saved?.type || 'esencial';

  const TIER_LABELS = { premium: 'Stack Premium', completo: 'Stack Completo', balanceado: 'Stack Balanceado', esencial: 'Stack' };
  const tierLabel = TIER_LABELS[tier] || 'Stack';

  if (viewed && !continued) {
    return {
      type:       'checkout_abandoned',
      stackName,
      tierLabel,
      severity:   'high',
      copy:       stackName
        ? `Tu "${stackName}" sigue listo. Retomá donde lo dejaste.`
        : `Tu ${tierLabel} sigue listo para confirmar en segundos.`,
    };
  }

  if (hasFavs || hasSaved) {
    return {
      type:       'has_saved_stack',
      stackName,
      tierLabel,
      severity:   'medium',
      copy:       stackName
        ? `"${stackName}" sigue guardado y activo.`
        : `Tu ${tierLabel} guardado sigue esperándote.`,
    };
  }

  return null;
}

// ── Refill reactivation ───────────────────────────────────────────

/**
 * Detect refill reactivation opportunity.
 * Returns a reactivation signal when supplements are running low.
 */
export function getRefillReactivation() {
  const candidates = getRefillCandidates();
  if (candidates.length === 0) return null;

  const overdue    = candidates.filter(c => c.urgency === 'overdue');
  const approaching = candidates.filter(c => c.urgency === 'approaching');

  // Build product names for copy
  const productNames = candidates
    .slice(0, 2)
    .map(c => PRODUCTS[c.productId]?.n)
    .filter(Boolean);

  if (overdue.length > 0) {
    return {
      urgency:     'overdue',
      count:       candidates.length,
      productNames,
      copy:        productNames.length > 0
        ? `${productNames[0]} y otros suplementos de tu stack pueden ya haberse terminado.`
        : 'Uno o más suplementos de tu stack pueden ya haberse terminado.',
      cta:         'Reabastecer ahora →',
    };
  }

  return {
    urgency:     'approaching',
    count:       candidates.length,
    productNames,
    copy:        productNames.length > 0
      ? `Ya casi es momento de reponer tu ${productNames[0]}. Constancia = resultados.`
      : 'Ya casi es momento de reabastecer tu stack. Mantené la constancia.',
    cta:         'Consultar reabastecimiento →',
  };
}

// ── VIP recognition ───────────────────────────────────────────────

/**
 * Detect VIP / premium customer signals.
 * Returns recognition data for emotional loyalty reinforcement.
 */
export function getVipRecognition() {
  const score    = getLeadScore();
  const tier     = getLeadTier();
  const favs     = getFavoriteStacks();
  const state    = getCustomerState();

  const hasPremiumFav  = favs.some(f => f.tier === 'premium');
  const hasFrequentFav = favs.some(f => (f.openCount || 0) >= 2);
  const isHighScore    = score >= 70;
  const isVeryLoyal    = state.visitCount >= 8;

  if (!hasPremiumFav && !hasFrequentFav && !isHighScore && !isVeryLoyal) return null;

  if (isHighScore && hasPremiumFav) {
    return {
      level:       'vip',
      icon:        '💎',
      label:       'Cliente VIP MacroForge',
      message:     'Reconocemos tu compromiso con el rendimiento. Sos parte de los clientes más activos.',
      leadScore:   score,
      crmTag:      'vip_customer',
    };
  }

  if (isVeryLoyal || hasFrequentFav) {
    return {
      level:       'frequent',
      icon:        '⭐',
      label:       'Cliente frecuente MacroForge',
      message:     'Tu continuidad hace la diferencia. Seguís en el lugar correcto.',
      leadScore:   score,
      crmTag:      'frequent_buyer',
    };
  }

  return {
    level:       'engaged',
    icon:        '🎯',
    label:       'Comprador de alta intención',
    message:     'Tu perfil indica alta seriedad. Estamos listos para ayudarte cuando quieras.',
    leadScore:   score,
    crmTag:      'hot_lead',
  };
}

// ── Reorder prompt ────────────────────────────────────────────────

/**
 * Generate a reorder prompt for returning customers with purchase history.
 * Returns null for first-time or low-engagement visitors.
 */
export function getReorderPrompt() {
  const state = getCustomerState();
  const favs  = getFavoriteStacks();

  if (!state.isReturning || (!state.hasWAIntent && favs.length === 0)) return null;

  const topFav = favs.length > 0 ? favs[0] : null;

  return {
    stackName:  topFav?.name || null,
    openCount:  topFav?.openCount || 0,
    copy:       topFav?.name
      ? `¿Listo para tu próximo pedido de "${topFav.name}"?`
      : '¿Listo para tu próximo pedido?',
    cta:        'Continuar →',
  };
}

// ── WhatsApp lifecycle message builders ──────────────────────────

/**
 * Lifecycle WhatsApp message templates for manual and future automated use.
 *
 * TODO (Phase 8): These messages will be triggered automatically via
 * WhatsApp Business API when lifecycle events are detected:
 *   - 'refill_ready': fires at 75% of supply cycle
 *   - 'checkout_abandoned': fires 24–48 hours after checkout view
 *   - 'vip_recognition': fires on 5th+ visit with premium tier
 *
 * Implementation will use 360dialog (LATAM-compliant) or Twilio.
 * All sensitive credentials stay server-side. Never frontend.
 */
export const LIFECYCLE_WA_TEMPLATES = {

  abandonedStack: ({ stackName = '', tierLabel = 'stack' } = {}) =>
    `Hola MacroForge! Tenía mi ${tierLabel} guardado${stackName ? ` — "${stackName}"` : ''} y quiero retomarlo. ¿Pueden ayudarme a cerrarlo?`,

  refillReminder: ({ productName = '', daysElapsed = '' } = {}) =>
    `Hola MacroForge! ${daysElapsed ? `Pasaron ${daysElapsed} días y` : ''} creo que es momento de reabastecer${productName ? ` mi ${productName}` : ' mis suplementos'}. ¿Están disponibles?`,

  vipReorder: ({ stackName = '' } = {}) =>
    `Hola MacroForge! Soy cliente frecuente y quiero hacer mi próximo pedido${stackName ? ` — el stack "${stackName}"` : ''}. ¿Me pueden ayudar con disponibilidad y precio?`,

  loyaltyFollowup: () =>
    `Hola MacroForge! Quiero mantener mi rutina de suplementación. ¿Pueden ayudarme con mi próximo reabastecimiento?`,

  premiumReactivation: ({ stackName = '', tierLabel = 'Stack Premium' } = {}) =>
    `Hola MacroForge! Como cliente premium, quiero retomar mi ${tierLabel}${stackName ? ` — "${stackName}"` : ''}. ¿Sigue disponible todo?`,
};

/**
 * Full reactivation profile — unified output for the ReactivationCenter.
 * Computes all signals once and returns a structured object.
 */
export function getReactivationProfile() {
  const state      = getCustomerState();
  const abandonment = getAbandonmentSignal();
  const refill     = getRefillReactivation();
  const vip        = getVipRecognition();
  const reorder    = getReorderPrompt();

  // Determine if there's anything meaningful to show
  const hasContent = state.isReturning || Boolean(abandonment || refill || vip);

  return {
    // Customer context
    visitCount:      state.visitCount,
    isReturning:     state.isReturning,
    segment:         state.segment,

    // Priority signals (most → least commercial value)
    refill,         // recurring revenue signal
    vip,            // loyalty signal
    abandonment,    // recovery signal
    reorder,        // repeat purchase signal

    // Render decision
    hasContent,
  };
}
