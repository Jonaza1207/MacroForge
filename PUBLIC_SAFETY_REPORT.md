# MacroForge — Public Launch Safety Report
**Phase 11 — Completed audit: May 2026**

## VERDICT: ✅ SAFE FOR PUBLIC DEPLOYMENT

The MacroForge frontend is safe to deploy publicly. No secrets are exposed in the browser bundle.

---

## Security Architecture

### Frontend (public) — `src/`
Only public data and behavioral logic:
- `VITE_GA4_ID` — public GA4 Measurement ID (visible by design)
- `VITE_PIXEL_ID` — public Meta Pixel ID (visible by design)
- `import.meta.env.DEV` — Vite build flag (stripped in production)
- All API calls route to MacroForge's own `/api/*` endpoints (never to Shopify/Supabase directly)

### Backend (private) — `lib/backend/` + `api/`
Server-side only via Vercel environment variables:
- `SUPABASE_SERVICE_ROLE_KEY` — never in frontend
- `SHOPIFY_ADMIN_API_TOKEN` — never in frontend
- `WHATSAPP_API_KEY` / `TWILIO_AUTH_TOKEN` / `360dialog key` — never in frontend
- `CRON_SECRET` — never in frontend
- `WHATSAPP_WEBHOOK_SECRET` / `SHOPIFY_WEBHOOK_SECRET` — never in frontend

---

## Audit Findings

| Check | Status | Notes |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` in src/ | ✅ None | Backend only |
| `SHOPIFY_ADMIN_API_TOKEN` in src/ | ✅ None | Backend only |
| `TWILIO_AUTH_TOKEN` in src/ | ✅ None | Backend only |
| `WHATSAPP_API_KEY` in src/ | ✅ None | Backend only |
| `CRON_SECRET` in src/ | ✅ None | Backend only |
| Direct Shopify Admin API calls from frontend | ✅ None | Routes through /api/shopify/* |
| Direct Supabase service role calls from frontend | ✅ None | Routes through /api/* |
| `process.env.*` in src/ | ✅ None | Uses `import.meta.env.VITE_*` only |
| Imports from `lib/backend/` in src/ | ✅ None | Properly isolated |
| PII collected without consent | ✅ None | Anonymous IDs only |
| Card data handled by MacroForge | ✅ None | Shopify-hosted checkout |
| Secrets logged | ✅ None | Only behavioral events logged |
| WhatsApp auto-sent without consent | ✅ None | Consent required by architecture |

---

## Only Finding (Resolved)
**`.gitignore` missing `.env*` patterns** — Fixed in Phase 11.
Low severity since the project has no frontend secrets to store in `.env` files, but important as a best practice to prevent accidental future commits.

---

## Compliance Notes

**PCI DSS:** MacroForge never handles card numbers, CVV, or payment authorization. All payment processing happens on Shopify's PCI-compliant hosted checkout. MacroForge only creates draft orders (shopping carts) and redirects customers to Shopify.

**GDPR/LOPDP (Costa Rica):** 
- Anonymous IDs only in frontend (no real names, emails, or phone numbers)
- Phone numbers only stored in Supabase backend (server-side, with consent)
- WhatsApp automation requires explicit opt-in
- wa_consent table records: granted_at, revoked_at, ip_hash (not raw IP)
- STOP command handling implemented in webhook processor

**WhatsApp Business Policy:** All automated WhatsApp messages require:
1. Pre-approved message templates (Meta Business Manager)
2. Explicit customer opt-in (wa_consent table)
3. STOP command support (webhook handler)

---

## Production Deployment Checklist

Before going live:
- [ ] Verify `npm run build` has no errors
- [ ] Verify bundle contains no `process.env.SHOPIFY_ADMIN` references
- [ ] Add `VITE_GA4_ID` and `VITE_PIXEL_ID` to GitHub Actions secrets
- [ ] Set all backend env vars in Vercel project settings (not in code)
- [ ] Run Supabase migrations 001–005 in order
- [ ] Test `/api/automation/health` endpoint
- [ ] Test `/api/shopify/draft-order` with a test product
- [ ] Test webhook signature verification
- [ ] Confirm `shopify_checkout_enabled = 'false'` until products are mapped
- [ ] Confirm `automation_enabled = 'false'` until consent flow is active
- [ ] Confirm `subscription_enabled = 'false'` until Selling Plans are configured

---

*Last updated: Phase 11 — Subscription + Recurring Revenue Activation*
