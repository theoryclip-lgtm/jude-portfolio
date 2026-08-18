#!/usr/bin/env node
/**
 * deploy-build.js — assemble dist/, the folder that actually gets uploaded.
 *
 *   node deploy-build.js                        # GitHub Pages default
 *   node deploy-build.js https://studiojude.com # once a custom domain is live
 *
 * The second form also writes a CNAME file, which is what GitHub Pages reads to
 * bind the domain.
 *
 * The source folder is a workspace: node_modules, screenshots, audit scripts, a
 * dated backup. None of that belongs on a web server. This copies over only what
 * a visitor needs, and fixes the four things that differ between "opens on my
 * laptop" and "works on a host":
 *
 *   1. index.html — a server serves index.html at /, not jude-portfolio.html.
 *   2. Absolute URLs — Open Graph tags must be absolute, so __SITE_URL__ is
 *      substituted here rather than hardcoded into the source.
 *   3. noindex on the demos — the demos are copies of real client sites. Crew
 *      Salon's canonical already points at crewsalon.com, but noindex is the
 *      unambiguous version: these pages must never appear in search results
 *      under Jude's domain and compete with the client they were built for.
 *   4. .nojekyll — GitHub Pages runs Jekyll by default, and Jekyll silently
 *      drops any file or folder whose name starts with an underscore. Nailed It
 *      Studio keeps its entire stylesheet and script payload in _assets/, so
 *      without this file that demo deploys as an unstyled skeleton.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const DEFAULT_URL = 'https://theoryclip-lgtm.github.io/jude-portfolio';

const siteUrl = (process.argv[2] || DEFAULT_URL).replace(/\/+$/, '');
const isCustomDomain = !/github\.io$/i.test(new URL(siteUrl).hostname);

const DEMOS = ['crew-salon', 'marisol', 'nailed-it-studio'];

/* ---------- helpers ---------- */

function copyDir(src, dest, skip = () => false) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (skip(entry.name, from)) continue;
    if (entry.isDirectory()) copyDir(from, to, skip);
    else fs.copyFileSync(from, to);
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function dirSize(dir) {
  return walk(dir).reduce((n, f) => n + fs.statSync(f).size, 0);
}

/* ---------- build ---------- */

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// 1. The portfolio itself, renamed and with real URLs baked in.
const portfolio = fs
  .readFileSync(path.join(ROOT, 'jude-portfolio.html'), 'utf8')
  .split('__SITE_URL__')
  .join(siteUrl);
fs.writeFileSync(path.join(DIST, 'index.html'), portfolio, 'utf8');

// 2. Social card and favicons. The _-prefixed files are the HTML the images were
//    rendered from — source material, not something to serve.
copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), (name) => name.startsWith('_'));

// 3. Demo sites, each page marked noindex.
const ROBOTS_TAG = '<meta name="robots" content="noindex, nofollow">';
let tagged = 0;
for (const demo of DEMOS) {
  const src = path.join(ROOT, demo);
  if (!fs.existsSync(src)) {
    console.log(`  ! missing demo folder: ${demo}`);
    continue;
  }
  const dest = path.join(DIST, demo);
  copyDir(src, dest);
  for (const file of walk(dest).filter((f) => f.toLowerCase().endsWith('.html'))) {
    let html = fs.readFileSync(file, 'utf8');
    if (html.includes('name="robots"')) continue;
    const head = html.match(/<head(\s[^>]*)?>/i);
    if (!head) continue;
    html = html.replace(head[0], `${head[0]}\n${ROBOTS_TAG}`);
    fs.writeFileSync(file, html, 'utf8');
    tagged++;
  }
}

// 4. Host-level files.
fs.writeFileSync(path.join(DIST, '.nojekyll'), '', 'utf8');
fs.writeFileSync(
  path.join(DIST, 'robots.txt'),
  [
    'User-agent: *',
    'Allow: /$',
    '',
    '# Portfolio copies of client sites. They carry noindex too; this keeps',
    '# crawlers off them in the first place.',
    ...DEMOS.map((d) => `Disallow: /${d}/`),
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n'),
  'utf8'
);
fs.writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
  'utf8'
);
if (isCustomDomain) {
  fs.writeFileSync(path.join(DIST, 'CNAME'), new URL(siteUrl).hostname + '\n', 'utf8');
}

/* ---------- report ---------- */

const leftovers = portfolio.match(/__[A-Z_]+__/g);
console.log(`dist/ built for ${siteUrl}`);
console.log(`  ${DEMOS.length} demos, ${tagged} pages marked noindex`);
console.log(`  ${(dirSize(DIST) / 1024 / 1024).toFixed(1)} MB total`);
if (isCustomDomain) console.log(`  CNAME written for ${new URL(siteUrl).hostname}`);
if (leftovers) console.log(`  ! unresolved placeholders: ${[...new Set(leftovers)].join(', ')}`);
console.log('\nUpload the dist/ folder — nothing above it.');
