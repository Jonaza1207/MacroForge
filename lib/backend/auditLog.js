/**
 * MacroForge — Audit Logger
 *
 * Phase 9 — Vercel Backend Activation
 * SERVER-SIDE ONLY.
 *
 * Writes immutable audit events to Supabase automation_audit_log.
 * Every significant automation action is logged for:
 *   - Regulatory compliance (GDPR/LOPDP message history)
 *   - Debugging and operational visibility
 *   - Revenue attribution
 *   - Security incident investigation
 *
 * Audit log entries are NEVER deleted or updated.
 * They serve as the source of truth for automation operations.
 */

import { supabase } from './supabase.js';

/**
 * Write an audit event.
 * @param {object} params
 */
export async function writeAudit({
  eventType,
  queueId      = null,
  campaignId   = null,
  anonymousId  = null,
  provider     = null,
  payload      = {},
  ipHash       = null,
  cronRunId    = null,
}) {
  try {
    await supabase.from('automation_audit_log').insert({
      event_type:   eventType,
      queue_id:     queueId,
      campaign_id:  campaignId,
      anonymous_id: anonymousId,
      provider,
      payload,
      ip_hash:      ipHash,
      cron_run_id:  cronRunId,
    });
  } catch (err) {
    // Never fail the main flow because of audit log failure
    // But log to stderr for operational visibility
    console.error('[MacroForge Audit] Failed to write audit event:', eventType, err?.message);
  }
}

// ── Typed audit events ────────────────────────────────────────────

export const AuditEvents = {
  CRON_STARTED:              'cron_started',
  CRON_COMPLETED:            'cron_completed',
  CRON_FAILED:               'cron_failed',
  MESSAGE_SENT:              'message_sent',
  MESSAGE_FAILED:            'message_failed',
  MESSAGE_DEAD_LETTERED:     'message_dead_lettered',
  MESSAGE_SKIPPED:           'message_skipped',
  MESSAGE_RETRIED:           'message_retried',
  CONSENT_GRANTED:           'consent_granted',
  CONSENT_REVOKED:           'consent_revoked',
  STOP_RECEIVED:             'stop_received',
  WEBHOOK_RECEIVED:          'webhook_received',
  WEBHOOK_VERIFIED:          'webhook_verified',
  WEBHOOK_REJECTED:          'webhook_rejected',
  CIRCUIT_OPENED:            'circuit_opened',
  CIRCUIT_RECOVERED:         'circuit_recovered',
  FAILOVER_TRIGGERED:        'failover_triggered',
  CAMPAIGN_DISABLED:         'campaign_disabled',
  GLOBAL_KILL_SWITCH:        'global_kill_switch',
  PROFILE_SYNCED:            'profile_synced',
  QUEUE_SYNCED:              'queue_synced',
  ATTRIBUTION_RECORDED:      'attribution_recorded',
};

// ── Convenience wrappers ──────────────────────────────────────────

export function auditCronStart(cronRunId, eligibleCount) {
  return writeAudit({
    eventType:  AuditEvents.CRON_STARTED,
    cronRunId,
    payload:    { eligible_count: eligibleCount, started_at: new Date().toISOString() },
  });
}

export function auditCronComplete(cronRunId, results) {
  return writeAudit({
    eventType:  AuditEvents.CRON_COMPLETED,
    cronRunId,
    payload:    { ...results, completed_at: new Date().toISOString() },
  });
}

export function auditMessageSent(cronRunId, entry, result) {
  return writeAudit({
    eventType:   AuditEvents.MESSAGE_SENT,
    queueId:     entry.id,
    campaignId:  entry.campaign_id,
    anonymousId: entry.anonymous_id,
    provider:    result.provider,
    cronRunId,
    payload:     {
      provider_msg_id: result.messageId,
      latency_ms:      result.latencyMs,
      template_key:    entry.template_key,
    },
  });
}

export function auditMessageSkipped(cronRunId, entry, reason) {
  return writeAudit({
    eventType:   AuditEvents.MESSAGE_SKIPPED,
    queueId:     entry.id,
    campaignId:  entry.campaign_id,
    anonymousId: entry.anonymous_id,
    cronRunId,
    payload:     { reason, template_key: entry.template_key },
  });
}

export function auditConsentGranted(anonymousId, ipHash, source) {
  return writeAudit({
    eventType:   AuditEvents.CONSENT_GRANTED,
    anonymousId,
    ipHash,
    payload:     { source, granted_at: new Date().toISOString() },
  });
}

export function auditConsentRevoked(anonymousId, source) {
  return writeAudit({
    eventType:   AuditEvents.CONSENT_REVOKED,
    anonymousId,
    payload:     { source, revoked_at: new Date().toISOString() },
  });
}

export function auditStopReceived(anonymousId, provider) {
  return writeAudit({
    eventType:   AuditEvents.STOP_RECEIVED,
    anonymousId,
    provider,
    payload:     { received_at: new Date().toISOString() },
  });
}
