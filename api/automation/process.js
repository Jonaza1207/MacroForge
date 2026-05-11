/**
 * MacroForge — Automation Processor
 * POST /api/automation/process
 *
 * Vercel Serverless Function — Node.js runtime
 * Triggered by Vercel Cron every 2 hours.
 *
 * Security:
 *   - Requires valid CRON_SECRET in Authorization header
 *   - Vercel Cron automatically sends this header when CRON_SECRET is configured
 *   - Rejects all unauthorized requests with 401
 *   - Never exposes internal error details externally
 *
 * Rate limiting:
 *   - Cron runs every 2 hours maximum
 *   - BATCH_SIZE=20 limits messages per run
 *   - Per-campaign daily caps enforced in campaignProcessor.js
 *
 * Monitoring:
 *   - Writes audit events for every cron run (start, results, errors)
 *   - Provider health tracked in Supabase provider_health table
 *   - Dead-letter queue for failed messages after max retries
 */

import { validateCronSecret, generateCronRunId, jsonResponse, errorResponse } from '../../lib/backend/security.js';
import { processBatch }     from '../../lib/backend/campaignProcessor.js';
import { writeAudit, auditCronStart, auditCronComplete, AuditEvents } from '../../lib/backend/auditLog.js';

export default async function handler(req, res) {
  // ── 1. Allow only POST (Vercel Cron uses POST) ────────────────
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── 2. Validate cron secret ───────────────────────────────────
  // CRON_SECRET must be set in Vercel project settings
  // Vercel automatically injects it for scheduled functions
  if (!validateCronSecret(req)) {
    // Log unauthorized attempt (without exposing why it failed)
    console.warn('[MacroForge Cron] Unauthorized process attempt from:', req.headers['x-real-ip'] || 'unknown');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const cronRunId = generateCronRunId();
  const startTime = Date.now();

  await auditCronStart(cronRunId, 0);

  try {
    // ── 3. Process batch ────────────────────────────────────────
    const results = await processBatch(cronRunId);

    const durationMs = Date.now() - startTime;

    await auditCronComplete(cronRunId, { ...results, duration_ms: durationMs });

    // Log to Vercel function logs (operational visibility)
    console.info('[MacroForge Cron] Run complete:', {
      cronRunId,
      durationMs,
      ...results,
    });

    return res.status(200).json({
      ok:           true,
      cronRunId,
      durationMs,
      ...results,
    });

  } catch (err) {
    const durationMs = Date.now() - startTime;

    await writeAudit({
      eventType: AuditEvents.CRON_FAILED,
      cronRunId,
      payload:   { error: err.message, duration_ms: durationMs },
    });

    // Log full error server-side, return generic message
    console.error('[MacroForge Cron] Critical error:', err);

    return res.status(500).json({
      ok:       false,
      cronRunId,
      error:    'Processing failed. Check audit logs.',
    });
  }
}
