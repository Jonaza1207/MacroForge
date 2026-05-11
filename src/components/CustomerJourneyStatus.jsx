/**
 * MacroForge — Customer Journey Status Badge
 *
 * Phase 7 — CRM + Automated Reactivation Engine
 * Reusable micro-component. Renders a subtle status badge
 * reflecting the customer's current journey state.
 *
 * Displays nothing for new visitors or when no state is detected.
 * Premium, calm, non-invasive. Maximum 2 lines.
 *
 * Usage:
 *   <CustomerJourneyStatus stateId="premium" />
 *   <CustomerJourneyStatus /> // auto-derives state
 */

import { getJourneyProfile } from '../lib/customerJourney';
import '../styles/reactivationCenter.css';

export default function CustomerJourneyStatus({ stateId }) {
  const { stateId: derivedId, meta: derivedMeta } = getJourneyProfile();
  const activeId   = stateId || derivedId;
  const activeMeta = stateId
    ? ({ id: stateId, icon: '📍', label: stateId, desc: '', color: '#888' })
    : derivedMeta;

  if (!activeId || !activeMeta) return null;

  return (
    <div className="cjs-badge">
      <span className="cjs-icon" aria-hidden="true">{activeMeta.icon}</span>
      <div className="cjs-body">
        <div className="cjs-label" style={{ color: activeMeta.color }}>
          {activeMeta.label}
        </div>
        {activeMeta.desc && (
          <div className="cjs-desc">{activeMeta.desc}</div>
        )}
      </div>
    </div>
  );
}
