/**
 * MacroForge — Retention Engine Layer
 *
 * Phase 6 — Retention + Recurring Revenue Engine
 *
 * Renders after the trust signals in the checkout layer.
 * Three jobs:
 *   1. Plant the reorder seed — show how long the stack lasts
 *   2. Capture the repeat buyer — let them save as a named favorite
 *   3. Tease the future — subscription / monthly auto-refill
 *
 * Psychology:
 *   A customer who saves their stack as "Mi Stack Músculo" is a customer
 *   who has named their relationship with MacroForge. They're no longer
 *   a one-time buyer — they're a repeat customer with a named purchase.
 *   This is the highest-ROI retention action available without a backend.
 *
 * Fire analytics on mount for retention intelligence layer integration.
 *
 * ── Security ─────────────────────────────────────────────────────
 * No secrets. No payment credentials. No PII.
 * All persistence is localStorage. 100% frontend-safe.
 */

import { useState, useEffect } from 'react';
import { analytics } from '../lib/analytics';
import {
  getStackSupplyEstimate,
  getRefillTimelineMessage,
  getReorderPsychologyMessage,
  getSubscriptionTeaser,
} from '../lib/refillIntelligence';
import {
  saveFavoriteStack,
  getDefaultStackName,
} from '../lib/favoriteStacks';
import '../styles/retentionEngine.css';

export default function RetentionEngineLayer({
  source,
  productIds,
  guidedSelections,
  tier,
}) {
  const goal    = guidedSelections?.goal || null;
  const budget  = guidedSelections?.budget || null;

  // Compute refill intelligence
  const estimate        = getStackSupplyEstimate(productIds);
  const refillMessage   = getRefillTimelineMessage(estimate);
  const reorderMessage  = getReorderPsychologyMessage(goal);
  const subscriptionInfo = getSubscriptionTeaser(tier?.tier || 'esencial');

  // Save-as-favorite form state
  const defaultName    = getDefaultStackName(goal, tier?.tier || 'esencial');
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);

  // Fire analytics on mount
  useEffect(() => {
    analytics.retentionEvent('retention_layer_viewed', {
      has_refill_estimate: Boolean(estimate),
      refill_min:          estimate?.min ?? null,
      goal,
      tier:                tier?.tier ?? 'unknown',
      product_count:       productIds.length,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    if (!name.trim()) return;
    const stackData = {
      type:       source,
      selections: guidedSelections || null,
      productIds: [...productIds],
      tier:       tier?.tier || 'esencial',
    };
    saveFavoriteStack(name.trim(), stackData);
    setSaved(true);
    analytics.retentionEvent('save_favorite_completed', {
      stack_name:    name.trim(),
      source,
      product_count: productIds.length,
      tier:          tier?.tier ?? 'esencial',
      goal,
    });
  }

  return (
    <div className="re-section">

      {/* 1. Refill timeline — "Tu stack dura ~30 días" */}
      {refillMessage && (
        <div className="re-refill">
          <span className="re-refill-icon" aria-hidden="true">⏱️</span>
          <div className="re-refill-body">
            <div className="re-refill-main">{refillMessage}</div>
            <div className="re-refill-sub">
              Planificá tu próximo pedido para no interrumpir el progreso.
            </div>
          </div>
        </div>
      )}

      {/* 2. Reorder psychology — goal-aware motivation */}
      <div className="re-psychology">
        {reorderMessage}
      </div>

      {/* 3. Save as favorite — the retention hook */}
      <div className="re-save-section">
        <div className="re-save-label">
          {saved ? 'Stack guardado en favoritos' : 'Guardá para repetir fácilmente'}
        </div>
        {saved ? (
          <div className="re-save-confirmed">
            <span className="re-save-confirmed-check">✓</span>
            Guardado como "{name.trim()}" — lo encontrás en la sección de stacks.
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
            <button
              className="re-save-btn"
              onClick={handleSave}
              disabled={!name.trim()}
              type="button"
              aria-label="Guardar stack como favorito"
            >
              💾 Guardar
            </button>
          </div>
        )}
      </div>

      {/* 4. Subscription teaser — plants the monthly refill seed */}
      <div className="re-subscription-teaser">
        <span className="re-subscription-icon" aria-hidden="true">📅</span>
        <div className="re-subscription-body">
          <div className="re-subscription-title">{subscriptionInfo.title}</div>
          <div className="re-subscription-desc">{subscriptionInfo.body}</div>
        </div>
      </div>

    </div>
  );
}
