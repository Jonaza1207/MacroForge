import { PRODUCTS } from './src/data/products.js';

const slugs = new Set();
const products_by_slug = {};
const missing_url = [];
const invalid_urls = [];

Object.entries(PRODUCTS).forEach(([id, product]) => {
  const url = product.u;
  
  // Track products with no URL
  if (!url) {
    missing_url.push(id);
    return;
  }
  
  // Extract slug using the EXACT same regex from images.js
  const match = url.match(/\/tienda\/([^/?#]+)/);
  if (!match) {
    invalid_urls.push({ id, url });
    return;
  }
  
  const slug = match[1];
  slugs.add(slug);
  
  if (!products_by_slug[slug]) {
    products_by_slug[slug] = [];
  }
  products_by_slug[slug].push({ id, name: product.n, brand: product.b });
});

console.log(`Total products: ${Object.keys(PRODUCTS).length}`);
console.log(`Unique slugs: ${slugs.size}`);
console.log(`Products without URL: ${missing_url.length}`);
console.log(`Invalid URLs (no /tienda/): ${invalid_urls.length}`);

// Check for duplicate slugs (multiple products with same slug)
const duplicates = Object.entries(products_by_slug)
  .filter(([_, prods]) => prods.length > 1);
console.log(`\nDuplicate slugs: ${duplicates.length}`);
duplicates.forEach(([slug, prods]) => {
  console.log(`  ${slug}:`);
  prods.forEach(p => console.log(`    - [${p.id}] ${p.name} - ${p.brand}`));
});

if (invalid_urls.length > 0 && invalid_urls.length < 5) {
  console.log(`\nInvalid URLs:`);
  invalid_urls.forEach(({id, url}) => {
    console.log(`  [${id}] ${url}`);
  });
}

// Export all slugs for comparison
console.log(`\n=== ALL SLUGS ===`);
Array.from(slugs).sort().forEach(slug => {
  console.log(slug);
});
