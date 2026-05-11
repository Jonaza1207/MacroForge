/**
 * MacroForge — Campaign Processor
 *
 * Phase 9 — Vercel Backend Activation
 * SERVER-SIDE ONLY.
 *
 * Core automation processing logic.
 * Runs every 2 hours via Vercel Cron → /api/automation/process
 *
 * Processing flow for each queue entry:
 *   1. Check global kill switch
 *   2. Check campaign enabled + daily caps
 *   3. Enforce send window (09:00–18:00 CRC by default)
 *   4. Validate consent
 *   5. Resolve phone number (from Supabase)
 *   6. Check per-customer cooldown
 *   7. Check idempotency (prevent double sends)
 *   8. Check provider circuit breaker
 *   9. Mark as processing (optimistic lock)
 *  10. Build template payload
 *  11. Send via provider adapter
 *  12. Record delivery result
 *  13. Update queue status
 *  14. Write audit log
 *  15. Update revenue attribution metadata
 */

import { supabase }                    from './supabase.js';
import { getProviderAdapter, getBackupProviderAdapter } from './providerAdapters/index.js';
import { getCircuitState, recordCircuitSuccess, recordCircuitFailure, isCircuitAllowing } from './circuitBreaker.js';
import { scheduleRetry, moveToDeadLetter }               from './retryStrategy.js';
import { writeAudit, AuditEvents, auditMessageSent, auditMessageSkipped } from './auditLog.js';

const SEND_WINDOW_TZ    = 'America/Costa_Rica';
const SEND_WINDOW_START = 9;   // 09:00 CRC
const SEND_WINDOW_END   = 18;  // 18:00 CRC
const BATCH_SIZE        = 20;  // process up to 20 intents per cron run

// ── Main processor ────────────────────────────────────────────────

/**
 * Process a batch of pending automation queue entries.
 * Called by /api/automation/process on each cron invocation.
 */
export async function processBatch(cronRunId) {
  const results = { processed: 0, delivered: 0, skipped: 0, failed: 0, errors: [] };

  // 1. Check global kill switch
  const globalEnabled = await getGlobalSetting('automation_enabled');
  if (globalEnabled !== 'true') {
    await writeAudit({ eventType: AuditEvents.GLOBAL_KILL_SWITCH, cronRunId });
    return { ...results, skipped: -1, reason: 'Global automation disabled' };
  }

  // 2. Check send window
  if (!isWithinSendWindow()) {
    return { ...results, skipped: -1, reason: 'Outside send window' };
  }

  // 3. Fetch eligible pending entries (priority order)
  const now = new Date().toISOString();
  const { data: entries } = await supabase
    .from('automation_queue')
    .eq('status', 'pending')
    .lte('eligible_after', now)
    .gt('expires_at', now)
    .order('priority', { ascending: true })
    .limit(BATCH_SIZE)
    .select('*');

  if (!entries || entries.length === 0) {
    return { ...results, reason: 'No eligible entries' };
  }

  // 4. Process each entry
  for (const entry of entries) {
    try {
      const result = await processEntry(entry, cronRunId);
      results.processed++;
      if (result.status === 'delivered')                 results.delivered++;
      else if (result.status.startsWith('skipped_'))     results.skipped++;
      else if (result.status === 'failed')               results.failed++;
    } catch (err) {
      results.errors.push({ id: entry.id, error: err.message });
      results.failed++;
    }
  }

  return results;
}

// ── Single entry processor ────────────────────────────────────────

async function processEntry(entry, cronRunId) {
  const provider = process.env.WHATSAPP_PROVIDER || '360dialog';

  // Campaign-level kill switch + daily cap
  const campaignOk = await checkCampaignSettings(entry.campaign_id, entry.anonymous_id);
  if (!campaignOk.allowed) {
    await updateQueueStatus(entry.id, `skipped_${campaignOk.reason}`);
    await auditMessageSkipped(cronRunId, entry, campaignOk.reason);
    return { status: `skipped_${campaignOk.reason}` };
  }

  // Consent check
  const hasConsent = await checkConsent(entry.anonymous_id);
  if (!hasConsent) {
    await updateQueueStatus(entry.id, 'skipped_no_consent', 'No valid WhatsApp consent');
    await auditMessageSkipped(cronRunId, entry, 'no_consent');
    return { status: 'skipped_no_consent' };
  }

  // Resolve phone number
  const phone = await resolvePhone(entry.anonymous_id);
  if (!phone) {
    await moveToDeadLetter(entry.id, Object.assign(new Error('Phone number not found'), { providerCode: 'phone_not_found' }));
    return { status: 'failed', reason: 'phone_not_found' };
  }

  // Idempotency check
  const alreadySent = await checkIdempotency(entry.idempotency_key);
  if (alreadySent) {
    await updateQueueStatus(entry.id, 'skipped_idempotent');
    return { status: 'skipped_idempotent' };
  }

  // Circuit breaker check
  const circuitData = await getCircuitState(provider);
  if (!isCircuitAllowing(circuitData)) {
    await updateQueueStatus(entry.id, 'skipped_provider_unhealthy');
    await auditMessageSkipped(cronRunId, entry, `circuit_${circuitData.circuit_state}`);
    return { status: 'skipped_provider_unhealthy' };
  }

  // Mark as processing (prevent concurrent processing)
  await updateQueueStatus(entry.id, 'processing');

  // Send via provider
  try {
    const adapter  = getProviderAdapter();
    const startMs  = Date.now();
    const sendResult = await adapter.sendMessage({
      to:          phone,
      templateKey: entry.template_key,
      context:     entry.context || {},
    });
    const latencyMs = Date.now() - startMs;

    // Record delivery
    await Promise.all([
      supabase.from('automation_deliveries').insert({
        queue_id:       entry.id,
        campaign_id:    entry.campaign_id,
        anonymous_id:   entry.anonymous_id,
        provider,
        provider_msg_id: sendResult.messageId,
        template_key:   entry.template_key,
        status:         'sent',
        latency_ms:     latencyMs,
        sent_at:        new Date().toISOString(),
      }),
      updateQueueStatus(entry.id, 'delivered', null, sendResult.messageId),
      recordCircuitSuccess(provider),
      auditMessageSent(cronRunId, entry, { ...sendResult, latencyMs }),
      supabase.from('revenue_attribution').insert({
        queue_id:         entry.id,
        campaign_id:      entry.campaign_id,
        anonymous_id:     entry.anonymous_id,
        stack_tier:       entry.context?.tier_label,
        stack_size:       entry.context?.stack_size,
        goal:             entry.context?.goal,
        estimated_value:  entry.context?.estimated_total,
      }),
    ]);

    return { status: 'delivered', messageId: sendResult.messageId };

  } catch (err) {
    await recordCircuitFailure(provider, err.message);

    // Failover to backup provider if available
    const backup = getBackupProviderAdapter();
    if (backup && err.httpStatus >= 500) {
      try {
        const phone2 = phone;  // already resolved
        const fr = await backup.sendMessage({ to: phone2, templateKey: entry.template_key, context: entry.context || {} });
        await updateQueueStatus(entry.id, 'delivered', null, fr.messageId);
        await writeAudit({ eventType: AuditEvents.FAILOVER_TRIGGERED, queueId: entry.id, campaignId: entry.campaign_id, provider: 'backup', cronRunId });
        return { status: 'delivered', provider: 'backup' };
      } catch { /* backup also failed — fall through to retry */ }
    }

    await scheduleRetry(entry.id, entry.retry_count || 0, err);
    return { status: 'failed', reason: err.message };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

async function getGlobalSetting(key) {
  const { data } = await supabase.from('global_settings').eq('key', key).select('value').single();
  return data?.value ?? null;
}

function isWithinSendWindow() {
  const now = new Date().toLocaleString('en-US', { timeZone: SEND_WINDOW_TZ });
  const hour = new Date(now).getHours();
  return hour >= SEND_WINDOW_START && hour < SEND_WINDOW_END;
}

async function checkCampaignSettings(campaignId, anonymousId) {
  const { data: settings } = await supabase
    .from('campaign_settings').eq('campaign_id', campaignId).select('*').single();

  if (!settings?.enabled) return { allowed: false, reason: 'disabled_campaign' };

  // Check send window from campaign-specific settings
  if (settings.send_window_start && settings.send_window_end) {
    const now = new Date().toLocaleString('en-US', { timeZone: settings.timezone || SEND_WINDOW_TZ });
    const hour = new Date(now).getHours();
    const startH = parseInt(settings.send_window_start.split(':')[0], 10);
    const endH   = parseInt(settings.send_window_end.split(':')[0], 10);
    if (hour < startH || hour >= endH) return { allowed: false, reason: 'outside_send_window' };
  }

  // Check per-customer cap
  const cooldownMs = (settings.cooldown_hours || 24) * 3600_000;
  const since = new Date(Date.now() - cooldownMs).toISOString();
  const { data: recent } = await supabase
    .from('automation_deliveries')
    .eq('campaign_id', campaignId)
    .eq('anonymous_id', anonymousId)
    .gte('sent_at', since)
    .select('id');

  if ((recent?.length || 0) >= (settings.per_customer_cap || 1)) {
    return { allowed: false, reason: 'cooldown' };
  }

  return { allowed: true };
}

async function checkConsent(anonymousId) {
  const { data } = await supabase
    .from('wa_consent')
    .eq('anonymous_id', anonymousId)
    .is('revoked_at', null)
    .select('granted_at').single();
  return Boolean(data?.granted_at);
}

async function resolvePhone(anonymousId) {
  const { data } = await supabase
    .from('customers').eq('anonymous_id', anonymousId).select('phone_hash').single();
  // NOTE: phone_hash stores the hashed version. Real phone lookup requires
  // a separate secure store or the customer to provide it during checkout.
  // This is a placeholder — implement your secure phone resolution here.
  return data?.phone_hash || null;
}

async function checkIdempotency(idempotencyKey) {
  const { data } = await supabase
    .from('automation_queue')
    .eq('idempotency_key', idempotencyKey)
    .eq('status', 'delivered')
    .select('id').single();
  return Boolean(data);
}

async function updateQueueStatus(id, status, failureReason = null, providerMsgId = null) {
  const update = { status, updated_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() };
  if (failureReason) update.failure_reason = failureReason;
  if (providerMsgId) update.provider_msg_id = providerMsgId;
  await supabase.from('automation_queue').update(update).eq('id', id);
}
