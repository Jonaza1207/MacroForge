-- ══════════════════════════════════════════════════════════════════
-- MacroForge — Subscription + Recurring Revenue Schema
-- Phase 11 — Subscription + Recurring Revenue Activation
--
-- Run AFTER 001–004 migrations.
-- ══════════════════════════════════════════════════════════════════

-- ── Shopify Selling Plan cache ────────────────────────────────────
-- Maps (interval_days, stack_tier) → Shopify Selling Plan ID
-- Populated once during Shopify store setup.
-- Avoids real-time Selling Plan API lookups on every checkout.
CREATE TABLE IF NOT EXISTS selling_plans (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopify_selling_plan_id bigint NOT NULL UNIQUE,
  shopify_plan_group_id   bigint,                -- Selling Plan Group ID
  interval_days           int NOT NULL,          -- 30 | 45 | 60
  discount_pct            decimal(5, 2) NOT NULL, -- 5.00 | 8.00 | 10.00
  stack_tier              text,                  -- 'premium'|'completo'|'balanceado'|'esencial'|null=all
  plan_name               text NOT NULL,
  is_active               boolean DEFAULT true,
  store_domain            text DEFAULT '',
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_sp_interval_tier ON selling_plans(interval_days, stack_tier) WHERE is_active = true;

-- ── Customer subscriptions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id                text NOT NULL,
  shopify_subscription_id     bigint UNIQUE,    -- Shopify's subscription contract ID
  shopify_order_id            bigint,           -- first order that created subscription
  checkout_session_id         uuid REFERENCES checkout_sessions(id),
  status                      text DEFAULT 'active',
  -- status values: active|paused|cancelled|payment_failed|expired
  stack_tier                  text,
  goal                        text,
  interval_days               int NOT NULL DEFAULT 30,
  discount_pct                decimal(5, 2) DEFAULT 0,
  product_ids                 text[],
  line_items                  jsonb,
  estimated_value_crc         decimal(12, 2),
  currency                    char(3) DEFAULT 'CRC',
  next_billing_at             timestamptz,
  last_billing_at             timestamptz,
  billing_count               int DEFAULT 0,
  total_revenue_crc           decimal(12, 2) DEFAULT 0,
  campaign_id                 text,             -- lifecycle campaign that converted to subscription
  source_flow                 text,             -- 'guided'|'manual'|'refill_upsell'|'post_purchase'
  payment_method_type         text,             -- 'credit_card'|'sinpe'|etc (from Shopify, no card data)
  cancellation_reason         text,
  cancelled_at                timestamptz,
  paused_at                   timestamptz,
  pause_reason                text,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

CREATE INDEX idx_sub_anonymous_id ON subscriptions(anonymous_id);
CREATE INDEX idx_sub_status       ON subscriptions(status);
CREATE INDEX idx_sub_next_billing ON subscriptions(next_billing_at) WHERE status = 'active';

-- ── Subscription events log ───────────────────────────────────────
-- Every significant subscription lifecycle event
CREATE TABLE IF NOT EXISTS subscription_events (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id uuid REFERENCES subscriptions(id),
  anonymous_id    text,
  event_type      text NOT NULL,
  -- event types: created|renewed|payment_success|payment_failed|paused|resumed|cancelled|upgraded|downgraded
  payload         jsonb,
  shopify_order_id bigint,
  amount_crc      decimal(12, 2),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_se_subscription_id ON subscription_events(subscription_id);
CREATE INDEX idx_se_event_type       ON subscription_events(event_type);

-- ── Subscription churn signals ────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_churn_signals (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id uuid REFERENCES subscriptions(id),
  anonymous_id    text NOT NULL,
  signal_type     text NOT NULL,
  -- signal types: payment_failed|skip_requested|pause_requested|cancellation_intent|engagement_drop
  severity        text DEFAULT 'low',    -- low|medium|high
  detected_at     timestamptz DEFAULT now(),
  resolved_at     timestamptz,
  intervention    text,                  -- what was done: discount_offer|pause_offered|cancelled|retained
  intervention_at timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ── Subscription revenue attribution ─────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_revenue_attribution (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id     uuid REFERENCES subscriptions(id),
  anonymous_id        text NOT NULL,
  billing_cycle       int NOT NULL DEFAULT 1,
  shopify_order_id    bigint,
  amount_crc          decimal(12, 2),
  campaign_id         text,             -- reactivation campaign that originally converted
  goal                text,
  stack_tier          text,
  source_flow         text,
  billing_date        timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_sra_subscription_id ON subscription_revenue_attribution(subscription_id);
CREATE INDEX idx_sra_billing_date     ON subscription_revenue_attribution(billing_date DESC);

-- ── Subscription offer logs ───────────────────────────────────────
-- Tracks every time a subscription CTA was shown and what happened
CREATE TABLE IF NOT EXISTS subscription_offer_logs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id    text NOT NULL,
  offer_type      text NOT NULL,    -- 'checkout_upsell'|'post_purchase'|'refill_prompt'|'reactivation'
  stack_tier      text,
  interval_days   int,
  discount_pct    decimal(5, 2),
  shown_at        timestamptz DEFAULT now(),
  clicked_at      timestamptz,
  converted_at    timestamptz,
  dismissed_at    timestamptz,
  conversion_subscription_id uuid REFERENCES subscriptions(id)
);

CREATE INDEX idx_sol_anonymous_id ON subscription_offer_logs(anonymous_id);

-- ── RLS for subscription tables ───────────────────────────────────
ALTER TABLE selling_plans                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_churn_signals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_revenue_attribution   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_offer_logs            ENABLE ROW LEVEL SECURITY;

-- Selling plans: readable by anon (plan metadata is non-sensitive)
CREATE POLICY "selling_plans_anon_select"
  ON selling_plans FOR SELECT TO anon
  USING (is_active = true);

-- Subscriptions: anon can read their own
CREATE POLICY "subscriptions_anon_select_own"
  ON subscriptions FOR SELECT TO anon
  USING (anonymous_id = current_setting('app.anonymous_id', true));

-- Offer logs: anon can insert their own
CREATE POLICY "offer_logs_anon_insert_own"
  ON subscription_offer_logs FOR INSERT TO anon
  WITH CHECK (anonymous_id = current_setting('app.anonymous_id', true));

-- All other tables: service role only

-- ── Global settings for subscriptions ────────────────────────────
INSERT INTO global_settings (key, value, updated_by) VALUES
  ('subscription_enabled',          'false',  'setup'),  -- Enable after Selling Plans created
  ('subscription_30d_discount_pct', '10',     'setup'),
  ('subscription_45d_discount_pct', '8',      'setup'),
  ('subscription_60d_discount_pct', '5',      'setup')
ON CONFLICT (key) DO NOTHING;

-- ── Campaign settings for subscription upsells ────────────────────
INSERT INTO campaign_settings (campaign_id, enabled, daily_cap, per_customer_cap, cooldown_hours, priority) VALUES
  ('subscription_post_purchase', false, 100, 1, 168, 3),  -- 7-day cooldown
  ('subscription_refill_upsell', false, 200, 1, 336, 2)   -- 14-day cooldown
ON CONFLICT (campaign_id) DO NOTHING;

-- ── Updated-at triggers ───────────────────────────────────────────
CREATE TRIGGER selling_plans_updated_at    BEFORE UPDATE ON selling_plans    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at   BEFORE UPDATE ON subscriptions   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════════════
-- SUBSCRIPTION ACTIVATION CHECKLIST:
--
-- □ 1. Create Shopify Selling Plan Group via Admin API or UI
--      Shopify Admin → Products → Subscriptions → Selling Plans
-- □ 2. Create plans for each interval (30d, 45d, 60d) with discounts
-- □ 3. Insert plan IDs into selling_plans table:
--      INSERT INTO selling_plans (shopify_selling_plan_id, interval_days, discount_pct, stack_tier, plan_name) VALUES
--        (1234567890, 30, 10.00, 'premium',    'Monthly Premium (30 days - 10% off)'),
--        (1234567891, 30, 8.00,  'completo',   'Monthly Complete (30 days - 8% off)'),
--        (1234567892, 30, 5.00,  null,         'Monthly (30 days - 5% off)'),
--        (1234567893, 45, 8.00,  null,         'Bi-monthly (45 days - 8% off)'),
--        (1234567894, 60, 5.00,  null,         'Every 2 months (60 days - 5% off)');
-- □ 4. Activate selling plans on each product in Shopify Admin
-- □ 5. Test subscription checkout with 1 product
-- □ 6. Register subscription webhooks in Shopify Admin
-- □ 7. Set subscription_enabled='true' in global_settings
-- □ 8. Enable subscription_post_purchase campaign
-- ══════════════════════════════════════════════════════════════════
