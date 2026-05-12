# Ecommerce Trust Alignment Report

Generated: 2026-05-11

## Build Result

✓ 1096 modules — built in 2.77s — zero errors — zero warnings

---

## 1. Account System — Reworked to Honest Waitlist

**File:** `src/components/AccountPreview.jsx`

| Element | Before | After |
|---|---|---|
| Badge | Próximamente | **Miembros fundadores** |
| Title | Tu cuenta MacroForge | **Acceso prioritario MacroForge** |
| Description | "Guardá tus productos favoritos…" *(implied real accounts)* | **"Estamos construyendo el programa de membresía… Los primeros en registrarse tendrán acceso prioritario…"** |
| Perks | "Lista de favoritos", "Historial de consultas" | **"Precios preferenciales", "Acceso anticipado", "Notificaciones directas", "Asesoría sin lista de espera"** |
| Submit | "Unirme a la lista" | **"Reservar mi lugar"** |
| Disclaimer | "Sin spam · Sin compromiso · Solo te avisamos cuando esté listo." | **"Sin spam · Sin compromiso · Te avisamos cuando se active el programa."** |
| Success msg | "Pronto activaremos las cuentas MacroForge." | **"Tu lugar está reservado. Te avisaremos por correo cuando el programa de membresía MacroForge esté activo."** |

**Operational truth preserved:** Form still has zero backend connection, zero data storage. It's a premium interest-capture UI, now clearly positioned as a founders waitlist.

---

## 2. AlfaVitamins Section — Removed

**Files:** `src/App.jsx`, `src/index.css`

- `<BrandTeaser />` render call removed from `App.jsx`
- `lazy(() => import('./components/BrandTeaser'))` import removed from `App.jsx`
- Entire `.brand-teaser` CSS block removed from `index.css` (~56 lines of dead CSS)
- `BrandTeaser.jsx` component file preserved (not deleted) for possible future reuse
- No spacing break — `AccountPreview` flows cleanly into the `<footer>`

---

## 3. Subscription Flow Messaging — Aligned with Real Operations

### RetentionEngineLayer (scrollable content)

| Element | Before | After |
|---|---|---|
| Section title | "Suscribirte y ahorrar X%" | **"Suscripción personalizada · X% off"** |
| Description | "Recibí tu stack cada X días. Ideal para no quedarte sin suplementos. Cancelás o ajustás cuando querás." | **"Recibí tu stack cada X días con descuento preferencial. Lo coordinamos directamente por WhatsApp antes de activar."** |
| Button | "📅 Suscribirme · X% off" | **"📅 Iniciar suscripción personalizada"** |

### StackCheckoutLayer (sticky footer)

| Element | Before | After |
|---|---|---|
| Subscription sub-meta | "· cada 30 días" | **"· Coordinada por WhatsApp"** |

**Infrastructure preserved:** All subscription backend calls, analytics events, error handling, and WhatsApp fallback logic are **unchanged**. The system still attempts Shopify subscription; on failure, routes to WhatsApp. Copy now accurately reflects this coordinated workflow.

---

## 4. Payment CTA — Aligned with Real Operations

**File:** `src/components/StackCheckoutLayer.jsx`

| State | Before | After |
|---|---|---|
| Default | "⚡ Pagar ahora" | **"⚡ Confirmar pedido"** |
| Error state | "⚡ Reintentar pago" | **"⚡ Reintentar"** |

**Infrastructure preserved:** Shopify checkout initiation, error routing, WhatsApp concierge fallback, all analytics events — all **unchanged**.

---

## 5. Trust Copy Context

- App.jsx trust bar: already updated in previous session ("Atención personalizada" replacing "Respuesta en minutos")
- WhySection.jsx: already updated
- GuidePage.jsx: already updated

---

## 6. Mobile QA

- No empty spaces introduced — BrandTeaser had padding that is now gone; the footer follows AccountPreview cleanly
- No broken spacing — AccountPreview's `border-top` still creates section separation from AIStackBuilder
- All existing mobile fixes (modal height, safe-area, stat grid) preserved
- No interactive elements removed from non-mobile flows

---

## 7. Checkout QA

- Checkout flow: ✓ functional (only CTA copy changed)
- WhatsApp fallback: ✓ unchanged
- Subscription attempt: ✓ unchanged (tries Shopify, falls back to WhatsApp)
- Retention layer: ✓ unchanged (refill timeline, save favorites)
- Analytics events: ✓ unchanged

---

## 8. Systems Preserved for Future Activation

| System | Status |
|---|---|
| Shopify checkout (`/api/shopify/draft-order`) | Infrastructure intact, CTA copy updated |
| Subscription backend (`/api/shopify/subscription`) | Infrastructure intact, copy updated |
| Analytics + Meta Pixel events | 100% unchanged |
| WhatsApp automation queue | Unchanged |
| Stack persistence + favorites | Unchanged |
| Loyalty/referral architecture | Unchanged |
| Segmentation + lead scoring | Unchanged |

---

## Summary

MacroForge now presents every visible UI element in alignment with its actual operational reality:

- **Account section** = honest waitlist, not a fake live account system
- **AlfaVitamins** = removed (no longer relevant to brand priorities)
- **Subscriptions** = framed as personally coordinated, not fully automated
- **Payment CTA** = "Confirmar pedido" (order confirmation), not direct billing promise
- **All WhatsApp fallbacks** = remain as the primary real-world conversion path
