/**
 * MacroForge — Stack Persistence (Save-for-Later)
 *
 * Frontend-only localStorage persistence for saved stacks.
 * Allows users to save their stack and restore it on the next visit.
 *
 * Storage: 'mf_saved_stack' — single saved stack (most recent)
 * No accounts, no backend, no PII.
 *
 * Stack data format:
 *   type: 'guided' | 'manual'
 *   selections: { goal, experience, budget, frequency } (guided only)
 *   productIds: string[] (manual only, or guided fallback slugs)
 *   savedAt: timestamp
 *   version: number (increment when format changes to auto-clear stale data)
 *
 * ── Future backend evolution (Phase 5) ──────────────────────────
 * TODO: When Supabase is active, sync saved stacks server-side:
 *   POST /api/stack/save
 *   Body: { anonymous_id, type, selections, product_ids }
 *   Table: customer_preferences(id, user_id, stack_type, stack_data, saved_at)
 *
 * This enables:
 *   - Cross-device stack restoration (login required)
 *   - Abandoned stack email/WhatsApp reminders
 *   - Personalized homepage showing "your saved stack"
 *   - Refill reminder when supply estimate is reached
 */

const KEY     = 'mf_saved_stack';
const VERSION = 2; // increment this to auto-clear outdated saved stacks

const SAVE_EVENT = 'mf:stack-saved';

/**
 * Save a stack to localStorage.
 * Dispatches 'mf:stack-saved' so the trigger section re-renders.
 *
 * @param {{ type: 'guided'|'manual', selections?: object, productIds?: string[] }} data
 */
export function saveStack(data) {
  try {
    const payload = { ...data, savedAt: Date.now(), version: VERSION };
    localStorage.setItem(KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event(SAVE_EVENT));
  } catch { /* storage full or disabled — silent */ }
}

/**
 * Retrieve the saved stack.
 * Returns null if nothing is saved or if the saved version is outdated.
 */
export function getSavedStack() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Auto-clear stale stacks when format version changes
    if (data.version !== VERSION) {
      clearSavedStack();
      return null;
    }
    return data;
  } catch { return null; }
}

/** Returns true if a valid saved stack exists. */
export function hasSavedStack() {
  return Boolean(getSavedStack());
}

/**
 * Clear the saved stack.
 * Called after restore or explicit dismiss.
 */
export function clearSavedStack() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(SAVE_EVENT));
  } catch {}
}

/** Event name — subscribe to know when a stack is saved or cleared. */
export const STACK_SAVED_EVENT = SAVE_EVENT;
