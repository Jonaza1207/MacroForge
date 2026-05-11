/**
 * MacroForge — Revenue Tracking Initialization
 * Phase 3.6 — Dynamic GA4 + Meta Pixel activation
 *
 * Loads tracking scripts DYNAMICALLY from JavaScript.
 * No changes to index.html required. No hardcoded IDs.
 *
 * ── Public IDs (safe to have in frontend code) ──────────────────
 *   VITE_GA4_ID    — GA4 Measurement ID       format: G-XXXXXXXXXX
 *   VITE_PIXEL_ID  — Meta Pixel ID             format: 16-digit number
 *
 *   These IDs are visible in browser source by design.
 *   They cannot be used to write data or access private information.
 *   This is the same as having them in the HTML source — standard practice.
 *
 * ── NEVER add to frontend code ──────────────────────────────────
 *   Meta Conversion API access tokens     (server-side only)
 *   GA4 Measurement Protocol API secrets  (server-side only)
 *   Supabase service_role key             (server-side only)
 *   Any private API credentials           (server-side only)
 *
 * ── Activation (local development) ──────────────────────────────
 * Create .env in project root (already in .gitignore):
 *   VITE_GA4_ID=G-XXXXXXXXXX
 *   VITE_PIXEL_ID=1234567890123456
 *
 * ── Activation (GitHub Pages / GitHub Actions) ───────────────────
 * 1. Go to: github.com/[username]/MacroForge/settings/secrets/actions
 * 2. Add secret: Name = VITE_GA4_ID,   Value = G-XXXXXXXXXX
 * 3. Add secret: Name = VITE_PIXEL_ID, Value = 1234567890123456
 * 4. Update .github/workflows/deploy.yml build step:
 *
 *    - name: Build
 *      env:
 *        VITE_GA4_ID:   ${{ secrets.VITE_GA4_ID }}
 *        VITE_PIXEL_ID: ${{ secrets.VITE_PIXEL_ID }}
 *      run: npm run build
 *
 * ── How the queuing works ────────────────────────────────────────
 * Both GA4 and Meta Pixel use native event queuing:
 *   - GA4:   window.dataLayer collects events; gtag.js replays them on load
 *   - Pixel: fbq.queue collects events; fbevents.js replays them on load
 * Events fired before scripts finish downloading are NOT lost.
 *
 * ── Future server-side tracking (Phase 5) ──────────────────────
 * TODO: Meta Conversions API
 *   POST /api/pixel-event (Vercel Edge Function)
 *   Sends deduped events server-side → better attribution, bypasses blockers
 *   Requires: Meta access token (server-only, never frontend)
 *
 * TODO: GA4 Measurement Protocol
 *   POST /api/ga4-event (Vercel Edge Function)
 *   Requires: GA4 API secret (server-only, never frontend)
 */

// ── IDs from Vite build-time env vars ────────────────────────────
// If undefined, this module gracefully no-ops — app always works.
const GA4_ID   = import.meta.env?.VITE_GA4_ID   || null;
const PIXEL_ID = import.meta.env?.VITE_PIXEL_ID  || null;

let _ga4Ready   = false;
let _pixelReady = false;

// ── GA4 initialization ────────────────────────────────────────────

function _loadGA4(id) {
  if (_ga4Ready || !id || typeof window === 'undefined') return;
  _ga4Ready = true;

  // Set up dataLayer + gtag stub SYNCHRONOUSLY before the script loads.
  // Any gtag() calls before the script arrives queue in window.dataLayer.
  // When gtag.js loads, it processes the entire queue — zero events lost.
  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }

  window.gtag('js', new Date());
  window.gtag('config', id, {
    send_page_view: false,       // SPA: page_view sent manually via analytics.pageView()
    cookie_flags:   'SameSite=None;Secure',
    anonymize_ip:   true,        // privacy-friendly
  });

  // Async script — non-blocking
  const s    = document.createElement('script');
  s.async    = true;
  s.src      = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  s.onerror  = () => {};         // silent fail — events stay in localStorage buffer
  document.head.appendChild(s);
}

// ── Meta Pixel initialization ─────────────────────────────────────

function _loadPixel(id) {
  if (_pixelReady || !id || typeof window === 'undefined') return;
  _pixelReady = true;

  // Set up fbq stub SYNCHRONOUSLY before the script loads.
  // fbq.queue holds events until fbevents.js processes them on load.
  if (!window.fbq) {
    const fbq = function () {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    fbq.push    = fbq;
    fbq.loaded  = true;
    fbq.version = '2.0';
    fbq.queue   = [];
    window.fbq  = fbq;
    window._fbq = fbq;
  }

  window.fbq('init', id);
  // NOTE: Do NOT call fbq('track','PageView') here.
  //       analytics.pageView() fires it manually on SPA route changes
  //       to prevent duplicate fires.

  // Async script — non-blocking
  const s   = document.createElement('script');
  s.async   = true;
  s.src     = 'https://connect.facebook.net/en_US/fbevents.js';
  s.onerror = () => {}; // silent fail
  const ref = document.getElementsByTagName('script')[0];
  if (ref?.parentNode) ref.parentNode.insertBefore(s, ref);
  else document.head.appendChild(s);
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Initialize GA4 + Meta Pixel tracking.
 * Called once at analytics module load.
 * Completely safe to call when env vars are missing.
 */
export function initTracking() {
  try {
    if (GA4_ID)   _loadGA4(GA4_ID);
    if (PIXEL_ID) _loadPixel(PIXEL_ID);
  } catch {
    // Never crash — tracking is supplemental, never critical
  }

  if (import.meta.env?.DEV) {
    const missing = [
      !GA4_ID   && 'VITE_GA4_ID',
      !PIXEL_ID && 'VITE_PIXEL_ID',
    ].filter(Boolean);

    if (missing.length) {
      // eslint-disable-next-line no-console
      console.info(
        '%c[MacroForge] Revenue tracking inactive — add to .env:',
        'color:#888;font-size:11px',
        missing.map(k => `\n  ${k}=YOUR_ID`).join('')
      );
    } else {
      // eslint-disable-next-line no-console
      console.info(
        '%c[MacroForge] GA4 ✓  Meta Pixel ✓  Tracking active.',
        'color:#00C896;font-size:11px'
      );
    }
  }
}

/**
 * Current tracking status — safe for dev console logging.
 * Shows only the first 4 chars of each ID to confirm config
 * without leaking the full ID.
 */
export const TRACKING_STATUS = {
  ga4Active:    Boolean(GA4_ID),
  pixelActive:  Boolean(PIXEL_ID),
  ga4Preview:   GA4_ID   ? `${String(GA4_ID).slice(0, 4)}...`   : null,
  pixelPreview: PIXEL_ID ? `${String(PIXEL_ID).slice(0, 4)}...`  : null,
};
