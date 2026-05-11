-- ══════════════════════════════════════════════════════════════════
-- MacroForge — Seed Data
-- Phase 9 — Campaign settings and global config
-- ══════════════════════════════════════════════════════════════════

-- ── Global settings ───────────────────────────────────────────────
INSERT INTO global_settings (key, value, updated_by) VALUES
  ('automation_enabled',     'false',               'setup'),  -- START DISABLED. Enable after provider configured.
  ('maintenance_mode',       'false',               'setup'),
  ('send_window_tz',         'America/Costa_Rica',  'setup'),
  ('max_daily_sends_global', '500',                 'setup'),  -- global daily cap across all campaigns
  ('circuit_failure_threshold', '5',               'setup'),  -- open circuit after 5 consecutive failures
  ('circuit_cooldown_minutes',  '30',              'setup')   -- attempt recovery after 30min
ON CONFLICT (key) DO NOTHING;

-- ── Campaign settings (kill switches + caps) ──────────────────────
INSERT INTO campaign_settings (campaign_id, enabled, daily_cap, per_customer_cap, cooldown_hours, send_window_start, send_window_end, timezone, priority) VALUES
  ('abandoned_stack_24h',        false, 200, 1, 24,  '09:00', '18:00', 'America/Costa_Rica', 1),
  ('refill_reminder_75',         false, 300, 1, 168, '09:00', '17:00', 'America/Costa_Rica', 2),  -- 168h = 7 days
  ('vip_reorder',                false, 50,  1, 336, '09:00', '17:00', 'America/Costa_Rica', 3),  -- 336h = 14 days
  ('loyalty_followup_7d',        false, 200, 1, 240, '10:00', '16:00', 'America/Costa_Rica', 4),  -- 240h = 10 days
  ('premium_reactivation_14d',   false, 100, 1, 504, '09:00', '17:00', 'America/Costa_Rica', 5)   -- 504h = 21 days
ON CONFLICT (campaign_id) DO NOTHING;

-- ── Provider health baseline ──────────────────────────────────────
INSERT INTO provider_health (provider, status, circuit_state) VALUES
  ('360dialog', 'unknown', 'closed'),
  ('twilio',    'unknown', 'closed'),
  ('meta',      'unknown', 'closed')
ON CONFLICT (provider) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
-- ACTIVATION CHECKLIST (complete before setting automation_enabled = 'true'):
--
-- □ 1. Configure provider: WHATSAPP_PROVIDER in Vercel env vars
-- □ 2. Add provider credentials: WHATSAPP_API_KEY, WHATSAPP_PHONE_ID
-- □ 3. Get WhatsApp templates approved in Meta Business Manager
-- □ 4. Configure webhook: WHATSAPP_WEBHOOK_SECRET in Vercel env vars
-- □ 5. Set CRON_SECRET in Vercel env vars
-- □ 6. Test /api/automation/health endpoint
-- □ 7. Send test message manually via /api/whatsapp/send (test mode)
-- □ 8. Enable ONE campaign: UPDATE campaign_settings SET enabled=true WHERE campaign_id='abandoned_stack_24h'
-- □ 9. Enable consent collection in frontend checkout flow
-- □ 10. Monitor for 48h before enabling additional campaigns
-- □ 11. Set automation_enabled = 'true': UPDATE global_settings SET value='true' WHERE key='automation_enabled'
-- ══════════════════════════════════════════════════════════════════
