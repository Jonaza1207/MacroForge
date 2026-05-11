/**
 * MacroForge — WhatsApp Provider Abstraction Layer
 *
 * Phase 9 — Vercel Backend Activation
 * SERVER-SIDE ONLY.
 *
 * Factory that selects the appropriate provider adapter based on
 * the WHATSAPP_PROVIDER environment variable.
 *
 * Supported providers:
 *   '360dialog'  — recommended for LATAM. Best Spanish template support.
 *   'twilio'     — global coverage, reliable SLA
 *   'meta'       — direct Meta WhatsApp Cloud API
 *
 * All adapters implement the same interface:
 *   sendMessage(payload)          → { messageId, status, raw }
 *   validateWebhook(req, body)    → boolean
 *   parseWebhookEvent(body)       → normalized event
 *   normalizeDeliveryStatus(raw)  → 'sent'|'delivered'|'read'|'failed'
 *   isStopCommand(event)          → boolean
 *   getProviderHealth()           → { latencyMs, status }
 *
 * Adding a new provider:
 *   1. Create lib/backend/providerAdapters/yourprovider.js
 *   2. Implement the interface above
 *   3. Add case in getProviderAdapter() below
 *   4. Add WHATSAPP_PROVIDER=yourprovider to Vercel env vars
 *
 * Normalized message payload (input to sendMessage):
 * {
 *   to:           string,   — E.164 phone number (from Supabase, never frontend)
 *   templateKey:  string,   — WA_TEMPLATES key
 *   context:      object,   — template variables { stackName, productName, ... }
 *   language:     string,   — 'es' (default for Costa Rica)
 * }
 */

import { Dialog360Adapter } from './dialog360.js';
import { TwilioAdapter }    from './twilio.js';
import { MetaAdapter }      from './meta.js';

/**
 * Get the configured provider adapter.
 * Fails loudly if provider is not configured — prevents silent send failures.
 */
export function getProviderAdapter() {
  const provider = process.env.WHATSAPP_PROVIDER;

  if (!provider) {
    throw new Error(
      '[MacroForge Provider] WHATSAPP_PROVIDER is not set. ' +
      'Set it to "360dialog", "twilio", or "meta" in Vercel env vars.'
    );
  }

  switch (provider.toLowerCase()) {
    case '360dialog': return new Dialog360Adapter();
    case 'twilio':    return new TwilioAdapter();
    case 'meta':      return new MetaAdapter();
    default:
      throw new Error(`[MacroForge Provider] Unknown provider: "${provider}". Must be 360dialog|twilio|meta.`);
  }
}

/**
 * Get backup provider adapter (for failover).
 * Returns null if no backup is configured.
 */
export function getBackupProviderAdapter() {
  const backupProvider = process.env.BACKUP_WHATSAPP_PROVIDER;
  if (!backupProvider) return null;

  switch (backupProvider.toLowerCase()) {
    case '360dialog': return new Dialog360Adapter({ useBackupKey: true });
    case 'twilio':    return new TwilioAdapter({ useBackupKey: true });
    case 'meta':      return new MetaAdapter({ useBackupKey: true });
    default:          return null;
  }
}

/**
 * Normalized delivery status values across all providers.
 */
export const DeliveryStatus = {
  SENT:       'sent',        // provider accepted the message
  DELIVERED:  'delivered',   // delivered to device
  READ:       'read',        // read by recipient
  FAILED:     'failed',      // delivery failed
  REJECTED:   'rejected',    // template or phone rejected
};
