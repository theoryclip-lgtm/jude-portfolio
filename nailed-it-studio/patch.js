const fs = require('fs');
const path = require('path');

const OUT = __dirname;

function walkHtml(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_assets') continue;
      walkHtml(full, cb);
    } else if (entry.name.endsWith('.html')) {
      cb(full);
    }
  }
}

// 1. Hide the "Made in Webflow" badge via CSS (survives JS re-injection since !important beats inline styles)
const cssFile = path.join(OUT, '_assets/assets.website-files.com/602f823e838b82e51b7b60d7/css/nails-by-toe-bro.webflow.d5a785f71.css');
let css = fs.readFileSync(cssFile, 'utf8');
const badgeRule = '.w-webflow-badge{display:none!important}';
if (!css.includes(badgeRule)) {
  css += badgeRule;
  fs.writeFileSync(cssFile, css);
  console.log('CSS: added badge-hiding rule');
} else {
  console.log('CSS: badge rule already present');
}

// 2. Remove the legacy custom "Smooth Scroll" wheel-hijacking script from every page.
// It fights the browser's native momentum scrolling and causes choppiness.
const MARKER = '<!-- Smooth Scroll -->';

walkHtml(OUT, (file) => {
  let html = fs.readFileSync(file, 'utf8');
  const start = html.indexOf(MARKER);
  if (start === -1) {
    console.log('NO MARKER (check manually):', path.relative(OUT, file));
    return;
  }
  const scriptClose = html.indexOf('</script>', start);
  if (scriptClose === -1) {
    console.log('NO CLOSING SCRIPT TAG (check manually):', path.relative(OUT, file));
    return;
  }
  const end = scriptClose + '</script>'.length;
  html = html.slice(0, start) + html.slice(end);
  fs.writeFileSync(file, html);
  console.log('removed smooth-scroll script:', path.relative(OUT, file));
});

console.log('DONE');
