import fs from 'fs';

// Get all image files
const imageFiles = fs.readdirSync('./src/assets/products/')
  .filter(f => f.endsWith('.png'))
  .map(f => f.replace(/\.png$/, ''));

const imagesSet = new Set(imageFiles);

// Read current images.js and extract IMAGE_MAP
const content = fs.readFileSync('./src/data/images.js', 'utf-8');
const mapMatch = content.match(/const IMAGE_MAP = \{([\s\S]*?)\};/);

if (!mapMatch) {
  console.log('Could not parse IMAGE_MAP');
  process.exit(1);
}

// Extract all image filename values
const mapEntries = mapMatch[1]
  .split('\n')
  .filter(line => line.includes(':'))
  .map(line => {
    const m = line.match(/'([^']+)':\s*'([^']+)'/);
    return m ? { slug: m[1], filename: m[2] } : null;
  })
  .filter(Boolean);

console.log(`IMAGE_MAP entries: ${mapEntries.length}`);

// Validate each entry
let valid = 0;
let missing = [];

mapEntries.forEach(entry => {
  if (imagesSet.has(entry.filename)) {
    valid++;
  } else {
    missing.push(entry);
  }
});

console.log(`Valid entries (file exists): ${valid}`);
console.log(`Missing entries (file does not exist): ${missing.length}`);

if (missing.length > 0 && missing.length < 20) {
  console.log('\nMissing image files:');
  missing.forEach(m => {
    console.log(`  '${m.slug}' → '${m.filename}' (NOT FOUND)`);
  });
}

// List all actual image files
console.log(`\n\nAll ${imageFiles.length} image files available:`);
imageFiles.sort().forEach(f => console.log(`  ${f}`));