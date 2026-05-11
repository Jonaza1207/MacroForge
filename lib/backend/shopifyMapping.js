/**
 * MacroForge — Shopify Product Mapping
 *
 * Phase 10 — Shopify Commerce Activation
 * SERVER-SIDE ONLY.
 *
 * Maps MacroForge product slugs → Shopify variant IDs.
 *
 * Lookup priority:
 *   1. Supabase shopify_products table (dynamic, sync-able)
 *   2. Graceful error if not found
 *
 * Product sync:
 *   Run the sync utility after uploading products to Shopify.
 *   POST /api/shopify/order-sync?action=sync_products
 *   This populates the shopify_products table from your Shopify catalog.
 *
 * Multi-store future:
 *   Each store_domain gets its own rows in shopify_products.
 *   Filter by store_domain to support regional catalogs.
 */

import { supabase } from './supabase.js';
import { ShopifyError } from './shopify.js';

const DEFAULT_QUANTITY = 1;
const MAX_LINE_ITEMS   = 10;  // Shopify limit per draft order

// ── Slug extraction ───────────────────────────────────────────────
// Extract slug from MacroForge product URL
// URL format: https://suplementosfh.com/tienda/[slug]/
function extractSlug(productUrl) {
  if (!productUrl) return null;
  const match = productUrl.match(/\/tienda\/([^/?#]+)/);
  return match ? match[1] : null;
}

// ── Main mapping function ─────────────────────────────────────────

/**
 * Map an array of MacroForge product IDs to Shopify line items.
 * Skips unmapped products (graceful degradation — partial stack checkout).
 *
 * @param {string[]}  productIds    — MacroForge product IDs from the stack
 * @param {object}    productsMap   — PRODUCTS from the frontend catalog (passed from API)
 * @returns {{ lineItems, unmapped, mapped }}
 */
export async function mapProductsToLineItems(productIds, productsMap) {
  if (!productIds?.length) throw new ShopifyError(400, 'No product IDs provided');

  // Extract slugs from product URLs
  const slugs = productIds
    .map(id => {
      const p = productsMap?.[id];
      return { id, slug: extractSlug(p?.u), name: p?.n, brand: p?.b };
    })
    .filter(item => item.slug);

  if (slugs.length === 0) {
    throw new ShopifyError(400, 'No valid product slugs found. Ensure products have valid catalog URLs.');
  }

  // Batch lookup from Supabase
  const slugList = slugs.map(s => s.slug);
  const { data: mappings } = await supabase
    .from('shopify_products')
    .in('mf_slug', slugList)
    .eq('is_active', true)
    .select('mf_slug, shopify_variant_id, price_crc, inventory_quantity, title');

  const mappingBySlug = Object.fromEntries(
    (mappings || []).map(m => [m.mf_slug, m])
  );

  const lineItems = [];
  const mapped    = [];
  const unmapped  = [];

  for (const { id, slug, name, brand } of slugs) {
    const shopifyProduct = mappingBySlug[slug];

    if (!shopifyProduct) {
      unmapped.push({ id, slug, name, reason: 'not_in_shopify_catalog' });
      continue;
    }

    // Inventory check (soft — warn but don't block if no inventory data)
    if (shopifyProduct.inventory_quantity !== null && shopifyProduct.inventory_quantity <= 0) {
      unmapped.push({ id, slug, name, reason: 'out_of_stock' });
      continue;
    }

    lineItems.push({
      variant_id: Number(shopifyProduct.shopify_variant_id),
      quantity:   DEFAULT_QUANTITY,
      title:      shopifyProduct.title || name,  // fallback to MacroForge name
    });

    mapped.push({ id, slug, name, brand, variant_id: Number(shopifyProduct.shopify_variant_id) });
  }

  return {
    lineItems: lineItems.slice(0, MAX_LINE_ITEMS),
    mapped,
    unmapped,
  };
}

/**
 * Build a catalog sync payload for updating Supabase from Shopify product data.
 * Called by /api/shopify/order-sync?action=sync_products
 */
export function buildSyncPayload(shopifyProduct, mfSlug) {
  const variant = shopifyProduct.variants?.[0];
  if (!variant) return null;

  return {
    mf_slug:            mfSlug,
    shopify_product_id: shopifyProduct.id,
    shopify_variant_id: variant.id,
    title:              shopifyProduct.title,
    variant_title:      variant.title !== 'Default Title' ? variant.title : null,
    sku:                variant.sku,
    price_crc:          parseFloat(variant.price || '0'),
    compare_at_price_crc: parseFloat(variant.compare_at_price || '0'),
    inventory_quantity: variant.inventory_quantity,
    is_active:          shopifyProduct.status === 'active',
    last_synced_at:     new Date().toISOString(),
  };
}
