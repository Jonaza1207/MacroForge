# MacroForge — macroforge.cr Domain Migration Plan

## Current state
- Live at: `https://jonaza1207.github.io/MacroForge/`
- Vite base: `/MacroForge/`
- Canonical: `https://jonaza1207.github.io/MacroForge/`

## Target state
- Live at: `https://macroforge.cr`
- Vite base: `/`
- Canonical: `https://macroforge.cr`

---

## Step 1 — Register & configure the domain

1. Register `macroforge.cr` at NIC Costa Rica (nic.cr) or a reseller
2. Add DNS records pointing to GitHub Pages:
   ```
   Type    Host    Value
   A       @       185.199.108.153
   A       @       185.199.109.153
   A       @       185.199.110.153
   A       @       185.199.111.153
   CNAME   www     jonaza1207.github.io
   ```
3. Wait for DNS propagation (15 min – 48 hours)

---

## Step 2 — Configure GitHub Pages custom domain

1. Go to repo Settings → Pages
2. Under "Custom domain", enter: `macroforge.cr`
3. Check "Enforce HTTPS" (only available after DNS propagates)
4. GitHub automatically creates/manages the SSL certificate via Let's Encrypt
5. GitHub will add a `CNAME` file to the repo root — **do not delete it**

---

## Step 3 — Update vite.config.js

```js
// BEFORE:
base: '/MacroForge/'

// AFTER:
base: '/'
```

---

## Step 4 — Update index.html

Replace ALL instances of `jonaza1207.github.io/MacroForge/` with `macroforge.cr`:

- `<link rel="canonical">` → `https://macroforge.cr`
- `<meta property="og:url">` → `https://macroforge.cr`
- `<meta property="og:image">` → `https://macroforge.cr/og-image.png`
- `<meta property="twitter:image">` → `https://macroforge.cr/og-image.png`
- `<link rel="icon">` → `/favicon.svg` (base already `/`)
- All JSON-LD `@id` and `url` fields

---

## Step 5 — Update public/robots.txt

```
User-agent: *
Allow: /
Sitemap: https://macroforge.cr/sitemap.xml
Crawl-delay: 1
```

---

## Step 6 — Update public/sitemap.xml

Replace `https://jonaza1207.github.io/MacroForge/` with `https://macroforge.cr/`

---

## Step 7 — Update deploy workflow (.github/workflows/deploy.yml)

No changes needed for custom domain — GitHub Pages handles it automatically
once the CNAME file is in the repo and DNS is configured.

---

## Step 8 — Analytics continuity

### GA4
- No code changes needed — the same `VITE_GA4_ID` works on any domain
- In GA4: Settings → Data Streams → verify the new domain is captured
- Optional: add `macroforge.cr` as a cross-domain measurement property

### Meta Pixel
- No code changes needed — the same `VITE_PIXEL_ID` works on any domain
- In Meta Events Manager: verify the pixel is receiving events from the new domain

---

## Step 9 — SEO preservation checklist

- [ ] Set up a 301 redirect from `jonaza1207.github.io/MacroForge/` to `macroforge.cr`
      (GitHub Pages: add a `_redirects` file or handle via Netlify/Cloudflare proxy)
- [ ] Submit `https://macroforge.cr` to Google Search Console
- [ ] Request indexing of the homepage
- [ ] Verify sitemap.xml is accepted: `https://macroforge.cr/sitemap.xml`
- [ ] Verify canonical tags are correct via GSC's URL Inspection tool
- [ ] Verify ProductSchema rich results via Google's Rich Results Test
- [ ] Confirm og:image loads correctly (new URL)

---

## Step 10 — Search Console setup (new domain)

1. Go to Google Search Console
2. Add property: `https://macroforge.cr` (Domain property type)
3. Verify via DNS TXT record (add to NIC CR DNS)
4. Submit sitemap: `https://macroforge.cr/sitemap.xml`
5. Request indexing for the homepage

---

## Step 11 — Post-migration validation checklist

- [ ] `https://macroforge.cr` loads correctly
- [ ] `https://www.macroforge.cr` redirects to `https://macroforge.cr`
- [ ] HTTPS is active (padlock visible)
- [ ] All product images load (paths not broken by base change)
- [ ] Deep links work: `https://macroforge.cr/#product/iso-100`
- [ ] WhatsApp CTAs generate correct URLs
- [ ] GA4 is receiving events (check Real-time in GA4)
- [ ] Meta Pixel is firing (check Meta Events Manager)
- [ ] ProductSchema validates: https://search.google.com/test/rich-results
- [ ] robots.txt accessible: `https://macroforge.cr/robots.txt`
- [ ] sitemap.xml accessible: `https://macroforge.cr/sitemap.xml`
- [ ] OG tags render correctly (test with https://developers.facebook.com/tools/debug/)

---

## Timeline estimate

| Phase | Duration |
|---|---|
| Domain registration | 1 hour |
| DNS propagation | 15 min – 48 hours |
| GitHub Pages config | 15 min |
| Code updates + build | 30 min |
| Search Console verification | 1 hour |
| Full indexing by Google | 1–4 weeks |

---

## Architectural debt: zero

The codebase is designed for this migration:
- Vite base is a single config change
- All canonical/OG URLs are in `index.html` (one file)
- GA4/Pixel IDs are environment variables (no code changes)
- Structured data uses absolute URLs (grep `jonaza1207` to find all)
- ProductSchema.jsx uses `window.location.origin` (auto-adapts)
- Deep links use `window.location.origin` (auto-adapts)
