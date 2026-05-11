-- ══════════════════════════════════════════════════════════════════
-- MacroForge — Supabase Initial Schema
-- Phase 9 — Vercel Backend Activation
--
-- Activation steps:
--   1. Create a project at supabase.com
--   2. Go to SQL Editor → New Query
--   3. Run this file first, then 002_rls_policies.sql, then 003_seed_data.sql
--   4. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel env vars
--   5. Add SUPABASE_ANON_KEY to Vercel env vars (used by frontend future sync)
--
-- Security:
--   - SUPABASE_SERVICE_ROLE_KEY: server-side ONLY. Never frontend. Never Git.
--   - SUPABASE_ANON_KEY: public-safe, limited to anon RLS policies
-- ══════════════════════════════════════════════════════════════════

-- ── Extensions ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Core customer table ───────────────────────────────────────────
-- Stores anonymous behavioral profiles. No PII collected by default.
-- Phone number is added ONLY after explicit WhatsApp consent.
CREATE TABLE IF NOT EXISTS customers (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id    text UNIQUE NOT NULL,         -- from getAnonymousId() in frontend
  phone_hash      text,                         -- SHA-256(E164_phone) — never plaintext
  country_code    char(2),                      -- ISO 3166-1 alpha-2
  segment         text,                         -- 'new_visitor'|'hot_lead_wa'|'vip_customer'|...
  lead_score      int DEFAULT 0,                -- 0–100, from frontend getLeadScore()
  journey_state   text,                         -- 'refill_ready'|'premium'|'returning'|...
  visit_count     int DEFAULT 0,
  goals           text[],                       -- ['muscle','cut',...] from stack builder
  budget_tier     text,                         -- 'basic'|'mid'|'full'
  experience      text,                         -- 'beginner'|'intermediate'|'advanced'
  favorite_count  int DEFAULT 0,
  first_seen_at   timestamptz DEFAULT now(),
  last_seen_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz                   -- soft delete
);

CREATE INDEX idx_customers_anonymous_id ON customers(anonymous_id);
CREATE INDEX idx_customers_segment      ON customers(segment);
CREATE INDEX idx_customers_lead_score   ON customers(lead_score DESC);

-- ── WhatsApp consent ──────────────────────────────────────────────
-- GDPR/LOPDP-compliant consent records.
-- Automation MUST check: granted_at IS NOT NULL AND revoked_at IS NULL
CREATE TABLE IF NOT EXISTS wa_consent (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id    text NOT NULL REFERENCES customers(anonymous_id) ON DELETE CASCADE,
  granted_at      timestamptz,
  revoked_at      timestamptz,
  source          text NOT NULL,  -- 'checkout_opt_in'|'ai_builder_opt_in'|'manual_opt_in'
  ip_hash         text,           -- SHA-256(IP) — anonymized, for audit only
  policy_version  text DEFAULT '1.0',
  country_code    char(2),
  consent_channel text DEFAULT 'whatsapp',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_wa_consent_anon ON wa_consent(anonymous_id);
CREATE INDEX idx_wa_consent_granted ON wa_consent(granted_at) WHERE granted_at IS NOT NULL;

-- ── Automation queue ──────────────────────────────────────────────
-- Synced from frontend localStorage automation queue via POST /api/customer/profile
-- Server also creates entries for server-detected triggers (refill cycles)
CREATE TABLE IF NOT EXISTS automation_queue (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id     text NOT NULL,
  campaign_id      text NOT NULL,
  template_key     text NOT NULL,
  context          jsonb DEFAULT '{}'::jsonb,  -- safe context, no PII
  priority         int DEFAULT 5,
  status           text DEFAULT 'pending',
  -- Status values:
  -- pending | processing | delivered | failed | dead_lettered
  -- skipped_no_consent | skipped_disabled_campaign | skipped_outside_send_window
  -- skipped_cooldown | skipped_provider_unhealthy | skipped_idempotent | skipped_expired
  retry_count      int DEFAULT 0,
  max_retries      int DEFAULT 3,
  last_attempt_at  timestamptz,
  next_retry_at    timestamptz,
  eligible_after   timestamptz NOT NULL,
  expires_at       timestamptz NOT NULL,
  idempotency_key  text UNIQUE NOT NULL,       -- prevents duplicate sends across retries
  provider         text,                       -- which provider was used
  provider_msg_id  text,                       -- provider's message ID for tracking
  delivery_status  text,                       -- normalized: sent|delivered|read|failed
  failure_reason   text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_aq_status_eligible ON automation_queue(status, eligible_after, expires_at);
CREATE INDEX idx_aq_anonymous_id    ON automation_queue(anonymous_id);
CREATE INDEX idx_aq_campaign_id     ON automation_queue(campaign_id);
CREATE INDEX idx_aq_next_retry      ON automation_queue(next_retry_at) WHERE status = 'failed';

-- ── Automation deliveries ─────────────────────────────────────────
-- Immutable delivery record for every send attempt
CREATE TABLE IF NOT EXISTS automation_deliveries (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_id         uuid NOT NULL REFERENCES automation_queue(id),
  campaign_id      text NOT NULL,
  anonymous_id     text NOT NULL,
  provider         text NOT NULL,
  provider_msg_id  text,
  template_key     text NOT NULL,
  status           text,
  error_code       text,
  error_message    text,
  latency_ms       int,
  is_retryable     boolean DEFAULT false,
  sent_at          timestamptz DEFAULT now(),
  delivered_at     timestamptz,
  read_at          timestamptz,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_ad_queue_id      ON automation_deliveries(queue_id);
CREATE INDEX idx_ad_anonymous_id  ON automation_deliveries(anonymous_id);
CREATE INDEX idx_ad_campaign_id   ON automation_deliveries(campaign_id);

-- ── Automation failures / dead-letter queue ───────────────────────
CREATE TABLE IF NOT EXISTS automation_failures (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_id          uuid REFERENCES automation_queue(id),
  campaign_id       text NOT NULL,
  anonymous_id      text NOT NULL,
  failure_reason    text NOT NULL,
  provider_response jsonb,
  retry_count       int DEFAULT 0,
  is_retryable      boolean DEFAULT false,
  is_dead_lettered  boolean DEFAULT false,
  reviewed_at       timestamptz,
  resolution        text,  -- 'resolved'|'discarded'|'manually_sent'
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_af_campaign_id ON automation_failures(campaign_id);
CREATE INDEX idx_af_is_dead     ON automation_failures(is_dead_lettered) WHERE is_dead_lettered = true;

-- ── Audit log (immutable — never updated, never deleted) ──────────
CREATE TABLE IF NOT EXISTS automation_audit_log (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type   text NOT NULL,
  queue_id     uuid,
  campaign_id  text,
  anonymous_id text,
  provider     text,
  payload      jsonb,
  ip_hash      text,
  cron_run_id  text,   -- groups events from same cron execution
  created_at   timestamptz DEFAULT now()
  -- No updated_at — audit logs are immutable
);

CREATE INDEX idx_aal_event_type   ON automation_audit_log(event_type);
CREATE INDEX idx_aal_anonymous_id ON automation_audit_log(anonymous_id);
CREATE INDEX idx_aal_created_at   ON automation_audit_log(created_at DESC);

-- ── Campaign settings (kill switches) ────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_settings (
  campaign_id        text PRIMARY KEY,
  enabled            boolean DEFAULT true,
  daily_cap          int DEFAULT 100,      -- max sends per day globally
  per_customer_cap   int DEFAULT 1,        -- max sends per customer per cooldown
  cooldown_hours     int DEFAULT 24,
  send_window_start  time DEFAULT '09:00',
  send_window_end    time DEFAULT '18:00',
  timezone           text DEFAULT 'America/Costa_Rica',
  priority           int DEFAULT 5,
  updated_at         timestamptz DEFAULT now(),
  updated_by         text
);

-- ── Global settings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- ── Provider health / circuit breaker state ───────────────────────
CREATE TABLE IF NOT EXISTS provider_health (
  provider          text PRIMARY KEY,
  status            text DEFAULT 'unknown',   -- healthy|degraded|down|unknown
  failure_count     int DEFAULT 0,
  consecutive_fails int DEFAULT 0,
  last_success_at   timestamptz,
  last_failure_at   timestamptz,
  last_error        text,
  circuit_state     text DEFAULT 'closed',    -- closed|open|half-open
  circuit_opened_at timestamptz,
  circuit_close_at  timestamptz,              -- when to attempt half-open
  updated_at        timestamptz DEFAULT now()
);

-- ── Revenue attribution ───────────────────────────────────────────
-- Links automation sends to revenue outcomes (future Shopify integration)
CREATE TABLE IF NOT EXISTS revenue_attribution (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_id        uuid REFERENCES automation_queue(id),
  delivery_id     uuid REFERENCES automation_deliveries(id),
  campaign_id     text NOT NULL,
  anonymous_id    text NOT NULL,
  stack_tier      text,
  stack_size      int,
  goal            text,
  clicked_at      timestamptz,    -- when customer opened WhatsApp from automation
  converted_at    timestamptz,    -- when purchase was confirmed
  order_id        text,           -- future: Shopify order ID
  estimated_value int,            -- CRC, estimated from stack total
  actual_value    int,            -- CRC, populated from Shopify order
  attribution_window_hours int DEFAULT 72,  -- 72h attribution window
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_ra_campaign_id   ON revenue_attribution(campaign_id);
CREATE INDEX idx_ra_converted_at  ON revenue_attribution(converted_at) WHERE converted_at IS NOT NULL;

-- ── Lifecycle events log ──────────────────────────────────────────
-- Tracks customer journey state changes for analytics
CREATE TABLE IF NOT EXISTS lifecycle_events (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id   text NOT NULL,
  event_type     text NOT NULL,   -- 'journey_state_detected'|'campaign_eligible'|...
  journey_state  text,
  campaign_id    text,
  payload        jsonb,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_le_anonymous_id ON lifecycle_events(anonymous_id);
CREATE INDEX idx_le_event_type   ON lifecycle_events(event_type);

-- ── Subscriptions (future) ────────────────────────────────────────
-- Prepared for Phase 10 — Shopify subscription integration
CREATE TABLE IF NOT EXISTS subscriptions_future (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id      text NOT NULL,
  shopify_plan_id   text,                 -- Shopify Selling Plan ID (future)
  product_ids       text[],               -- stack product IDs
  interval_days     int DEFAULT 30,
  status            text DEFAULT 'draft', -- draft|active|paused|cancelled
  next_billing_at   timestamptz,
  estimated_value   int,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- ── Updated-at triggers ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at           BEFORE UPDATE ON customers           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER wa_consent_updated_at          BEFORE UPDATE ON wa_consent          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER automation_queue_updated_at    BEFORE UPDATE ON automation_queue    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER campaign_settings_updated_at   BEFORE UPDATE ON campaign_settings   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER provider_health_updated_at     BEFORE UPDATE ON provider_health     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER revenue_attribution_updated_at BEFORE UPDATE ON revenue_attribution FOR EACH ROW EXECUTE FUNCTION update_updated_at();
