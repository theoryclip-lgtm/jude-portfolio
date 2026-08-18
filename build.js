#!/usr/bin/env node
/**
 * build.js — inline every demo site into the portfolio so it works as ONE file.
 *
 * Node port of build.py (this machine has no Python), with one correctness fix.
 *
 * Why the file exists: the work-section previews are iframes pointing at
 * ./marisol/index.html etc. Relative paths only resolve when the folders sit
 * next to the portfolio. Downloading files from a chat flattens them into one
 * folder, so the iframes 404 and you get a grey box. This embeds each demo's
 * full HTML directly into the portfolio instead.
 *
 *   node build.js
 *
 * Output: jude-portfolio-standalone.html
 *
 * The fix vs build.py: it escaped "</script" to "<\/script" so the payload
 * couldn't close the wrapper <script type="text/plain">, but nothing ever
 * undid that escape. The mangled text went straight into srcdoc, so a demo
 * containing inline <script> blocks — Nailed It Studio does, heavily — had a
 * script element that never closed and swallowed the rest of the page. That
 * preview rendered as an empty document. Base64 sidesteps the whole problem:
 * the payload can't contain a closing tag at all, and it round-trips exactly.
 */

const fs = require('fs');
const path = require('path');
const { inlineDemo } = require('./inline-assets');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'jude-portfolio.html');
const OUT = path.join(ROOT, 'jude-portfolio-standalone.html');

// demo key -> folder. Key must match the iframe src folder name.
const DEMOS = {
  'crew-salon': path.join(ROOT, 'crew-salon', 'index.html'),
  marisol: path.join(ROOT, 'marisol', 'index.html'),
  'nailed-it-studio': path.join(ROOT, 'nailed-it-studio', 'index.html'),
};

/**
 * An inlined iframe inherits the PARENT page's base URL, so a demo's
 * images/hero.jpg would resolve next to the portfolio instead of inside the
 * demo folder. A <base> tag fixes that when the folders are present, and
 * harmlessly 404s to the gradient fallback when they aren't.
 */
function rebase(html, key) {
  return html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n<base href="${key}/">`);
}

let portfolio = fs.readFileSync(SRC, 'utf8');
const blocks = [];
const found = [];
const missing = [];

for (const [key, file] of Object.entries(DEMOS)) {
  if (!fs.existsSync(file)) {
    missing.push(key);
    continue;
  }
  // Fold each demo's own CSS/JS/images in first — srcdoc carries markup only,
  // so a multi-file demo would otherwise render unstyled. See inline-assets.js.
  const { html: inlined, inlinedKB, skipped } = inlineDemo(file);
  const html = rebase(inlined, key);
  console.log(`  inlined ${key}: ${inlinedKB} KB` + (skipped.length ? `  (left external: ${skipped.join(', ')})` : ''));
  blocks.push(
    `<script type="text/plain" data-demo="${key}">${Buffer.from(html, 'utf8').toString(
      'base64'
    )}</script>`
  );
  found.push(key);
}

// Point every preview iframe at its key instead of a file path.
portfolio = portfolio.replace(
  /<iframe src="([\w-]+)\/index\.html"/g,
  (_, key) => `<iframe data-demo="${key}"`
);
// Same for the "View live site" links.
portfolio = portfolio.replace(
  /href="([\w-]+)\/index\.html"/g,
  (_, key) => `href="#" data-open="${key}"`
);

const runtime = `
<script>
(function(){
  var store={};
  function decode(b64){
    var bin=atob(b64), bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  document.querySelectorAll('script[type="text/plain"][data-demo]').forEach(function(s){
    try{ store[s.dataset.demo]=decode(s.textContent.trim()); }catch(e){}
  });
  document.querySelectorAll('iframe[data-demo]').forEach(function(f){
    var html=store[f.dataset.demo];
    if(html){ f.srcdoc=html; }
    else{
      var box=f.closest('.mock-live');
      if(box){
        box.style.cssText+=';display:grid;place-items:center;background:#EDEBE4;';
        box.innerHTML='<p style="font:600 .72rem/1.6 Archivo,sans-serif;letter-spacing:.16em;'
          +'text-transform:uppercase;color:#56534C;text-align:center;padding:2rem">'
          +f.dataset.demo.replace(/-/g," ")+'<br><span style="opacity:.6">folder not found at build time</span></p>';
      }
    }
  });
  document.querySelectorAll('[data-open]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var html=store[a.dataset.open];
      if(!html){ alert('That demo was not bundled. Re-run build.js with the folder present.'); return; }
      var url=URL.createObjectURL(new Blob([html],{type:'text/html'}));
      window.open(url,'_blank','noopener');
      setTimeout(function(){URL.revokeObjectURL(url)},60000);
    });
  });
})();
</script>
`;

portfolio = portfolio.replace('</body>', blocks.join('\n') + runtime + '\n</body>');
fs.writeFileSync(OUT, portfolio, 'utf8');

console.log(`Wrote ${path.basename(OUT)}  (${Math.round(portfolio.length / 1024)} KB)`);
console.log('  bundled: ' + (found.join(', ') || 'nothing'));
if (missing.length) {
  console.log('  missing: ' + missing.join(', '));
  console.log('  (add those folders next to this script and re-run)');
}
console.log(
  '  note: CSS, JS, fonts and images are inlined; video is not (too big to\n' +
    '        base64), so hero videos fall back to their poster frame. Run\n' +
    '        `node check-standalone.js` to confirm each preview stands alone.'
);
