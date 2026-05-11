/**
 * MacroForge — Circuit Breaker
 *
 * Phase 9 — Vercel Backend Activation
 * SERVER-SIDE ONLY.
 *
 * Protects against cascading failures when the WhatsApp provider is unhealthy.
 * State is persisted in Supabase provider_health table (survives across invocations).
 *
 * States:
 *   closed   — normal operation, requests pass through
 *   open     — provider unhealthy, requests blocked immediately
 *   half-open — testing recovery after cooldown period
 *
 * Thresholds (from global_settings):
 *   circuit_failure_threshold — consecutive failures before opening (default: 5)
 *   circuit_cooldown_minutes  — time before half-open attempt (default: 30)
 */

import { supabase } from './supabase.js';

// ── Circuit breaker core ──────────────────────────────────────────

/**
 * Get current circuit state from Supabase for a provider.
 * Returns { state, failure_count, last_failure_at, circuit_close_at }
 */
export async function getCircuitState(provider) {
  const { data } = await supabase
    .from('provider_health')
    .eq('provider', provider)
    .select('*')
    .single();

  if (!data) {
    // Unknown provider — default to closed (fail open, provider health not tracked yet)
    return { circuit_state: 'closed', consecutive_fails: 0, status: 'unknown' };
  }

  const now = Date.now();

  // If circuit is open, check if cooldown has elapsed → transition to half-open
  if (data.circuit_state === 'open' && data.circuit_close_at) {
    const closeAt = new Date(data.circuit_close_at).getTime();
    if (now >= closeAt) {
      await transitionCircuit(provider, 'half-open');
      return { ...data, circuit_state: 'half-open' };
    }
  }

  return data;
}

/**
 * Record a successful send — reset failure counts, close circuit.
 */
export async function recordCircuitSuccess(provider) {
  await supabase.from('provider_health').upsert({
    provider,
    status:          'healthy',
    failure_count:   0,
    consecutive_fails: 0,
    last_success_at: new Date().toISOString(),
    circuit_state:   'closed',
    circuit_opened_at: null,
    circuit_close_at:  null,
  }, { onConflict: 'provider' });
}

/**
 * Record a failed send — increment counters, potentially open circuit.
 */
export async function recordCircuitFailure(provider, errorMessage) {
  // Read current state
  const { data: current } = await supabase
    .from('provider_health')
    .eq('provider', provider)
    .select('consecutive_fails, failure_count')
    .single();

  const consecutiveFails = (current?.consecutive_fails || 0) + 1;
  const totalFailures    = (current?.failure_count     || 0) + 1;

  // Read threshold from global settings
  const { data: thresholdRow } = await supabase
    .from('global_settings')
    .eq('key', 'circuit_failure_threshold')
    .select('value')
    .single();
  const threshold = parseInt(thresholdRow?.value || '5', 10);

  const { data: cooldownRow } = await supabase
    .from('global_settings')
    .eq('key', 'circuit_cooldown_minutes')
    .select('value')
    .single();
  const cooldownMs = parseInt(cooldownRow?.value || '30', 10) * 60_000;

  const shouldOpen = consecutiveFails >= threshold;
  const now        = new Date();
  const closeAt    = shouldOpen ? new Date(Date.now() + cooldownMs).toISOString() : null;

  await supabase.from('provider_health').upsert({
    provider,
    status:            shouldOpen ? 'down' : 'degraded',
    failure_count:     totalFailures,
    consecutive_fails: consecutiveFails,
    last_failure_at:   now.toISOString(),
    last_error:        errorMessage,
    circuit_state:     shouldOpen ? 'open' : 'closed',
    circuit_opened_at: shouldOpen ? now.toISOString() : null,
    circuit_close_at:  closeAt,
  }, { onConflict: 'provider' });

  return { shouldOpen, consecutiveFails, threshold };
}

/**
 * Manually transition circuit state.
 */
async function transitionCircuit(provider, newState) {
  await supabase.from('provider_health').update({
    circuit_state: newState,
    updated_at:    new Date().toISOString(),
  }).eq('provider', provider);
}

/**
 * Check if requests should be allowed through.
 * Returns true if the circuit is closed or half-open (recovery attempt allowed).
 */
export function isCircuitAllowing(circuitData) {
  return circuitData.circuit_state === 'closed' || circuitData.circuit_state === 'half-open';
}
