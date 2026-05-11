/**
 * MacroForge — Shopify Admin API Client
 *
 * Phase 10 — Shopify Commerce Activation
 * SERVER-SIDE ONLY. Never import from frontend.
 *
 * Uses Shopify Admin API via fetch(). No SDK required.
 *
 * Security:
 *   SHOPIFY_STORE_DOMAIN    — your store (e.g. macroforge.myshopify.com)
 *   SHOPIFY_ADMIN_API_TOKEN — Admin API access token (PRIVATE — Vercel env vars only)
 *   SHOPIFY_API_VERSION     — API version (e.g. 2024-01)
 *
 * NEVER expose SHOPIFY_ADMIN_API_TOKEN to frontend.
 * NEVER log SHOPIFY_ADMIN_API_TOKEN.
 * Frontend only calls MacroForge's own /api/shopify/* endpoints.
 *
 * PCI compliance:
 *   MacroForge NEVER processes card data.
 *   All payments happen on Shopify's PCI-compliant hosted checkout.
 *   We only create draft orders and redirect to Shopify's payment page.
 */

const STORE    = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN    = process.env.SHOPIFY_ADMIN_API_TOKEN;
const VERSION  = process.env.SHOPIFY_API_VERSION || '2024-01';

if (!STORE || !TOKEN) {
  throw new Error(
    '[MacroForge Shopify] SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN are required. ' +
    'Set in Vercel environment variables. NEVER commit to Git.'
  );
}

const BASE    = `https://${STORE}/admin/api/${VERSION}`;
const HEADERS = {
  'X-Shopify-Access-Token': TOKEN,
  'Content-Type':           'application/json',
  // NEVER log TOKEN. Never return it in responses.
};

// ── Shopify API error ─────────────────────────────────────────────
export class ShopifyError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name   = 'ShopifyError';
    this.status = status;
    this.errors = errors;
  }
}

// ── Core request helper ───────────────────────────────────────────
async function shopifyRequest(path, { method = 'GET', body } = {}) {
  const url = `${BASE}/${path}`;
  const res = await fetch(url, {
    method,
    headers: HEADERS,
    body:    body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    const message = data?.errors
      ? (typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors))
      : `Shopify API error ${res.status}`;
    throw new ShopifyError(res.status, message, data?.errors);
  }

  return data;
}

// ── Draft Order API ───────────────────────────────────────────────

/**
 * Create a Shopify draft order.
 * Returns the full draft order object including checkout_url.
 *
 * @param {object} draftOrderInput — Shopify draft order body
 * @returns {object} — { draft_order: { id, checkout_url, invoice_url, ... } }
 */
export async function createDraftOrder(draftOrderInput) {
  return shopifyRequest('draft_orders.json', {
    method: 'POST',
    body:   { draft_order: draftOrderInput },
  });
}

/**
 * Get a draft order by ID.
 */
export async function getDraftOrder(draftOrderId) {
  return shopifyRequest(`draft_orders/${draftOrderId}.json`);
}

/**
 * Complete a draft order (mark as paid — for future use with Pay Later flows).
 */
export async function completeDraftOrder(draftOrderId) {
  return shopifyRequest(`draft_orders/${draftOrderId}/complete.json`, { method: 'PUT' });
}

// ── Product/Variant API ───────────────────────────────────────────

/**
 * Get a product variant by ID. Used for inventory validation.
 */
export async function getVariant(variantId) {
  return shopifyRequest(`variants/${variantId}.json`);
}

/**
 * Get inventory levels for variants. Used for stock availability checks.
 */
export async function getInventoryLevels(variantIds) {
  const ids = variantIds.join(',');
  return shopifyRequest(`inventory_levels.json?inventory_item_ids=${ids}&location_ids=${process.env.SHOPIFY_LOCATION_ID || ''}`);
}

// ── Order API ─────────────────────────────────────────────────────

/**
 * Get a Shopify order by ID.
 */
export async function getOrder(orderId) {
  return shopifyRequest(`orders/${orderId}.json`);
}

/**
 * Add tags to a Shopify order.
 */
export async function updateOrderTags(orderId, tags) {
  return shopifyRequest(`orders/${orderId}.json`, {
    method: 'PUT',
    body:   { order: { id: orderId, tags: tags.join(',') } },
  });
}

// ── Shopify health check ──────────────────────────────────────────

/**
 * Lightweight API health check — does not create or modify data.
 */
export async function checkShopifyHealth() {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}/shop.json`, {
      headers: HEADERS,
      signal:  AbortSignal.timeout(5000),
    });
    return { ok: res.ok, latencyMs: Date.now() - start, status: res.status };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}
