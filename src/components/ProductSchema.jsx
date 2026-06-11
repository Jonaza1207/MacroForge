import { useEffect } from 'react';

const BASE_URL   = 'https://macroforge-health.vercel.app';
const SCRIPT_ID  = 'mf-product-schema';
const SELLER_REF = `${BASE_URL}/#organization`;

/**
 * Build the official MacroForge deep link from a catalog source URL.
 * Returns undefined if the source URL has no valid product slug.
 * Never throws — always safe to call with arbitrary product data.
 */
function buildProductUrl(value) {
  if (!value || typeof value !== 'string') return undefined;
  try {
    const trimmed = value.trim();
    if (!/^https?:\/\//i.test(trimmed)) return undefined;
    const sourceUrl = new URL(trimmed);
    const slug = sourceUrl.pathname.match(/\/tienda\/([^/?#]+)/)?.[1];
    return slug ? `${BASE_URL}/#product/${slug}` : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract the numeric price value from a raw price string.
 * Handles Costa Rican format: "₡ 26 000 2lbs" → 26000
 *
 * Strategy: split on whitespace, collect consecutive all-digit tokens,
 * stop at the first token that contains a non-digit (unit/descriptor).
 * This correctly handles "₡ 26 000 2lbs" (stops before "2lbs")
 * and "₡ 29 000" (consumes both digit tokens).
 */
function extractPrice(priceStr) {
  if (!priceStr) return null;
  const stripped = priceStr.replace(/₡\s*/, ''); // strip ₡ (U+20A1)
  const tokens = stripped.trim().split(/\s+/);
  let numStr = '';
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      numStr += token;
    } else {
      break; // stop at first non-digit token (unit, parens, etc.)
    }
  }
  if (!numStr) return null;
  const num = parseInt(numStr, 10);
  return isNaN(num) ? null : num;
}

/**
 * ProductSchema — injects a Product JSON-LD script into <head>
 * while a product is being viewed in the modal.
 *
 * Lifecycle:
 * - mount:   creates/updates the <script> tag
 * - unmount: removes it (clean separation between products)
 *
 * This is Google-crawlable because Googlebot executes JavaScript.
 */
export default function ProductSchema({ product }) {
  useEffect(() => {
    if (!product) return;

    const price = extractPrice(product.p?.[0]);

    const productUrl = buildProductUrl(product.u);

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': product.n,
      'brand': {
        '@type': 'Brand',
        'name': product.b,
      },
      'category': product.c,
      'description': `${product.n} de ${product.b}. Suplemento original disponible en MacroForge Costa Rica. Categoría: ${product.c}.`,
      ...(productUrl ? { 'url': productUrl } : {}),
      'offers': {
        '@type': 'Offer',
        'priceCurrency': 'CRC',
        ...(price ? { 'price': price } : {}),
        'priceValidUntil': '2026-12-31',
        'availability': 'https://schema.org/InStock',
        'itemCondition': 'https://schema.org/NewCondition',
        'shippingDetails': {
          '@type': 'OfferShippingDetails',
          'shippingRate': { '@type': 'MonetaryAmount', 'currency': 'CRC' },
          'deliveryTime': {
            '@type': 'ShippingDeliveryTime',
            'handlingTime': { '@type': 'QuantitativeValue', 'minValue': 1, 'maxValue': 2, 'unitCode': 'DAY' },
          },
          'shippingDestination': {
            '@type': 'DefinedRegion',
            'addressCountry': 'CR',
          },
        },
        'hasMerchantReturnPolicy': {
          '@type': 'MerchantReturnPolicy',
          'applicableCountry': 'CR',
          'returnPolicyCategory': 'https://schema.org/MerchantReturnNotPermitted',
        },
        'seller': {
          '@type': 'Organization',
          'name': 'MacroForge',
          '@id': SELLER_REF,
        },
      },
    };

    // Reuse existing script tag to avoid duplicate insertions
    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.type  = 'application/ld+json';
      script.id    = SCRIPT_ID;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema, null, 0);

    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [product]);

  return null; // renders nothing — side-effect only
}
