/**
 * MacroForge — Reactivation Center
 *
 * Phase 7 — CRM + Automated Reactivation Engine
 *
 * The "nervous system" of the lifecycle commerce engine rendered on the home page.
 * Synthesizes all behavioral signals into personalized reactivation cards.
 *
 * Renders NOTHING for new visitors — keeps the page clean and uncluttered.
 * Renders for returning users only, with the most relevant 1–2 signals.
 *
 * Signal priority (highest commercial value first):
 *   1. Refill reactivation (overdue > approaching)
 *   2. Abandoned checkout recovery
 *   3. VIP / premium recognition
 *   4. Reorder prompt (for frequent buyers)
 *
 * Psychology:
 *   - Recognized ≠ watched. The customer feels remembered, not tracked.
 *   - Helpful ≠ pushy. Each card offers value, not pressure.
 *   - Premium tone throughout — calm, confident, never desperate.
 *
 * ── Future automation (Phase 8) ──────────────────────────────────
 * TODO: When WhatsApp API is active, the "Consultar" buttons here will
 *   also trigger a server-side notification to the seller:
 *   POST /api/crm/reactivation-trigger
 *   Body: { anonymous_id, signal_type, journey_state, stack_name }
 *   This lets the seller proactively reach out before the customer even
 *   clicks WhatsApp — turning passive reactivation into active CRM.
 */

import { useEffect, useState } from 'react';
import { analytics }                  from '../lib/analytics';
import { buildWaUrl }                 from '../lib/whatsapp';
import { getReactivationProfile }     from '../lib/reactivationEngine';
import { getJourneyProfile }          from '../lib/customerJourney';
import { computeLocalLoyaltyLevel }   from '../lib/loyaltyStatus';
import { deriveOwnReferralCode, copyReferralLink } from '../lib/referralCode';
import { getLeadScore }               from '../lib/segmentation';
import CustomerJourneyStatus          from './CustomerJourneyStatus';
import LoyaltyBadge                   from './LoyaltyBadge';
import '../styles/reactivationCenter.css';
import '../styles/loyalty.css';

export default function ReactivationCenter() {
  const [dismissed,   setDismissed]   = useState(false);
  const [codeCopied,  setCodeCopied]  = useState(false);

  // Compute all reactivation signals (pure reads, no side effects)
  const profile    = getReactivationProfile();
  const journey    = getJourneyProfile();
  const loyalLevel = computeLocalLoyaltyLevel();
  const leadScore  = getLeadScore();
  const refCode    = deriveOwnReferralCode();

  // Show loyalty card: returning users with engagement (Builder+ level)
  const showLoyaltyCard = profile.isReturning && loyalLevel.rank >= 2;
  // Show referral card: committed+ users who've shown purchase intent
  const showReferralCard = profile.isReturning && leadScore >= 25 && refCode;

  async function handleCopyCode() {
    const success = await copyReferralLink();
    if (success) {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
      analytics.communityEvent('referral_link_copied', { level: loyalLevel.id });
    }
  }

  // Fire analytics on mount
  useEffect(() => {
    if (!profile.hasContent) return;

    analytics.journeyEvent('journey_state_detected', {
      state:       journey.stateId,
      is_returning: profile.isReturning,
      visit_count:  profile.visitCount,
      has_refill:   Boolean(profile.refill),
      has_vip:      Boolean(profile.vip),
      has_abandonment: Boolean(profile.abandonment),
    });

    if (profile.vip) {
      analytics.journeyEvent('vip_recognition_shown', { level: profile.vip.level });
    }
    if (profile.refill) {
      analytics.journeyEvent('refill_signal_shown', { urgency: profile.refill.urgency, count: profile.refill.count });
    }
    if (profile.abandonment) {
      analytics.journeyEvent('reactivation_prompt_shown', { type: profile.abandonment.type });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render for new visitors or after dismissal
  if (!profile.hasContent || dismissed) return null;

  // Build WA URLs for each signal
  const refillWaUrl = profile.refill?.productNames?.[0]
    ? buildWaUrl('refillReminder', { productName: profile.refill.productNames[0] })
    : buildWaUrl('loyaltyFollowup');

  const abandonedWaUrl = profile.abandonment?.stackName
    ? buildWaUrl('abandonedStack', { stackName: profile.abandonment.stackName, tierLabel: profile.abandonment.tierLabel })
    : buildWaUrl('loyaltyFollowup');

  const vipWaUrl = profile.vip
    ? buildWaUrl('vipReorder', { stackName: profile.abandonment?.stackName || '' })
    : buildWaUrl('loyaltyFollowup');

  return (
    <section className="rce-section" aria-label="Tu actividad en MacroForge">

      {/* Header — journey status + dismiss */}
      <div className="rce-header">
        {journey.stateId && <CustomerJourneyStatus stateId={journey.stateId} />}
        <button
          className="rce-dismiss"
          onClick={() => setDismissed(true)}
          type="button"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      {/* ── CARD 1: Refill reactivation (highest recurring revenue value) ── */}
      {profile.refill && (
        <div className={`rce-card rce-card--refill${profile.refill.urgency === 'overdue' ? ' rce-card--overdue' : ''}`}>
          <span className="rce-card-icon" aria-hidden="true">
            {profile.refill.urgency === 'overdue' ? '⚠️' : '🔄'}
          </span>
          <div className="rce-card-body">
            <div className="rce-card-title">
              {profile.refill.urgency === 'overdue'
                ? 'Ya es momento de reponer tu stack'
                : 'Pronto: momento de reabastecer'}
            </div>
            <div className="rce-card-copy">{profile.refill.copy}</div>
            <a
              className="rce-card-cta"
              href={refillWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.journeyEvent('recovery_cta_clicked', { type: 'refill', urgency: profile.refill.urgency })}
            >
              {profile.refill.cta}
            </a>
          </div>
        </div>
      )}

      {/* ── CARD 2: Abandoned checkout recovery (conversion signal) ── */}
      {profile.abandonment && profile.abandonment.type === 'checkout_abandoned' && (
        <div className="rce-card rce-card--recovery">
          <span className="rce-card-icon" aria-hidden="true">↩️</span>
          <div className="rce-card-body">
            <div className="rce-card-title">Continuá donde lo dejaste</div>
            <div className="rce-card-copy">{profile.abandonment.copy}</div>
            <a
              className="rce-card-cta"
              href={abandonedWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.journeyEvent('recovery_cta_clicked', { type: 'abandoned_checkout', stack_name: profile.abandonment.stackName })}
            >
              Retomar pedido →
            </a>
          </div>
        </div>
      )}

      {/* ── CARD 3: VIP recognition (loyalty signal, no pressure) ── */}
      {profile.vip && !profile.refill && (
        <div className="rce-card rce-card--vip">
          <span className="rce-card-icon" aria-hidden="true">{profile.vip.icon}</span>
          <div className="rce-card-body">
            <div className="rce-card-title">{profile.vip.label}</div>
            <div className="rce-card-copy">{profile.vip.message}</div>
            {profile.vip.level === 'vip' && (
              <a
                className="rce-card-cta"
                href={vipWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.journeyEvent('recovery_cta_clicked', { type: 'vip_reorder' })}
              >
                Hacer pedido VIP →
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── CARD 4: Saved stack (if no other higher-priority signal) ── */}
      {profile.abandonment?.type === 'has_saved_stack' && !profile.refill && !profile.vip && (
        <div className="rce-card rce-card--reorder">
          <span className="rce-card-icon" aria-hidden="true">📦</span>
          <div className="rce-card-body">
            <div className="rce-card-title">Tu stack sigue guardado</div>
            <div className="rce-card-copy">{profile.abandonment.copy}</div>
            <a
              className="rce-card-cta"
              href={abandonedWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.journeyEvent('recovery_cta_clicked', { type: 'saved_stack' })}
            >
              Consultar disponibilidad →
            </a>
          </div>
        </div>
      )}

      {/* ── Phase 13: Loyalty card — for returning users at Builder+ level ── */}
      {showLoyaltyCard && (
        <LoyaltyBadge variant="card" progressPct={40} />
      )}

      {/* ── Phase 13: Referral card — for users with purchase intent ── */}
      {showReferralCard && (
        <div className="ref-card">
          <div className="ref-card-header">
            <span className="ref-card-icon" aria-hidden="true">🎁</span>
            <div className="ref-card-body">
              <div className="ref-card-title">Compartí MacroForge y ganás puntos</div>
              <div className="ref-card-desc">
                Tu referido obtiene un descuento. Vos ganás {loyalLevel.rank >= 3 ? '10%' : '7%'} de bonificación.
              </div>
            </div>
          </div>
          <div className="ref-code-row">
            <span className="ref-code">{refCode}</span>
            <button
              className={`ref-copy-btn${codeCopied ? ' ref-copy-btn--copied' : ''}`}
              onClick={handleCopyCode}
              type="button"
            >
              {codeCopied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="ref-discount-note">
            Compartí el enlace. Tu referido puede aplicar este código en su próxima compra.
          </div>
        </div>
      )}

    </section>
  );
}
