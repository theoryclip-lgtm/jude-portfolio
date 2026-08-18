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

// Matches a single <a ...> opening tag that carries a "nav-link" class
const anchorTagRe = /<a\b[^>]*class="[^"]*\bnav-link\b[^"]*"[^>]*>/g;

walkHtml(OUT, (file) => {
  let html = fs.readFileSync(file, 'utf8');

  const navStart = html.indexOf('class="navbar w-nav"');
  if (navStart === -1) {
    console.log('no navbar, skipping:', path.relative(OUT, file));
    return;
  }
  let navEnd = html.indexOf('hamburger-menu', navStart);
  if (navEnd === -1) navEnd = navStart + 22000;

  const before = html.slice(0, navStart);
  const segment = html.slice(navStart, navEnd);
  const after = html.slice(navEnd);

  let count = 0;
  const patchedSegment = segment.replace(anchorTagRe, (tag) => {
    count++;
    let t = tag.replace(/\shref="[^"]*"/, '');
    t = t.replace(/\starget="_blank"/, '');
    return t;
  });

  html = before + patchedSegment + after;
  fs.writeFileSync(file, html);
  console.log(`patched ${count} nav-link anchors:`, path.relative(OUT, file));
});

console.log('DONE');
