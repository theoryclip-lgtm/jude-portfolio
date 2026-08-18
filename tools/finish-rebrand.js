// finish-rebrand.js — mop up the brand strings rebrand.js didn't reach.
// rebrand.js handled the logo, address, and phone in the visible layout but
// left the <title>, the og:/twitter: meta, and the image alt text still saying
// "Nails By Toe Bro" / "Mississauga". Those show in the browser tab and in link
// previews, so a portfolio demo can't keep them.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'nailed-it-studio');

// Order matters: the longer, more specific phrases have to go first or the
// bare "Toe Bro" rule would eat their prefixes and strand the leftovers.
const RULES = [
  // Title carried a typo in the source ("Redifined") — the visible h1 says
  // "Nail care redefined", so match that rather than preserve the misspelling.
  [/Nails By Toe Bro \| Nail Care Redifined/g, 'Nailed It Studio | Nail Care Redefined'],
  [/Nails by Toe Bro, Mississauga nail salon/g, 'Nailed It Studio, Emerald City nail salon'],
  [/(the )?[Nn]ails [Bb]y [Tt]oe [Bb]ro/g, 'Nailed It Studio'],
  [/Toe Bro/g, 'Nailed It Studio'],
  [/Mississauga/g, 'Emerald City'],
  [/\bOntario\b/g, 'Oregon'],
  [/905-487-7427/g, '714-019-2834'],
  [/\+?19054877427/g, '+17140192834'],
];

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
  let after = before;
  for (const [re, to] of RULES) after = after.replace(re, to);
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    console.log('  rewrote ' + path.relative(ROOT, file));
    touched++;
  }
}
console.log(`done — ${touched} file(s) updated`);
