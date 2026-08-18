const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ORIGIN = 'https://nails-by-toe-bro.webflow.io';
const OUT = __dirname;

const visitedPages = new Set();
const pageQueue = [];
const assetQueue = new Set();
const downloadedAssets = new Set();

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SiteMirror/1.0)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        return resolve(fetchUrl(next));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks), headers: res.headers, finalUrl: url }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('timeout')));
  });
}

function isSameOrigin(u) {
  try {
    const parsed = new URL(u, ORIGIN);
    return parsed.origin === ORIGIN;
  } catch (e) {
    return false;
  }
}

function isAssetHost(u) {
  try {
    const parsed = new URL(u);
    return /website-files\.com$|webflow\.com$/.test(parsed.hostname);
  } catch (e) {
    return false;
  }
}

function localPathForAsset(u) {
  const parsed = new URL(u);
  let p = decodeURIComponent(parsed.pathname);
  if (p.endsWith('/')) p += 'index';
  return path.join(OUT, '_assets', parsed.hostname, p);
}

function localPathForPage(u) {
  const parsed = new URL(u, ORIGIN);
  let p = parsed.pathname;
  if (p === '/' || p === '') return path.join(OUT, 'index.html');
  if (p.endsWith('/')) p += 'index';
  if (!p.endsWith('.html')) p += '.html';
  return path.join(OUT, p);
}

function relFromPageToAsset(pageLocalPath, assetLocalPath) {
  const rel = path.relative(path.dirname(pageLocalPath), assetLocalPath);
  return rel.split(path.sep).join('/');
}

function extractUrls(css, baseUrl) {
  const urls = [];
  const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  let m;
  while ((m = re.exec(css))) {
    const u = m[2];
    if (u.startsWith('data:')) continue;
    try {
      urls.push(new URL(u, baseUrl).toString());
    } catch (e) {}
  }
  return urls;
}

async function downloadAsset(url) {
  if (downloadedAssets.has(url)) return;
  downloadedAssets.add(url);
  const localPath = localPathForAsset(url);
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  try {
    const res = await fetchUrl(url);
    if (res.status !== 200) {
      console.log('FAIL', res.status, url);
      return;
    }
    fs.writeFileSync(localPath, res.buffer);
    console.log('OK', url, '->', path.relative(OUT, localPath), res.buffer.length);
    if (/\.css($|\?)/.test(url) || (res.headers['content-type'] || '').includes('css')) {
      const cssText = res.buffer.toString('utf8');
      const subUrls = extractUrls(cssText, url);
      for (const su of subUrls) {
        assetQueue.add(su);
      }
    }
  } catch (e) {
    console.log('ERROR', url, e.message);
  }
}

function findPageLinks(html) {
  const links = new Set();
  const re = /href=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (isSameOrigin(href)) {
      const abs = new URL(href, ORIGIN).toString().split('#')[0];
      links.add(abs);
    }
  }
  return [...links];
}

function findAssetRefs(html) {
  const refs = new Set();
  const attrRe = /(?:src|href)=["']([^"']+)["']/g;
  let m;
  while ((m = attrRe.exec(html))) {
    const v = m[1];
    if (isAssetHost(v)) refs.add(v);
  }
  const srcsetRe = /srcset=["']([^"']+)["']/g;
  while ((m = srcsetRe.exec(html))) {
    const parts = m[1].split(',').map(s => s.trim().split(' ')[0]);
    for (const p of parts) if (isAssetHost(p)) refs.add(p);
  }
  const inlineStyleRe = /style=["']([^"']*url\([^"']*)["']/g;
  while ((m = inlineStyleRe.exec(html))) {
    for (const u of extractUrls(m[1], ORIGIN)) if (isAssetHost(u)) refs.add(u);
  }
  return [...refs];
}

async function processPage(url) {
  const norm = url.split('#')[0];
  if (visitedPages.has(norm)) return;
  visitedPages.add(norm);
  console.log('PAGE', norm);
  const res = await fetchUrl(norm);
  if (res.status !== 200) {
    console.log('PAGE FAIL', res.status, norm);
    return;
  }
  const html = res.buffer.toString('utf8');
  const localPath = localPathForPage(norm);
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, html);

  for (const link of findPageLinks(html)) {
    if (!visitedPages.has(link)) pageQueue.push(link);
  }
  for (const asset of findAssetRefs(html)) {
    assetQueue.add(asset);
  }
}

async function main() {
  pageQueue.push(ORIGIN + '/');
  while (pageQueue.length) {
    const next = pageQueue.shift();
    await processPage(next);
  }
  console.log('--- pages done, downloading assets ---');
  let round = 0;
  while (true) {
    const pending = [...assetQueue].filter(u => !downloadedAssets.has(u));
    if (!pending.length) break;
    round++;
    console.log(`round ${round}: ${pending.length} assets`);
    for (const a of pending) {
      await downloadAsset(a);
    }
  }
  console.log('DONE');
  console.log('Pages:', [...visitedPages]);
  console.log('Assets downloaded:', downloadedAssets.size);
}

main().catch(e => { console.error(e); process.exit(1); });
