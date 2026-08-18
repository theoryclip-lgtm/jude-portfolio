// localize-jquery.js — point jQuery at the vendored copy instead of a CDN.
//
// The mirrored Webflow export kept two remote jQuery tags:
//   1. https://d3e54v103j8qbb.cloudfront.net/...jquery-3.5.1.min... (with SRI)
//   2. //cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js
//
// Both are parser-blocking. Opened from file:// the protocol-relative one
// resolves to file://cdnjs.cloudflare.com/... — a UNC path — and Windows stalls
// on the SMB lookup, so document.readyState never leaves "loading" and the
// preview iframe stays blank. Tag 2 is also a straight downgrade: 2.1.3 loading
// after 3.5.1 would clobber it. So: rewrite 1 to the local file, drop 2.
//
// The SRI integrity hash has to go with it — it was computed over Webflow's
// build, and a local file can't satisfy it anyway.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'nailed-it-studio');
const VENDORED = '_assets/custom/jquery-3.5.1.min.js';

if (!fs.existsSync(path.join(ROOT, VENDORED))) {
  throw new Error('vendored jQuery missing at ' + VENDORED);
}

const CDN_JQUERY = /<script src="https:\/\/d3e54v103j8qbb\.cloudfront\.net\/js\/jquery-[^"]*"[^>]*><\/script>/g;
const CDNJS_JQUERY = /<script src="\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jquery\/[^"]*"[^>]*><\/script>/g;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '_assets' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

let touched = 0;
for (const file of walk(ROOT)) {
  const before = fs.readFileSync(file, 'utf8');
  // Pages in treatment/ sit one level down and need ../ to reach _assets.
  const depth = path
    .relative(ROOT, path.dirname(file))
    .split(path.sep)
    .filter(Boolean).length;
  const src = (depth === 0 ? './' : '../'.repeat(depth)) + VENDORED;

  const after = before
    .replace(CDN_JQUERY, `<script src="${src}" type="text/javascript"></script>`)
    .replace(CDNJS_JQUERY, '');

  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    console.log('  rewrote ' + path.relative(ROOT, file));
    touched++;
  }
}
console.log(`done — ${touched} file(s) updated`);
