/**
 * MacroForge — Frontend Referral Code Tracking
 *
 * Phase 13 — Scale + Media + Community Ecosystem
 * FRONTEND-SAFE. No secrets. localStorage + URL params only.
 *
 * Handles:
 *   1. Capturing referral codes from URL (?ref=MF-XXXXXX)
 *   2. Storing captured referral codes for checkout attribution
 *   3. Deriving own referral code from anonymous_id (for display)
 *
 * Referral code format: MF-[6 alphanumeric chars] (uppercase)
 * Example: MF-A3X9K2
 *
 * Security:
 *   - Codes are validated server-side at checkout
 *   - Frontend only captures and displays — never awards points
 *   - Self-referral prevented server-side (anonymous_id comparison)
 *   - Codes expire after 30 days in localStorage
 */

import { getAnonymousId } from './segmentation';
import { analytics }      from './analytics';

const CODE_PATTERN    = /^MF-[A-Z0-9]{5,6}$/;
const STORAGE_KEY     = 'mf_referral_code';
const TIMESTAMP_KEY   = 'mf_referral_ts';
const EXPIRY_MS       = 30 * 86400_000;  // 30 days

// ── Capture from URL ──────────────────────────────────────────────

/**
 * Capture a referral code from URL parameters.
 * Call on initial page load (App.jsx useEffect).
 * Returns the captured code or null.
 */
export function captureReferralFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code   = (params.get('ref') || params.get('utm_ref') || '').toUpperCase().trim();

    if (!code || !CODE_PATTERN.test(code)) return null;

    // Don't store if it's own code (will be validated server-side too, but good UX)
    const ownCode = deriveOwnReferralCode();
    if (code === ownCode) return null;

    localStorage.setItem(STORAGE_KEY, code);
    localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));

    analytics.communityEvent('referral_code_captured', { code_prefix: code.slice(0, 6) });

    return code;
  } catch {
    return null;
  }
}

/**
 * Get the stored referral code (if not expired).
 * Used when building checkout payload.
 */
export function getStoredReferralCode() {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    const ts   = parseInt(localStorage.getItem(TIMESTAMP_KEY) || '0', 10);
    if (code && CODE_PATTERN.test(code) && (Date.now() - ts) < EXPIRY_MS) {
      return code;
    }
    // Expired — clear it
    if (code) clearStoredReferralCode();
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear the stored referral code (after successful attribution).
 */
export function clearStoredReferralCode() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
  } catch {}
}

// ── Own referral code ─────────────────────────────────────────────

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Derive the customer's own referral code from their anonymous_id.
 * Deterministic — same input always produces same code.
 * No backend call needed for display purposes.
 * Backend generates the same code via deriveReferralCode() in referralSystem.js.
 */
export function deriveOwnReferralCode() {
  const anonymousId = getAnonymousId();
  if (!anonymousId) return null;

  // Simple but consistent derivation
  const seed = anonymousId.replace(/[^a-z0-9]/g, '');
  let code   = 'MF-';

  for (let i = 0; i < 6; i++) {
    // Use different segments of the anonymous_id
    const charIdx = parseInt(seed.slice(i * 2, i * 2 + 2) || '00', 36) % CODE_CHARS.length;
    code += CODE_CHARS[charIdx];
  }

  return code;
}

/**
 * Generate the full referral link.
 */
export function getReferralLink() {
  const code = deriveOwnReferralCode();
  if (!code) return null;
  const base = window.location.origin + (window.location.pathname || '/');
  return `${base}?ref=${code}`;
}

/**
 * Copy referral link to clipboard and track.
 */
export async function copyReferralLink() {
  const link = getReferralLink();
  if (!link) return false;
  try {
    await navigator.clipboard.writeText(link);
    analytics.communityEvent('referral_link_copied', {});
    return true;
  } catch { return false; }
}
