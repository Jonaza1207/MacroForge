-- ══════════════════════════════════════════════════════════════════
-- MacroForge — Row Level Security (RLS) Policies
-- Phase 9 — Vercel Backend Activation
--
-- Security model:
--   - service_role:    bypasses all RLS (backend only — NEVER frontend)
--   - anon:            extremely limited access (frontend + public)
--   - authenticated:   future customer accounts (not yet implemented)
--
-- CRITICAL: SUPABASE_SERVICE_ROLE_KEY must ONLY live in Vercel env vars.
-- Frontend uses SUPABASE_ANON_KEY which is governed by these policies.
-- ══════════════════════════════════════════════════════════════════

-- ── Enable RLS on all tables ──────────────────────────────────────
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_consent             ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_queue       ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_deliveries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_failures    ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_audit_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_health        ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_attribution    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions_future   ENABLE ROW LEVEL SECURITY;

-- ── customers table ───────────────────────────────────────────────
-- Anon can INSERT their own profile (profile sync from frontend)
-- Anon can SELECT their own record (using anonymous_id claim)
-- Anon CANNOT see other customers
-- Service role: full access (bypasses RLS)

CREATE POLICY "customers_anon_insert_own"
  ON customers FOR INSERT TO anon
  WITH CHECK (true);  -- anonymous_id generated client-side, always safe to insert

CREATE POLICY "customers_anon_select_own"
  ON customers FOR SELECT TO anon
  USING (anonymous_id = current_setting('app.anonymous_id', true));

CREATE POLICY "customers_anon_update_own"
  ON customers FOR UPDATE TO anon
  USING (anonymous_id = current_setting('app.anonymous_id', true))
  WITH CHECK (anonymous_id = current_setting('app.anonymous_id', true));

-- ── wa_consent table ──────────────────────────────────────────────
-- Anon can INSERT consent (with their own anonymous_id)
-- Anon can SELECT their own consent status
-- Anon can UPDATE to REVOKE (set revoked_at) — must support opt-out
-- Anon CANNOT see other customers' consent
-- Anon CANNOT DELETE (soft revoke only, for audit trail)

CREATE POLICY "wa_consent_anon_insert_own"
  ON wa_consent FOR INSERT TO anon
  WITH CHECK (anonymous_id = current_setting('app.anonymous_id', true));

CREATE POLICY "wa_consent_anon_select_own"
  ON wa_consent FOR SELECT TO anon
  USING (anonymous_id = current_setting('app.anonymous_id', true));

CREATE POLICY "wa_consent_anon_revoke_own"
  ON wa_consent FOR UPDATE TO anon
  USING (anonymous_id = current_setting('app.anonymous_id', true))
  WITH CHECK (
    anonymous_id = current_setting('app.anonymous_id', true)
    AND revoked_at IS NOT NULL  -- anon can only set revoked_at (cannot un-revoke)
  );

-- ── automation_queue — NO ANON ACCESS ─────────────────────────────
-- The frontend localStorage queue is the client-side representation.
-- Supabase automation_queue is written exclusively by the backend.
-- Future: when we implement POST /api/customer/sync-queue, the backend
--   will write to this table on behalf of the authenticated user.
-- Anon users CANNOT directly access the automation queue.

-- (no policies = no access for anon role)

-- ── automation_deliveries — READ ONLY for own records (future auth) ──
-- Currently: no anon access. Future: authenticated users can see their own delivery history.
-- (no policies for now)

-- ── automation_audit_log — IMMUTABLE, NO CLIENT ACCESS ───────────
-- Audit logs are write-once, read-never from the client.
-- Backend writes via service_role only.
-- Future internal admin reads via authenticated admin role only.
-- (no policies = no access for anon role)

-- ── campaign_settings — READ ONLY for anon (non-sensitive) ────────
-- Allow anon to read campaign settings for future client-side personalization
-- (timing windows, consent requirements, etc.)

CREATE POLICY "campaign_settings_anon_select"
  ON campaign_settings FOR SELECT TO anon
  USING (true);  -- public metadata, not sensitive

-- ── global_settings — READ ONLY for non-sensitive keys ───────────
-- Only expose specific safe keys (not secrets)

CREATE POLICY "global_settings_anon_select_public"
  ON global_settings FOR SELECT TO anon
  USING (key IN ('automation_enabled', 'maintenance_mode', 'send_window_tz'));

-- ── provider_health — NO CLIENT ACCESS ───────────────────────────
-- Internal operational data. Backend-only.
-- (no policies)

-- ── revenue_attribution — NO CLIENT ACCESS ────────────────────────
-- Sensitive business intelligence. Backend-only.
-- (no policies)

-- ── lifecycle_events — INSERT for anon (from frontend sync) ───────
CREATE POLICY "lifecycle_events_anon_insert_own"
  ON lifecycle_events FOR INSERT TO anon
  WITH CHECK (anonymous_id = current_setting('app.anonymous_id', true));

-- ── subscriptions_future — NO ACCESS ─────────────────────────────
-- (no policies — will be implemented when Shopify integration is live)
