-- ══════════════════════════════════════════════════════════════════
-- MacroForge — Community Ecosystem Schema
-- Phase 13 — Scale + Media + Community Ecosystem
--
-- Systems: Loyalty, Referrals, Reviews, Challenges, Ambassadors, UGC
-- Run AFTER migrations 001–005.
-- ══════════════════════════════════════════════════════════════════

-- ── Loyalty level configuration ───────────────────────────────────
-- Modifiable without code changes. Drives all level assignments.
CREATE TABLE IF NOT EXISTS loyalty_level_config (
  level_name     text PRIMARY KEY,
  level_rank     int UNIQUE NOT NULL,   -- 1=Explorer (lowest) → 5=VIP (highest)
  points_min     int NOT NULL,
  points_max     int,                   -- null = no upper bound (VIP)
  icon           text NOT NULL,
  color_hex      text NOT NULL,
  perks          text[],               -- human-readable perk list
  badge_label    text NOT NULL,
  created_at     timestamptz DEFAULT now()
);

INSERT INTO loyalty_level_config VALUES
  ('explorer',   1, 0,    99,   '🔍', '#888888', ARRAY['Acceso al catálogo completo', 'Stack Builder gratuito'], 'Explorador', now()),
  ('builder',    2, 100,  499,  '⚡', '#E3001E', ARRAY['Todo lo anterior', 'Recordatorios de reabastecimiento', 'Stacks favoritos ilimitados'], 'Constructor', now()),
  ('committed',  3, 500,  1499, '💪', '#00C896', ARRAY['Todo lo anterior', 'Asesoría prioritaria por WhatsApp', 'Descuento de referidos mejorado'], 'Comprometido', now()),
  ('elite',      4, 1500, 4999, '🏆', '#D4A843', ARRAY['Todo lo anterior', 'Acceso anticipado a nuevos productos', 'VIP checkout preferencial', 'Código de embajador'], 'Elite', now()),
  ('vip',        5, 5000, null, '💎', '#D4A843', ARRAY['Todo lo anterior', 'Concierge personal por WhatsApp', 'Suscripción con máximo descuento', 'MacroForge VIP permanente'], 'MacroForge VIP', now())
ON CONFLICT (level_name) DO NOTHING;

-- ── Loyalty accounts ──────────────────────────────────────────────
-- One record per customer. Updated on every loyalty event.
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id        text UNIQUE NOT NULL,
  shopify_customer_id bigint,                  -- future: linked after account creation
  current_level       text DEFAULT 'explorer' REFERENCES loyalty_level_config(level_name),
  total_points        int DEFAULT 0,
  lifetime_points     int DEFAULT 0,           -- never decremented (for streak/milestone tracking)
  points_pending      int DEFAULT 0,           -- earned but not yet confirmed (awaiting order)
  purchase_streak     int DEFAULT 0,           -- consecutive months with a purchase
  refill_streak       int DEFAULT 0,           -- consecutive refill cycles maintained
  last_purchase_at    timestamptz,
  last_level_up_at    timestamptz,
  referral_code       text UNIQUE,             -- their outbound referral code (MF-XXXXXX)
  referrals_converted int DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_la_anonymous_id  ON loyalty_accounts(anonymous_id);
CREATE INDEX idx_la_current_level ON loyalty_accounts(current_level);
CREATE INDEX idx_la_total_points  ON loyalty_accounts(total_points DESC);

-- ── Loyalty events log (immutable transaction ledger) ─────────────
-- Every point change is recorded. Never updated. Enables full audit.
CREATE TABLE IF NOT EXISTS loyalty_events (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      uuid NOT NULL REFERENCES loyalty_accounts(id),
  anonymous_id    text NOT NULL,
  event_type      text NOT NULL,
  -- Types: first_purchase | repeat_purchase | subscription_start | subscription_renewal
  --        refill_reorder | stack_saved | referral_conversion | review_submitted
  --        challenge_completed | transformation_submitted | birthday_bonus
  --        manual_adjustment | point_expiry
  points_delta    int NOT NULL,            -- positive = earned, negative = redeemed/expired
  points_balance  int NOT NULL,            -- running balance after this event
  reference_id    text,                    -- order ID, subscription ID, etc.
  metadata        jsonb,                   -- additional context
  is_pending      boolean DEFAULT false,   -- true = awaiting order confirmation
  confirmed_at    timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_le_account_id   ON loyalty_events(account_id);
CREATE INDEX idx_le_event_type   ON loyalty_events(event_type);
CREATE INDEX idx_le_created_at   ON loyalty_events(created_at DESC);

-- ── Point earning rules ───────────────────────────────────────────
-- Configurable without code changes
CREATE TABLE IF NOT EXISTS loyalty_point_rules (
  event_type      text PRIMARY KEY,
  points          int NOT NULL,
  description     text NOT NULL,
  max_per_day     int,                     -- null = unlimited
  is_active       boolean DEFAULT true,
  updated_at      timestamptz DEFAULT now()
);

INSERT INTO loyalty_point_rules VALUES
  ('first_purchase',        100, 'Primera compra en MacroForge',           1, true, now()),
  ('repeat_purchase',        50, 'Compra adicional',                       1, true, now()),
  ('subscription_start',    200, 'Inicio de suscripción mensual',          1, true, now()),
  ('subscription_renewal',   75, 'Renovación de suscripción',              1, true, now()),
  ('refill_reorder',         75, 'Reabastecimiento de stack',              1, true, now()),
  ('stack_saved',            10, 'Stack guardado como favorito',            3, true, now()),
  ('referral_conversion',   300, 'Referido realizó su primera compra',     null, true, now()),
  ('review_submitted',       25, 'Reseña verificada enviada',              1, true, now()),
  ('challenge_completed',   100, 'Desafío mensual completado',             1, true, now()),
  ('transformation_submitted', 50, 'Progreso de transformación enviado',   1, true, now())
ON CONFLICT (event_type) DO NOTHING;

-- ── Referral codes ────────────────────────────────────────────────
-- One code per customer. Generated server-side or derived from anonymous_id.
CREATE TABLE IF NOT EXISTS referral_codes (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            text UNIQUE NOT NULL,    -- format: MF-XXXXXX (uppercase)
  anonymous_id    text UNIQUE NOT NULL,    -- one code per customer
  account_id      uuid REFERENCES loyalty_accounts(id),
  level           text DEFAULT 'explorer',
  discount_pct    decimal(5, 2) DEFAULT 5.00,  -- discount given to referred customer
  commission_pct  decimal(5, 2) DEFAULT 0.00,  -- future revenue sharing
  is_active       boolean DEFAULT true,
  max_uses        int,                     -- null = unlimited
  total_uses      int DEFAULT 0,
  total_conversions int DEFAULT 0,         -- conversions that resulted in purchases
  total_revenue_attributed decimal(12, 2) DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_rc_code         ON referral_codes(code);
CREATE INDEX idx_rc_anonymous_id ON referral_codes(anonymous_id);

-- ── Referral conversions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_conversions (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code_id    uuid NOT NULL REFERENCES referral_codes(id),
  referral_code       text NOT NULL,
  referrer_anonymous_id text NOT NULL,     -- who sent the referral
  referred_anonymous_id text NOT NULL,     -- who used the code
  shopify_order_id    bigint,
  order_value_crc     decimal(12, 2),
  discount_applied_pct decimal(5, 2),
  points_awarded      int DEFAULT 0,       -- points given to referrer
  status              text DEFAULT 'pending',  -- pending|confirmed|cancelled|fraudulent
  confirmed_at        timestamptz,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_rconv_code          ON referral_conversions(referral_code);
CREATE INDEX idx_rconv_referrer      ON referral_conversions(referrer_anonymous_id);
CREATE INDEX idx_rconv_referred      ON referral_conversions(referred_anonymous_id);

-- ── Customer reviews ──────────────────────────────────────────────
-- Verified-purchase reviews with full moderation pipeline.
-- NOT live immediately — requires moderation approval.
CREATE TABLE IF NOT EXISTS customer_reviews (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id        text NOT NULL,
  shopify_order_id    bigint,             -- must exist for verified purchase badge
  product_slug        text,              -- MacroForge product slug (optional)
  stack_tier          text,              -- if reviewing a full stack
  rating              smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title               text NOT NULL,
  body                text NOT NULL,
  goal                text,             -- 'muscle'|'cut'|'performance'|etc
  verified_purchase   boolean DEFAULT false,
  helpful_votes       int DEFAULT 0,
  unhelpful_votes     int DEFAULT 0,
  status              text DEFAULT 'pending',
  -- status: pending|approved|rejected|removed|flagged
  rejection_reason    text,
  moderated_by        text,             -- 'auto'|'human'
  moderated_at        timestamptz,
  ip_hash             text,             -- anonymized for fraud detection
  content_hash        text,             -- for duplicate detection
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_cr_anonymous_id  ON customer_reviews(anonymous_id);
CREATE INDEX idx_cr_product_slug  ON customer_reviews(product_slug) WHERE status = 'approved';
CREATE INDEX idx_cr_status        ON customer_reviews(status);

-- ── Transformation submissions ────────────────────────────────────
-- Progress stories — REQUIRES explicit consent + manual approval
-- Image uploads are NOT stored here (future: signed URL to R2/Supabase Storage)
CREATE TABLE IF NOT EXISTS transformation_submissions (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id    text NOT NULL,
  goal            text,
  duration_days   int,                     -- e.g. 30, 60, 90
  story_text      text NOT NULL,
  products_used   text[],                  -- slugs of products used
  stack_tier      text,
  consent_given   boolean DEFAULT false,   -- MUST be true before any display
  consent_text    text,                    -- exact consent language shown
  status          text DEFAULT 'pending',  -- pending|approved|featured|rejected
  featured_at     timestamptz,
  image_url       text,                    -- future: signed CDN URL (NOT raw upload)
  created_at      timestamptz DEFAULT now()
);

-- ── Community challenges ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_challenges (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           text NOT NULL,           -- e.g. "Desafío 30 días de creatina"
  description     text,
  goal            text,                    -- target fitness goal
  duration_days   int NOT NULL,
  reward_points   int DEFAULT 100,
  reward_label    text,                    -- e.g. "Insignia Constante"
  is_active       boolean DEFAULT false,   -- draft until activated
  starts_at       timestamptz,
  ends_at         timestamptz,
  participant_count int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ── Challenge participants ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_participations (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id    uuid NOT NULL REFERENCES community_challenges(id),
  anonymous_id    text NOT NULL,
  joined_at       timestamptz DEFAULT now(),
  completed_at    timestamptz,
  status          text DEFAULT 'active',   -- active|completed|dropped
  progress_pct    int DEFAULT 0,           -- 0-100
  UNIQUE(challenge_id, anonymous_id)
);

CREATE INDEX idx_cp_challenge_id  ON challenge_participations(challenge_id);
CREATE INDEX idx_cp_anonymous_id  ON challenge_participations(anonymous_id);

-- ── Ambassador profiles ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ambassador_profiles (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id    text NOT NULL,
  handle          text UNIQUE,             -- social handle or name
  platform        text,                    -- 'instagram'|'tiktok'|'youtube'|'gym'
  follower_count  int,
  level           text DEFAULT 'affiliate', -- 'affiliate'|'ambassador'|'athlete'|'partner'
  referral_code_id uuid REFERENCES referral_codes(id),
  commission_pct  decimal(5, 2) DEFAULT 0,
  total_conversions int DEFAULT 0,
  total_revenue_crc decimal(12, 2) DEFAULT 0,
  is_verified     boolean DEFAULT false,
  is_active       boolean DEFAULT true,
  notes           text,                    -- internal notes (admin only)
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── UGC moderation queue ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ugc_moderation_queue (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type    text NOT NULL,           -- 'review'|'transformation'|'challenge_proof'
  content_id      uuid NOT NULL,
  anonymous_id    text NOT NULL,
  auto_flags      text[],                  -- automated detection flags
  priority        text DEFAULT 'normal',   -- 'urgent'|'normal'|'low'
  assigned_to     text,                    -- future: moderation team member
  status          text DEFAULT 'pending',  -- pending|approved|rejected|escalated
  reviewed_at     timestamptz,
  decision_notes  text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_ugc_status       ON ugc_moderation_queue(status);
CREATE INDEX idx_ugc_content_type ON ugc_moderation_queue(content_type);

-- ── RLS for community tables ──────────────────────────────────────
ALTER TABLE loyalty_level_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_point_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transformation_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_challenges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambassador_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_moderation_queue        ENABLE ROW LEVEL SECURITY;

-- Public: loyalty level definitions (non-sensitive)
CREATE POLICY "loyalty_levels_anon_select"
  ON loyalty_level_config FOR SELECT TO anon USING (true);

-- Public: point rules (for display purposes)
CREATE POLICY "point_rules_anon_select"
  ON loyalty_point_rules FOR SELECT TO anon USING (is_active = true);

-- Customer reads own loyalty account
CREATE POLICY "loyalty_account_anon_select_own"
  ON loyalty_accounts FOR SELECT TO anon
  USING (anonymous_id = current_setting('app.anonymous_id', true));

-- Customer reads own referral code
CREATE POLICY "referral_codes_anon_select_own"
  ON referral_codes FOR SELECT TO anon
  USING (anonymous_id = current_setting('app.anonymous_id', true));

-- Any anon can look up a referral code (to validate at checkout)
CREATE POLICY "referral_codes_anon_lookup"
  ON referral_codes FOR SELECT TO anon
  USING (is_active = true);

-- Public: approved reviews (for display)
CREATE POLICY "reviews_anon_select_approved"
  ON customer_reviews FOR SELECT TO anon USING (status = 'approved');

-- Anon can submit review (goes to pending → moderation queue)
CREATE POLICY "reviews_anon_insert"
  ON customer_reviews FOR INSERT TO anon
  WITH CHECK (anonymous_id = current_setting('app.anonymous_id', true));

-- Public: active challenges
CREATE POLICY "challenges_anon_select_active"
  ON community_challenges FOR SELECT TO anon USING (is_active = true);

-- Anon can join challenges
CREATE POLICY "challenge_participations_anon_insert_own"
  ON challenge_participations FOR INSERT TO anon
  WITH CHECK (anonymous_id = current_setting('app.anonymous_id', true));

CREATE POLICY "challenge_participations_anon_select_own"
  ON challenge_participations FOR SELECT TO anon
  USING (anonymous_id = current_setting('app.anonymous_id', true));

-- All other tables: service role only (moderation, scoring, admin)

-- ── Updated-at triggers ───────────────────────────────────────────
CREATE TRIGGER loyalty_accounts_updated_at   BEFORE UPDATE ON loyalty_accounts   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER referral_codes_updated_at     BEFORE UPDATE ON referral_codes     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ambassador_profiles_updated_at BEFORE UPDATE ON ambassador_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customer_reviews_updated_at   BEFORE UPDATE ON customer_reviews   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
