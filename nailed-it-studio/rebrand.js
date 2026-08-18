const fs = require('fs');
const path = require('path');

const OUT = __dirname;
const NEW_LOGO_SRC = 'C:\\Users\\J_fac\\Downloads\\ChatGPT Image Jul 26, 2026, 12_08_14 PM.png';
const NEW_LOGO_REL_DIR = '_assets/custom';
const NEW_LOGO_FILENAME = 'logo-nailed-it-studio.png';

const destDir = path.join(OUT, NEW_LOGO_REL_DIR);
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(NEW_LOGO_SRC, path.join(destDir, NEW_LOGO_FILENAME));
console.log('copied new logo asset');

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

const OLD_LOGO_DARK = '_assets/cdn.prod.website-files.com/602f823e838b82e51b7b60d7/6034e492b4e8c5d50870bcef_Logo_TheNailsSalon_White.svg';
const OLD_LOGO_LIGHT = '_assets/cdn.prod.website-files.com/602f823e838b82e51b7b60d7/6034e4a961ecce574226800e_Logo_TheNailsSalon_LightFrenchBeige.svg';

const ADDRESS_OLD_FULL = '250 Dundas Street West<br/>Unit 306 Mississauga<br/>Ontario, L5B 1J2<br/>(905) 487-7427';
const ADDRESS_NEW_FULL = '742 Evergreen Terrace<br/>Suite 4B Emerald City<br/>OR 97401<br/>(714) 019-2834';

const ADDRESS_OLD_CONTACT = '250 Dundas Street West<!--$--><br/><!--/$-->Unit 306 Mississauga<!--$--><br/><!--/$-->Ontario, L5B 1J2';
const ADDRESS_NEW_CONTACT = '742 Evergreen Terrace<!--$--><br/><!--/$-->Suite 4B Emerald City<!--$--><br/><!--/$-->OR 97401';

const PHONE_OLD_TEXT = 'Call us at 905-487-7427';
const PHONE_NEW_TEXT = 'Call us at 714-019-2834';
const PHONE_OLD_HREF = 'tel:+19054877427';
const PHONE_NEW_HREF = 'tel:+17140192834';

const EMAIL_FORM_GUARD = `<script>(function(){var f=document.getElementById('email-form');if(f){f.addEventListener('submit',function(e){e.preventDefault();e.stopImmediatePropagation();},true);}})();</script>`;

walkHtml(OUT, (file) => {
  let html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(OUT, file);
  const log = [];

  // --- 1. logo replacement (nav dark/light-skin, footer, preloader) ---
  const depth = path.relative(OUT, path.dirname(file)).split(path.sep).filter(Boolean).length;
  const prefix = depth === 0 ? './' : '../'.repeat(depth);
  const newLogoPath = prefix + NEW_LOGO_REL_DIR + '/' + NEW_LOGO_FILENAME;
  for (const oldRef of [prefix + OLD_LOGO_DARK, prefix + OLD_LOGO_LIGHT]) {
    if (html.includes(oldRef)) {
      const count = html.split(oldRef).length - 1;
      html = html.split(oldRef).join(newLogoPath);
      log.push(`logo x${count}`);
    }
  }

  // --- 2. remove copyright + wanderland footer credit ---
  const copyIdx = html.indexOf('class="copyright-footer-wrapper"');
  if (copyIdx !== -1) {
    const divStart = html.lastIndexOf('<div id="', copyIdx);
    const wanderlandIdx = html.indexOf('wanderland-footer-wrapper', divStart);
    if (wanderlandIdx !== -1) {
      const aEnd = html.indexOf('</a>', wanderlandIdx) + '</a>'.length;
      html = html.slice(0, divStart) + html.slice(aEnd);
      log.push('removed copyright+wanderland');
    }
  }

  // --- 3. neutralize newsletter email form ---
  if (html.includes('id="email-form"') && html.includes('</body>')) {
    const bodyClose = html.lastIndexOf('</body>');
    html = html.slice(0, bodyClose) + EMAIL_FORM_GUARD + html.slice(bodyClose);
    log.push('guarded email-form');
  }

  // --- 4. address / phone replacement ---
  if (html.includes(ADDRESS_OLD_FULL)) {
    html = html.split(ADDRESS_OLD_FULL).join(ADDRESS_NEW_FULL);
    log.push('address(full)');
  }
  if (html.includes(ADDRESS_OLD_CONTACT)) {
    html = html.split(ADDRESS_OLD_CONTACT).join(ADDRESS_NEW_CONTACT);
    log.push('address(contact)');
  }
  if (html.includes(PHONE_OLD_TEXT)) {
    html = html.split(PHONE_OLD_TEXT).join(PHONE_NEW_TEXT);
    log.push('phone text');
  }
  if (html.includes(PHONE_OLD_HREF)) {
    html = html.split(PHONE_OLD_HREF).join(PHONE_NEW_HREF);
    log.push('phone href');
  }

  fs.writeFileSync(file, html);
  console.log(rel, '->', log.join(', ') || '(no changes)');
});

// --- 5. global CSS: disable every button/link site-wide except the newsletter submit ---
const cssFile = path.join(OUT, '_assets/assets.website-files.com/602f823e838b82e51b7b60d7/css/nails-by-toe-bro.webflow.d5a785f71.css');
let css = fs.readFileSync(cssFile, 'utf8');
const disableRule = `a,button,input[type="submit"],input[type="button"],input[type="reset"],.w-nav-button,[role="button"]{pointer-events:none!important;cursor:default!important}#email-form input[type="submit"]{pointer-events:auto!important;cursor:pointer!important}.logo.dark-skin,.logo.light-skin{height:56px!important;width:auto!important}.logo.big{height:90px!important;width:auto!important}.logo.loader{height:80px!important;width:auto!important}`;
if (!css.includes(disableRule)) {
  css += disableRule;
  fs.writeFileSync(cssFile, css);
  console.log('CSS: added button-disable + logo-sizing rules');
} else {
  console.log('CSS: rules already present');
}

console.log('DONE');
