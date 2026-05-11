-- ══════════════════════════════════════════════════════════════════
-- MacroForge — Shopify Commerce Schema
-- Phase 10 — Shopify Commerce Activation
--
-- Run AFTER 001, 002, 003 migrations.
-- SQL Editor → New Query → Paste → Run
-- ══════════════════════════════════════════════════════════════════

-- ── Shopify product variant mapping ──────────────────────────────
-- MacroForge slug (from product URL) → Shopify Variant ID
-- This is the bridge between frontend catalog and Shopify checkout.
-- Populated by running the catalog sync utility after Shopify store setup.
CREATE TABLE IF NOT EXISTS shopify_products (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mf_slug             text UNIQUE NOT NULL,   -- e.g. 'creatina-monohidratada-nutricost'
  mf_product_id       text,                   -- MacroForge internal ID
  shopify_product_id  bigint,                 -- Shopify product numeric ID
  shopify_variant_id  bigint NOT NULL,        -- Shopify variant numeric ID (used in draft orders)
  title               text NOT NULL,
  variant_title       text,                   -- null for single-variant products
  sku                 text,
  price_crc           decimal(12, 2),         -- Costa Rica Colones
  compare_at_price_crc decimal(12, 2),
  inventory_quantity  int DEFAULT 0,
  is_active           boolean DEFAULT true,
  store_domain        text DEFAULT '',        -- e.g. macroforge.myshopify.com
  region              char(2) DEFAULT 'CR',   -- future multi-region support
  last_synced_at      timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_sp_slug         ON shopify_products(mf_slug);
CREATE INDEX idx_sp_variant_id   ON shopify_products(shopify_variant_id);
CREATE INDEX idx_sp_is_active    ON shopify_products(is_active) WHERE is_active = true;

-- ── Checkout sessions ─────────────────────────────────────────────
-- Tracks every draft order created → checkout opened → completed/abandoned
-- This is the central record for checkout attribution and recovery.
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id        text NOT NULL,
  shopify_draft_id    bigint,                 -- Shopify draft order numeric ID
  shopify_draft_key   text,                   -- Shopify draft order key (for checkout URL)
  checkout_url        text,                   -- Shopify hosted checkout URL
  invoice_url         text,                   -- Shopify invoice URL (alternative)
  status              text DEFAULT 'created', -- created|opened|completed|abandoned|expired|failed
  stack_metadata      jsonb,                  -- tier, goal, stack_size, source_flow, coverage
  attribution         jsonb,                  -- campaign_id, source, journey_state
  risk_score          int DEFAULT 0,
  risk_level          text DEFAULT 'low',     -- low|medium|high
  product_ids         text[],                 -- MacroForge product IDs
  line_items          jsonb,                  -- Shopify variant IDs + quantities
  estimated_total     decimal(12, 2),
  currency            char(3) DEFAULT 'CRC',
  shopify_order_id    bigint,                 -- populated after payment
  completed_at        timestamptz,
  abandoned_at        timestamptz,
  opened_at           timestamptz,
  expires_at          timestamptz,            -- Shopify draft orders expire after 180 days
  idempotency_key     text UNIQUE,            -- prevents duplicate draft orders
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_cs_anonymous_id  ON checkout_sessions(anonymous_id);
CREATE INDEX idx_cs_status        ON checkout_sessions(status);
CREATE INDEX idx_cs_draft_id      ON checkout_sessions(shopify_draft_id) WHERE shopify_draft_id IS NOT NULL;
CREATE INDEX idx_cs_order_id      ON checkout_sessions(shopify_order_id) WHERE shopify_order_id IS NOT NULL;
CREATE INDEX idx_cs_abandoned     ON checkout_sessions(abandoned_at) WHERE status = 'abandoned';

-- ── Shopify orders ────────────────────────────────────────────────
-- Persisted from order/paid webhook events.
-- Source of truth for revenue attribution and post-purchase lifecycle.
CREATE TABLE IF NOT EXISTS shopify_orders (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopify_order_id    bigint UNIQUE NOT NULL,
  shopify_order_name  text,                   -- #1001, #1002...
  anonymous_id        text,
  checkout_session_id uuid REFERENCES checkout_sessions(id),
  status              text DEFAULT 'pending', -- pending|paid|fulfilled|cancelled|refunded
  financial_status    text,                   -- Shopify financial_status
  fulfillment_status  text,                   -- null|partial|fulfilled
  total_price         decimal(12, 2) NOT NULL,
  subtotal_price      decimal(12, 2),
  total_tax           decimal(12, 2),
  currency            char(3) DEFAULT 'CRC',
  line_items          jsonb,
  customer_tags       text[],                 -- Shopify customer tags applied
  order_tags          text[],                 -- Shopify order tags applied
  stack_tier          text,
  goal                text,
  campaign_id         text,                   -- lifecycle campaign if recovery
  source_flow         text,                   -- 'guided'|'manual'|'whatsapp'|'automation_recovery'
  risk_score          int DEFAULT 0,
  risk_level          text DEFAULT 'low',
  fulfillment_tracking_url text,
  fulfillment_company      text,
  refund_amount       decimal(12, 2),
  cancelled_at        timestamptz,
  paid_at             timestamptz,
  fulfilled_at        timestamptz,
  refunded_at         timestamptz,
  shopify_created_at  timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_so_anonymous_id  ON shopify_orders(anonymous_id);
CREATE INDEX idx_so_status        ON shopify_orders(status);
CREATE INDEX idx_so_campaign      ON shopify_orders(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_so_paid_at       ON shopify_orders(paid_at) WHERE paid_at IS NOT NULL;

-- ── Shopify webhook events log ────────────────────────────────────
-- Idempotent record of every received webhook event.
-- Prevents duplicate processing (replay attacks, delivery retries).
CREATE TABLE IF NOT EXISTS shopify_webhook_events (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopify_event_id  text UNIQUE NOT NULL,  -- X-Shopify-Webhook-Id header (dedup key)
  topic             text NOT NULL,         -- orders/paid, checkouts/create, etc.
  shop_domain       text,
  payload           jsonb,
  processed_at      timestamptz,
  processing_result text,                  -- 'success'|'skipped'|'error'
  error_message     text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_swe_topic       ON shopify_webhook_events(topic);
CREATE INDEX idx_swe_event_id    ON shopify_webhook_events(shopify_event_id);

-- ── Post-purchase lifecycle ───────────────────────────────────────
-- Drives refill reminders, reorder automation, VIP progression
CREATE TABLE IF NOT EXISTS post_purchase_lifecycle (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id        text NOT NULL,
  shopify_order_id    bigint REFERENCES shopify_orders(shopify_order_id),
  goal                text,
  stack_tier          text,
  product_categories  text[],
  estimated_supply_days int,               -- shortest product cycle in days
  refill_reminder_at  timestamptz,         -- when to trigger refill reminder (75% cycle)
  reorder_eligible_at timestamptz,         -- when customer should be reordering
  reorder_status      text DEFAULT 'pending', -- pending|reminded|reordered|lapsed
  vip_threshold_met   boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_ppl_anonymous_id      ON post_purchase_lifecycle(anonymous_id);
CREATE INDEX idx_ppl_refill_reminder   ON post_purchase_lifecycle(refill_reminder_at) WHERE reorder_status = 'pending';

-- ── Shopify campaign settings ─────────────────────────────────────
INSERT INTO global_settings (key, value, updated_by) VALUES
  ('shopify_checkout_enabled', 'false',   'setup'),  -- START DISABLED. Enable after product mapping complete.
  ('shopify_store_domain',     '',         'setup'),  -- Set to: yourstore.myshopify.com
  ('shopify_api_version',      '2024-01',  'setup'),  -- Update to current Shopify API version
  ('checkout_kill_switch',     'false',    'setup'),  -- Emergency: 'true' disables all Shopify checkout
  ('draft_order_note_prefix',  'MacroForge Stack Builder | ', 'setup')
ON CONFLICT (key) DO NOTHING;

-- ── RLS for new tables ────────────────────────────────────────────
ALTER TABLE shopify_products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_webhook_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_purchase_lifecycle    ENABLE ROW LEVEL SECURITY;

-- Anon can read active product mapping (needed for inventory checks)
CREATE POLICY "shopify_products_anon_select_active"
  ON shopify_products FOR SELECT TO anon
  USING (is_active = true);

-- Anon can read their own checkout sessions
CREATE POLICY "checkout_sessions_anon_select_own"
  ON checkout_sessions FOR SELECT TO anon
  USING (anonymous_id = current_setting('app.anonymous_id', true));

-- All write operations: service role only (via backend API)

-- ── Updated-at triggers ───────────────────────────────────────────
CREATE TRIGGER shopify_products_updated_at          BEFORE UPDATE ON shopify_products          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER checkout_sessions_updated_at         BEFORE UPDATE ON checkout_sessions         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER shopify_orders_updated_at            BEFORE UPDATE ON shopify_orders            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER post_purchase_lifecycle_updated_at   BEFORE UPDATE ON post_purchase_lifecycle   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════════════
-- SHOPIFY ACTIVATION CHECKLIST:
--
-- □ 1. Set up Shopify Partner account → create development store
-- □ 2. Create custom app in Shopify Admin → enable Admin API scopes:
--      read_products, write_draft_orders, read_draft_orders,
--      write_orders (for webhooks), read_orders
-- □ 3. Copy Admin API access token → add SHOPIFY_ADMIN_API_TOKEN to Vercel
-- □ 4. Set SHOPIFY_STORE_DOMAIN in Vercel (e.g., macroforge.myshopify.com)
-- □ 5. Set SHOPIFY_API_VERSION=2024-01 in Vercel
-- □ 6. Set SHOPIFY_WEBHOOK_SECRET in Vercel
-- □ 7. Set SHOPIFY_LOCATION_ID in Vercel (for inventory checks)
-- □ 8. Run catalog sync to populate shopify_products table
-- □ 9. Test with 1 product manually via /api/shopify/draft-order
-- □ 10. Register webhooks in Shopify Admin → Settings → Notifications:
--       orders/paid → https://macroforge.cr/api/shopify/webhook
-- □ 11. Set shopify_checkout_enabled='true' in global_settings
-- □ 12. Monitor checkout_sessions table for 48h
-- □ 13. Enable post-purchase lifecycle triggers
-- ══════════════════════════════════════════════════════════════════
