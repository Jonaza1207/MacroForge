/**
 * MacroForge — Loyalty Badge
 *
 * Phase 13 — Scale + Media + Community Ecosystem
 *
 * Compact loyalty level badge. Reusable across the app.
 * Renders only for returning users (new visitors see nothing).
 *
 * Variants:
 *   'badge'   — inline pill (used in ReactivationCenter header)
 *   'card'    — expanded card with progress + perks
 *
 * Psychology:
 *   - Earned feel: "Comprometido" sounds like something you deserved
 *   - Progress visible: shows next level milestone
 *   - Premium aesthetic: no confetti, no cheap animations
 *   - Non-invasive: doesn't demand attention, rewards noticing it
 */

import { useMemo, useState } from 'react';
import {
  computeLocalLoyaltyLevel,
  getNextLevelInfo,
  getLevelProgressMessage,
  trackLoyaltyBadgeShown,
  LOYALTY_LEVELS,
} from '../lib/loyaltyStatus';
import { getCustomerState } from '../lib/customerState';
import '../styles/loyalty.css';

export default function LoyaltyBadge({ variant = 'badge', progressPct }) {
  const state = getCustomerState();

  // Only show for returning users with engagement
  if (!state.isReturning) return null;

  const level    = useMemo(() => computeLocalLoyaltyLevel(), []);
  const nextLevel = getNextLevelInfo(level.id);

  // Track on first render
  useMemo(() => { trackLoyaltyBadgeShown(level); }, []); // eslint-disable-line

  if (variant === 'badge') {
    return (
      <div className="loy-badge" aria-label={`Nivel: ${level.label}`}>
        <span className="loy-badge-icon" aria-hidden="true">{level.icon}</span>
        <div className="loy-badge-body">
          <div className="loy-badge-level" style={{ color: level.color }}>{level.label}</div>
          {nextLevel && <div className="loy-badge-sub">→ {nextLevel.label}</div>}
        </div>
      </div>
    );
  }

  // Card variant — expanded with progress + perks
  const pct = progressPct ?? 45;  // estimated if no real points

  return (
    <div className="loy-card">
      <div className="loy-card-header">
        <span className="loy-card-icon" aria-hidden="true">{level.icon}</span>
        <div className="loy-card-meta">
          <div className="loy-card-level" style={{ color: level.color }}>{level.label}</div>
          <div className="loy-card-desc">{level.description}</div>
        </div>
      </div>

      {nextLevel && (
        <div className="loy-progress">
          <div className="loy-progress-label">
            <span>{getLevelProgressMessage(level, nextLevel)}</span>
            <span>→ {nextLevel.label}</span>
          </div>
          <div className="loy-progress-track">
            <div
              className="loy-progress-fill"
              style={{ width: `${pct}%`, background: level.color }}
            />
          </div>
        </div>
      )}

      {level.perks?.length > 0 && (
        <div className="loy-perks">
          {level.perks.map(perk => (
            <span key={perk} className="loy-perk">{perk}</span>
          ))}
        </div>
      )}
    </div>
  );
}
