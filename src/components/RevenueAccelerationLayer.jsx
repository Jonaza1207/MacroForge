/**
 * MacroForge — Revenue Acceleration Layer
 *
 * Phase 5 — High-Conversion Revenue Acceleration
 *
 * Renders between the product list and the total in the checkout layer.
 * Provides smart stack intelligence that:
 *   1. Elevates perceived value (Stack Premium > basic product list)
 *   2. Shows what the stack covers (reduces hesitation, builds confidence)
 *   3. Shows completeness (progress psychology — desire to fill the gap)
 *   4. Suggests the one missing pillar (soft educational upsell)
 *   5. Reinforces value (intelligent goal-aware copy)
 *   6. Recognizes returning users (retention psychology)
 *
 * Zero backend. Zero secrets. Zero PII.
 * Fires analytics on mount for intelligence layer integration.
 */

import { useEffect } from 'react';
import { analytics } from '../lib/analytics';
import {
  getStackTier,
  getStackCoverage,
  getCompletenessScore,
  getSuggestion,
  getValueMessage,
  getReturnCopy,
} from '../lib/checkoutPsychology';
import '../styles/revenueAcceleration.css';

export default function RevenueAccelerationLayer({
  productIds,
  guidedSelections,
  isRestored,
  restoredAt,
}) {
  const goal   = guidedSelections?.goal   || null;
  const budget = guidedSelections?.budget || null;
  const count  = productIds.length;

  // Compute all intelligence values
  const tier       = getStackTier(count, budget);
  const coverage   = getStackCoverage(productIds);
  const score      = goal ? getCompletenessScore(coverage, goal) : null;
  const suggestion = goal && score !== null && score < 100 ? getSuggestion(coverage, goal) : null;
  const valueMsg   = getValueMessage(goal, tier.tier, score ?? 80);
  const returnCopy = isRestored ? getReturnCopy(restoredAt) : null;

  // Fire analytics on mount — powers tier + completeness intelligence
  useEffect(() => {
    analytics.revenueAcceleration('layer_viewed', {
      tier:       tier.tier,
      score:      score ?? -1,
      coverage:   coverage.length,
      suggestion: Boolean(suggestion),
      source:     goal ? 'guided' : 'manual',
    });
    if (suggestion) {
      analytics.revenueAcceleration('suggestion_shown', { goal, coverage_count: coverage.length });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Restored stack recognition — for returning users */}
      {returnCopy && (
        <div className="ra-restored-notice">
          <span className="ra-restored-icon">📦</span>
          {returnCopy}
        </div>
      )}

      <div className="ra-container">

        {/* Stack tier — elevated perceived value */}
        <div className="ra-tier">
          <div className="ra-tier-icon" aria-hidden="true">{tier.icon}</div>
          <div className="ra-tier-body">
            <div className="ra-tier-label" style={{ color: tier.color }}>{tier.label}</div>
            <div className="ra-tier-desc">{tier.description}</div>
          </div>
        </div>

        {/* Completeness bar — progress psychology (guided stacks with known goal only) */}
        {score !== null && (
          <div className="ra-completeness">
            <div className="ra-completeness-header">
              <div className="ra-completeness-label">
                {score >= 100 ? 'Stack optimizado para tu objetivo' : 'Completitud del stack'}
              </div>
              <div className="ra-completeness-pct">{score}%</div>
            </div>
            <div className="ra-bar-track">
              <div
                className="ra-bar-fill"
                style={{
                  width: `${score}%`,
                  background: score >= 100 ? '#00C896' : score >= 66 ? tier.color : '#888',
                }}
              />
            </div>
          </div>
        )}

        {/* Coverage pillars — what the stack delivers */}
        {coverage.length > 0 && (
          <div className="ra-coverage">
            <div className="ra-coverage-label">Tu stack cubre</div>
            <div className="ra-coverage-pillars">
              {coverage.map(pillar => (
                <div key={pillar} className="ra-pillar">
                  <span className="ra-pillar-check">✓</span>
                  {pillar}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Smart suggestion — educational soft upsell */}
        {suggestion && (
          <div className="ra-suggestion">
            <span className="ra-suggestion-icon" aria-hidden="true">💡</span>
            <div className="ra-suggestion-text">{suggestion}</div>
          </div>
        )}

        {/* Value reinforcement message */}
        <div className="ra-value-msg">{valueMsg}</div>

      </div>
    </>
  );
}
