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

walkHtml(OUT, (file) => {
  let html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(OUT, file);
  const log = [];

  // --- remove "Sister Company" footer column ---
  const scIdx = html.indexOf('Sister Company');
  if (scIdx !== -1) {
    const divStart = html.lastIndexOf('<div id="', scIdx);
    const footClinicIdx = html.indexOf('The Foot Clinic</a>', scIdx);
    if (footClinicIdx !== -1) {
      const afterFootClinic = footClinicIdx + 'The Foot Clinic</a>'.length;
      const divEnd = html.indexOf('</div>', afterFootClinic) + '</div>'.length;
      html = html.slice(0, divStart) + html.slice(divEnd);
      log.push('removed Sister Company column');
    }
  }

  // --- remove cookie consent banner ---
  const bannerStart = html.indexOf('<div fs-cc="banner"');
  if (bannerStart !== -1) {
    const scriptIdx = html.indexOf('<script src="https://d3e54v103j8qbb', bannerStart);
    if (scriptIdx !== -1) {
      html = html.slice(0, bannerStart) + html.slice(scriptIdx);
      log.push('removed cookie banner');
    }
  }

  fs.writeFileSync(file, html);
  console.log(rel, '->', log.join(', ') || '(no changes)');
});

console.log('DONE');
