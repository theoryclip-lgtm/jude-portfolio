/**
 * inline-assets.js — fold a demo site's external files into its own HTML.
 *
 * Why this exists: build.js embeds each demo's index.html into the portfolio as
 * one base64 blob and hands it to an iframe via srcdoc. The blob carries the
 * markup and nothing else, so a demo that keeps its CSS in css/style.css and its
 * fonts in assets/fonts/ arrives at the iframe naked — correct HTML, no styling.
 * Crestline Dental never showed the problem because it shipped as a single
 * self-contained 4.4 MB file. Crew Salon is a normal multi-file site, so it does.
 *
 * What gets folded in: stylesheets (and the url() targets inside them), scripts,
 * <img> sources, and the hero poster referenced by data-poster.
 *
 * What deliberately does not: anything over MAX_FILE. That is almost entirely
 * video — Crew's hero.mp4 alone is 1.5 MB and Marisol ships two more. Base64
 * inflates by a third, so inlining them would push the single file past 30 MB to
 * animate three previews the viewer sees for a few seconds. The <video> 404s and
 * the poster image stays on screen, which is what the poster is for.
 */

const fs = require('fs');
const path = require('path');

const MAX_FILE = 900 * 1024; // per asset
const MAX_TOTAL = 6 * 1024 * 1024; // per demo, so one heavy site can't bloat the bundle

const MIME = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const isExternal = (u) => !u || /^(https?:|data:|blob:|mailto:|tel:|#|\/\/)/i.test(u);

function makeLoader(root) {
  let spent = 0;
  const skipped = [];

  /** Resolve a URL relative to `fromDir`, refusing to escape the demo folder. */
  function read(url, fromDir) {
    if (isExternal(url)) return null;
    const clean = url.split('#')[0].split('?')[0];
    if (!clean) return null;
    const file = path.resolve(fromDir, decodeURIComponent(clean));
    if (!file.startsWith(root)) return null;
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      skipped.push(`${clean} (missing)`);
      return null;
    }
    if (stat.size > MAX_FILE || spent + stat.size > MAX_TOTAL) {
      skipped.push(`${clean} (${Math.round(stat.size / 1024)} KB)`);
      return null;
    }
    spent += stat.size;
    return { file, buf: fs.readFileSync(file) };
  }

  function dataUri(url, fromDir) {
    const hit = read(url, fromDir);
    if (!hit) return null;
    const mime = MIME[path.extname(hit.file).toLowerCase()] || 'application/octet-stream';
    return `data:${mime};base64,${hit.buf.toString('base64')}`;
  }

  return { read, dataUri, skipped: () => skipped, spent: () => spent };
}

/** Rewrite url(...) inside a stylesheet, resolving against the stylesheet's own folder. */
function inlineCss(css, cssDir, load) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (whole, q, url) => {
    const uri = load.dataUri(url.trim(), cssDir);
    return uri ? `url("${uri}")` : whole;
  });
}

function inlineDemo(indexFile) {
  const root = path.resolve(path.dirname(indexFile));
  const load = makeLoader(root);
  let html = fs.readFileSync(indexFile, 'utf8');

  // Preloaded fonts land in the CSS as data URIs; the preload would just 404.
  html = html.replace(/<link\b[^>]*\brel=["']preload["'][^>]*>/gi, '');
  // Favicons and manifests do nothing inside an iframe preview.
  html = html.replace(
    /<link\b[^>]*\brel=["'](?:icon|shortcut icon|apple-touch-icon|manifest)["'][^>]*>/gi,
    ''
  );

  // <link rel="stylesheet" href="...">
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/\brel=["']stylesheet["']/i.test(tag)) return tag;
    const m = tag.match(/\bhref=["']([^"']+)["']/i);
    if (!m || isExternal(m[1])) return tag;
    const hit = load.read(m[1], root);
    if (!hit) return tag;
    const css = inlineCss(hit.buf.toString('utf8'), path.dirname(hit.file), load);
    return `<style>\n${css}\n</style>`;
  });

  // Inline <style> blocks reference their images relative to the page, not to a
  // stylesheet folder. Marisol keeps its whole design here.
  html = html.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (whole, open, css, close) => open + inlineCss(css, root, load) + close
  );

  // <script src="..."></script>
  html = html.replace(/<script\b([^>]*)>\s*<\/script>/gi, (tag, attrs) => {
    const m = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!m || isExternal(m[1])) return tag;
    const hit = load.read(m[1], root);
    if (!hit) return tag;
    const js = hit.buf.toString('utf8');
    // A literal </script inside the source would close the tag early and eat the
    // rest of the page. Not worth a fragile escape — leave it as a file ref.
    if (/<\/script/i.test(js)) return tag;
    const keep = attrs.replace(/\bsrc=["'][^"']+["']/i, '').trim();
    return `<script${keep ? ' ' + keep : ''}>\n${js}\n</script>`;
  });

  // <img src="..."> and the hero poster attribute.
  html = html.replace(/\bsrc=["']([^"']+)["']/gi, (whole, url) => {
    if (isExternal(url) || /\.(mp4|webm|mov|m4v)$/i.test(url)) return whole;
    const uri = load.dataUri(url, root);
    return uri ? `src="${uri}"` : whole;
  });
  html = html.replace(/\bdata-poster=["']([^"']+)["']/gi, (whole, url) => {
    const uri = load.dataUri(url, root);
    return uri ? `data-poster="${uri}"` : whole;
  });

  return { html, inlinedKB: Math.round(load.spent() / 1024), skipped: load.skipped() };
}

module.exports = { inlineDemo };
