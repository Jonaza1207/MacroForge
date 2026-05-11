/**
 * MacroForge — Automation Health Check
 * GET /api/automation/health
 *
 * Returns a safe operational health summary.
 * DOES NOT expose secrets, internal configs, or sensitive business data.
 * Can be called by monitoring tools (uptime checkers, alerting systems).
 *
 * Optionally protected by INTERNAL_ADMIN_SECRET for detailed reports.
 */

import { supabase }      from '../../lib/backend/supabase.js';
import { getProviderAdapter } from '../../lib/backend/providerAdapters/index.js';
import crypto            from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isAdmin = validateAdminToken(req);
  const startTime = Date.now();

  try {
    // ── Basic health (always public) ──────────────────────────
    const basicHealth = {
      status:    'ok',
      timestamp: new Date().toISOString(),
      service:   'MacroForge Automation',
      version:   '9.0',
    };

    // ── Extended health (admin only) ──────────────────────────
    if (isAdmin) {
      const [queueStats, providerHealth, globalEnabled] = await Promise.all([
        getQueueStats(),
        getProviderHealthStatus(),
        getGlobalEnabled(),
      ]);

      return res.status(200).json({
        ...basicHealth,
        automation_enabled: globalEnabled === 'true',
        queue:              queueStats,
        providers:          providerHealth,
        check_duration_ms:  Date.now() - startTime,
      });
    }

    return res.status(200).json(basicHealth);

  } catch (err) {
    console.error('[MacroForge Health] Error:', err.message);
    return res.status(503).json({
      status:    'degraded',
      timestamp: new Date().toISOString(),
      error:     'Health check failed',
    });
  }
}

// ── Internal helpers ──────────────────────────────────────────────

function validateAdminToken(req) {
  const token  = req.headers['x-admin-token'] || '';
  const secret = process.env.INTERNAL_ADMIN_SECRET;
  if (!secret || !token) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch { return false; }
}

async function getQueueStats() {
  const { data } = await supabase
    .from('automation_queue')
    .select('status')
    .gt('expires_at', new Date().toISOString());

  if (!data) return { error: 'Could not fetch queue stats' };

  const counts = data.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  return {
    pending:      counts.pending     || 0,
    processing:   counts.processing  || 0,
    delivered:    counts.delivered   || 0,
    failed:       counts.failed      || 0,
    dead_lettered: counts.dead_lettered || 0,
  };
}

async function getProviderHealthStatus() {
  const { data } = await supabase.from('provider_health').select('*');
  if (!data) return [];
  // Never expose API keys or credentials in the health response
  return data.map(p => ({
    provider:       p.provider,
    status:         p.status,
    circuit_state:  p.circuit_state,
    last_success:   p.last_success_at,
    failure_count:  p.failure_count,
  }));
}

async function getGlobalEnabled() {
  const { data } = await supabase
    .from('global_settings').eq('key', 'automation_enabled').select('value').single();
  return data?.value || 'false';
}
