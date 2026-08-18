const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ORIGIN = 'https://nails-by-toe-bro.webflow.io';
const OUT = __dirname;

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

function localPathForPage(pathname) {
  let p = pathname;
  if (p === '/' || p === '') return path.join(OUT, 'index.html');
  if (p.endsWith('/')) p += 'index';
  if (!p.endsWith('.html')) p += '.html';
  return path.join(OUT, p);
}

function pageUrlToLocalPath(u) {
  try {
    const parsed = new URL(u, ORIGIN);
    if (parsed.origin !== ORIGIN) return null;
    return localPathForPage(parsed.pathname);
  } catch (e) {
    return null;
  }
}

function relPath(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile);
  rel = rel.split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function rewriteUrlOccurrence(u, fromFile) {
  if (u.startsWith('data:')) return u;
  if (isAssetHost(u)) {
    const local = localPathForAsset(u);
    if (fs.existsSync(local)) return relPath(fromFile, local);
    return u;
  }
  // same-origin page link (absolute or relative)
  if (u.startsWith('http://') || u.startsWith('https://')) {
    const local = pageUrlToLocalPath(u);
    if (local) return relPath(fromFile, local);
    return u; // external (e.g. jsdelivr, google fonts, social links)
  }
  if (u.startsWith('/')) {
    const local = pageUrlToLocalPath(u);
    if (local) return relPath(fromFile, local);
  }
  return u;
}

function rewriteHtml(file) {
  let html = fs.readFileSync(file, 'utf8');

  html = html.replace(/(src|href)=(["'])([^"']+)\2/g, (m, attr, q, val) => {
    if (val.startsWith('#') || val.startsWith('mailto:') || val.startsWith('tel:') || val.startsWith('javascript:')) return m;
    const nv = rewriteUrlOccurrence(val, file);
    return `${attr}=${q}${nv}${q}`;
  });

  html = html.replace(/srcset=(["'])([^"']+)\1/g, (m, q, val) => {
    const parts = val.split(',').map(part => {
      const trimmed = part.trim();
      const spaceIdx = trimmed.indexOf(' ');
      const urlPart = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
      const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx);
      return rewriteUrlOccurrence(urlPart, file) + rest;
    });
    return `srcset=${q}${parts.join(', ')}${q}`;
  });

  html = html.replace(/style=(["'])([^"']*url\([^"']*)\1/g, (m, q, val) => {
    const nv = val.replace(/url\((['"]?)([^'")]+)\1\)/g, (mm, qq, u) => {
      return `url(${qq}${rewriteUrlOccurrence(u, file)}${qq})`;
    });
    return `style=${q}${nv}${q}`;
  });

  fs.writeFileSync(file, html);
}

function rewriteCss(file) {
  let css = fs.readFileSync(file, 'utf8');
  css = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
    const nv = rewriteUrlOccurrence(u, file);
    return `url(${q}${nv}${q})`;
  });
  fs.writeFileSync(file, css);
}

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

walk(OUT, (file) => {
  if (file.endsWith('.html')) {
    console.log('rewriting html', path.relative(OUT, file));
    rewriteHtml(file);
  } else if (file.endsWith('.css')) {
    console.log('rewriting css', path.relative(OUT, file));
    rewriteCss(file);
  }
});

console.log('DONE');
