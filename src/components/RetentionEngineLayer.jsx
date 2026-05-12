/**
 * MacroForge — Retention Engine Layer
 *
 * Phase 6 (original) + Phase 11 (subscription upgrade)
 *
 * Renders after the trust signals in the checkout layer.
 * Four jobs:
 *   1. Show how long the stack lasts (refill intelligence)
 *   2. Plant the reorder seed (reorder psychology)
 *   3. Capture the repeat buyer (save-as-favorite)
 *   4. Drive recurring revenue (subscription CTA — Phase 11)
 *
 * Phase 11 upgrade:
 *   The "Próximamente" subscription teaser is now a real CTA.
 *   When subscriptions are configured, it shows "📅 Suscribirme y ahorrar"
 *   with the recommended interval and discount.
 *   Falls back gracefully to WhatsApp if subscription backend is unavailable.
 *
 * Security: No secrets. No PII. localStorage + API calls only.
 */

import { useState, useEffect } from 'react';
import { PRODUCTS }            from '../data/products';
import { analytics }           from '../lib/analytics';
import { buildWaUrl }          from '../lib/whatsapp';
import {
  getStackSupplyEstimate,
  getRefillTimelineMessage,
  getReorderPsychologyMessage,
} from '../lib/refillIntelligence';
import {
  saveFavoriteStack,
  getDefaultStackName,
} from '../lib/favoriteStacks';
import {
  initiateSubscriptionCheckout,
  getRecommendedSubscriptionInterval,
  getSubscriptionDiscount,
  CHECKOUT_ERRORS,
} from '../lib/subscriptionCheckout';
import '../styles/retentionEngine.css';

export default function RetentionEngineLayer({
  source,
  productIds,
  guidedSelections,
  tier,
}) {
  const goal   = guidedSelections?.goal || null;

  // Refill intelligence
  const estimate       = getStackSupplyEstimate(productIds);
  const refillMessage  = getRefillTimelineMessage(estimate);
  const reorderMessage = getReorderPsychologyMessage(goal);

  // Subscription recommendation
  const recommendedInterval = getRecommendedSubscriptionInterval(estimate?.min);
  const discountPct         = getSubscriptionDiscount(tier?.tier || 'esencial');

  // Save-as-favorite state
  const defaultName    = getDefaultStackName(goal, tier?.tier || 'esencial');
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);

  // Subscription state
  const [subState, setSubState] = useState('idle');  // 'idle'|'loading'|'error'
  const [subError, setSubError] = useState(null);

  // WhatsApp fallback for subscription
  const subWaUrl = buildWaUrl('subscriptionOffer', {
    stackName:     defaultName,
    discount:      `${discountPct}%`,
    intervalLabel: recommendedInterval.label,
  });

  useEffect(() => {
    analytics.retentionEvent('retention_layer_viewed', {
      has_refill_estimate: Boolean(estimate),
      refill_min:          estimate?.min ?? null,
      goal,
      tier:                tier?.tier ?? 'unknown',
      product_count:       productIds.length,
    });
    // Track subscription CTA viewed
    analytics.subscriptionEvent('subscription_cta_viewed', {
      stack_tier:    tier?.tier || 'esencial',
      interval_days: recommendedInterval.days,
      discount_pct:  discountPct,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    if (!name.trim()) return;
    saveFavoriteStack(name.trim(), {
      type:       source,
      selections: guidedSelections || null,
      productIds: [...productIds],
      tier:       tier?.tier || 'esencial',
    });
    setSaved(true);
    analytics.retentionEvent('save_favorite_completed', {
      stack_name: name.trim(), source, product_count: productIds.length, tier: tier?.tier ?? 'esencial', goal,
    });
  }

  async function handleSubscribe() {
    setSubState('loading');
    setSubError(null);
    analytics.subscriptionEvent('subscription_cta_clicked', {
      stack_tier:    tier?.tier || 'esencial',
      interval_days: recommendedInterval.days,
      discount_pct:  discountPct,
    });

    try {
      const { checkout_url, subscription } = await initiateSubscriptionCheckout({
        productIds,
        products:          PRODUCTS,
        source,
        tier,
        guidedSelections,
        estimatedTotal:    0,
        supplyEstimateDays: estimate?.min,
        intervalPreference: recommendedInterval.days,
      });

      analytics.subscriptionEvent('subscription_checkout_created', {
        stack_tier:    tier?.tier || 'esencial',
        interval_days: subscription?.interval_days || recommendedInterval.days,
        discount_pct:  subscription?.discount_pct || discountPct,
      });

      window.location.href = checkout_url;

    } catch (err) {
      setSubState('error');
      setSubError('La suscripción no está disponible aún. Consultá por WhatsApp para configurarla.');
      analytics.subscriptionEvent('subscription_checkout_failed', { reason: err.code || err.message });
    }
  }

  return (
    <div className="re-section">

      {/* 1. Refill timeline */}
      {refillMessage && (
        <div className="re-refill">
          <span className="re-refill-icon" aria-hidden="true">⏱️</span>
          <div className="re-refill-body">
            <div className="re-refill-main">{refillMessage}</div>
            <div className="re-refill-sub">Planificá tu próximo pedido para mantener la constancia.</div>
          </div>
        </div>
      )}

      {/* 2. Reorder psychology */}
      <div className="re-psychology">{reorderMessage}</div>

      {/* 3. Save as favorite */}
      <div className="re-save-section">
        <div className="re-save-label">
          {saved ? 'Stack guardado en favoritos' : 'Guardá para repetir fácilmente'}
        </div>
        {saved ? (
          <div className="re-save-confirmed">
            <span className="re-save-confirmed-check">✓</span>
            Guardado como "{name.trim()}"
          </div>
        ) : (
          <div className="re-save-form">
            <input
              className="re-save-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre de tu stack..."
              maxLength={40}
              aria-label="Nombre del stack favorito"
            />
            <button className="re-save-btn" onClick={handleSave} disabled={!name.trim()} type="button">
              💾 Guardar
            </button>
          </div>
        )}
      </div>

      {/* 4. Subscription CTA (Phase 11) */}
      <div className="re-subscription-section">
        <div className="re-subscription-header">
          <span className="re-subscription-icon" aria-hidden="true">📅</span>
          <div className="re-subscription-copy">
            <div className="re-subscription-title">
              Suscripción personalizada · {discountPct}% off
            </div>
            <div className="re-subscription-desc">
              Recibí tu stack cada {recommendedInterval.label} con descuento preferencial.
              Lo coordinamos directamente por WhatsApp antes de activar.
            </div>
          </div>
        </div>

        {subState === 'error' && subError && (
          <div className="re-sub-error" role="alert">{subError}</div>
        )}

        <div className="re-subscription-actions">
          <button
            className={`re-sub-btn${subState === 'loading' ? ' re-sub-btn--loading' : ''}`}
            onClick={handleSubscribe}
            disabled={subState === 'loading'}
            type="button"
          >
            {subState === 'loading'
              ? <><span className="re-sub-spinner" aria-hidden="true" /> Procesando...</>
              : `📅 Iniciar suscripción personalizada`
            }
          </button>
          {(subState === 'error') && (
            <a
              className="re-sub-wa-link"
              href={subWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.subscriptionEvent('subscription_wa_fallback_clicked')}
            >
              💬 Consultar suscripción por WhatsApp →
            </a>
          )}
        </div>
      </div>

    </div>
  );
}
