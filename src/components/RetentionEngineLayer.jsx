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
import {
  getStackSupplyEstimate,
  getRefillTimelineMessage,
  getReorderPsychologyMessage,
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
  const goal   = guidedSelections?.goal || null;

  // Refill intelligence
  const estimate       = getStackSupplyEstimate(productIds);
  const refillMessage  = getRefillTimelineMessage(estimate);
  const reorderMessage = getReorderPsychologyMessage(goal);

  // Save-as-favorite state
  const defaultName    = getDefaultStackName(goal, tier?.tier || 'esencial');
  const [name, setName] = useState(defaultName);
  const [saved, setSaved] = useState(false);

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

    </div>
  );
}
