// add-title.js — give the Crestline bundle a real <title>.
//
// This demo ships as a self-extracting bundle: the outer wrapper's title is the
// placeholder "Bundled Page", and at DOMContentLoaded the runtime swaps the
// whole document for the payload in <script type="__bundler/template">. That
// payload has no <title> element, so the tab ends up blank once it unpacks.
// Patching the outer wrapper is useless — it gets replaced. The title has to go
// into the payload itself.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'crestline-dental', 'index.html');
const TITLE = 'Crestline Dental — Family &amp; Cosmetic Dentistry, Placentia CA';

const html = fs.readFileSync(FILE, 'utf8');
const TAG = /(<script type="__bundler\/template">)([\s\S]*?)(<\/script>)/;
const m = html.match(TAG);
if (!m) throw new Error('no __bundler/template block found');

let template = JSON.parse(m[2]);
if (/<title>/i.test(template)) {
  console.log('template already has a <title> — nothing to do');
  process.exit(0);
}
template = template.replace('<head>', `<head>\n<title>${TITLE}</title>`, 1);

// Escaping every "<" as < keeps the re-serialized JSON from closing the
// surrounding <script> tag if the payload contains a literal "</script>".
const json = JSON.stringify(template).replace(/</g, '\\u003c');

fs.writeFileSync(FILE, html.replace(TAG, (_, a, __, c) => a + json + c), 'utf8');
console.log('inserted <title> into bundle payload');
