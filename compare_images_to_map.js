import fs from 'fs';
import { PRODUCTS } from './src/data/products.js';

// Get all image files
const imageFiles = fs.readdirSync('./src/assets/products/')
  .filter(f => f.endsWith('.png'))
  .map(f => f.replace(/\.png$/, ''));

console.log(`Total image files: ${imageFiles.length}`);

// Extract all unique slugs
const slugs = new Set();
Object.values(PRODUCTS).forEach(product => {
  const url = product.u;
  if (!url) return;
  const match = url.match(/\/tienda\/([^/?#]+)/);
  if (match) slugs.add(match[1]);
});

console.log(`Total unique slugs: ${slugs.size}`);

// Check which slugs have images
const imagesSet = new Set(imageFiles);
const withImages = [];
const withoutImages = [];

slugs.forEach(slug => {
  // Try exact match first (case-insensitive)
  const found = imageFiles.find(img => 
    img.toLowerCase().replace(/[^a-z0-9]/g, '') === 
    slug.toLowerCase().replace(/[^a-z0-9]/g, '')
  );
  
  if (found) {
    withImages.push({ slug, image: found });
  } else {
    withoutImages.push(slug);
  }
});

console.log(`\nSlugs WITH matching images: ${withImages.length}`);
console.log(`Slugs WITHOUT images: ${withoutImages.length}`);

// Show samples of missing
console.log(`\nSample of 20 MISSING IMAGE SLUGS:`);
withoutImages.slice(0, 20).forEach(slug => {
  const prods = Object.values(PRODUCTS).filter(p => 
    p.u && p.u.match(/\/tienda\/([^/?#]+)/) && 
    p.u.match(/\/tienda\/([^/?#]+)/)[1] === slug
  );
  const first = prods[0];
  console.log(`  ${slug}: ${first.n} - ${first.b}`);
});

// Show some images not in slug map
const unusedImages = imageFiles.filter(img =>
  !withImages.find(w => w.image === img)
);
console.log(`\nUnused image files (not matched to any slug): ${unusedImages.length}`);
if (unusedImages.length > 0 && unusedImages.length < 20) {
  console.log(`Unused images:`);
  unusedImages.forEach(img => console.log(`  ${img}`));
}
