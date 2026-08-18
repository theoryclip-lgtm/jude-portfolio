// audit-pixels.js — contrast measured against the REAL painted background.
//
// Why this exists: a DOM walk can't see background-images, so any caption over
// a photograph reads as whatever colour its container happens to be. And naive
// pixel sampling of the element box is worse — it hits padding, nested arrow
// badges and inline icons, and reports nonsense.
//
// Method: render each viewport frame twice, once with text painted and once
// with it transparent. Pixels that differ between the two ARE the glyphs.
// Read the background from the hidden frame at exactly those coordinates.
// That measures what is actually behind the letters and nothing else.
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const path = require('path');

const ROOT = __dirname;
const VW = 1440;
const VH = 900;
const SITES = [
  { key: 'crew', file: 'crew-salon/index.html' },
  { key: 'marisol', file: 'marisol/index.html' },
];

const srgb = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = ([r, g, b]) => 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
const ratio = (a, b) => {
  const la = lum(a), lb = lum(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

const HIDE_ID = 'axp-hide-style';

(async () => {
  const browser = await chromium.launch();
  let problems = 0;

  for (const site of SITES) {
    const page = await browser.newPage({ viewport: { width: VW, height: VH } });
    await page.goto('file:///' + path.join(ROOT, site.file).replace(/\\/g, '/'), {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await page.waitForTimeout(3400);

    // Freeze the hero animation and smooth scrolling so both renders of a
    // frame are identical apart from the glyphs.
    await page.addStyleTag({
      content: `html{scroll-behavior:auto!important}
                *,*::before,*::after{animation:none!important;transition:none!important}`,
    });

    const meta = await page.evaluate(() => {
      const out = {};
      let i = 0;
      document.querySelectorAll('body *').forEach((el) => {
        const own = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim())
          .join('');
        if (own.length < 2) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        if (r.left < -500) return; // off-canvas skip link
        const id = 'axp' + i++;
        el.setAttribute('data-axp', id);
        const px = parseFloat(cs.fontSize);
        const wt = parseInt(cs.fontWeight, 10) || 400;
        out[id] = {
          text: own.slice(0, 44),
          sel: el.tagName.toLowerCase() +
            (typeof el.className === 'string' && el.className.trim()
              ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
          color: cs.color,
          px: Math.round(px * 10) / 10,
          weight: wt,
          large: px >= 24 || (px >= 18.66 && wt >= 700),
          inSticky: !!el.closest('header, nav.topnav, .callbar, .topline'),
        };
      });
      return out;
    });

    // How tall is the bar that overlays scrolled content?
    const stickyH = await page.evaluate(() => {
      const bar = document.querySelector('header, nav.topnav');
      if (!bar) return 0;
      const cs = getComputedStyle(bar);
      if (cs.position !== 'sticky' && cs.position !== 'fixed') return 0;
      return Math.ceil(bar.getBoundingClientRect().height) + 4;
    });

    const setHidden = (on) =>
      page.evaluate(
        ({ on, id }) => {
          let s = document.getElementById(id);
          if (on) {
            if (!s) {
              s = document.createElement('style');
              s.id = id;
              s.textContent =
                '[data-axp]{color:transparent!important;text-shadow:none!important;' +
                '-webkit-text-stroke-color:transparent!important}';
              document.head.appendChild(s);
            }
          } else if (s) s.remove();
        },
        { on, id: HIDE_ID }
      );

    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    const worst = {};

    for (let y = 0; y < docH; y += Math.floor(VH * 0.85)) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(200);

      const rects = await page.evaluate(() => {
        const o = {};
        document.querySelectorAll('[data-axp]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (parseFloat(getComputedStyle(el).opacity) === 0) return;
          if (r.bottom <= 1 || r.top >= window.innerHeight - 1) return;
          if (r.right <= 1 || r.left >= window.innerWidth - 1) return;
          o[el.getAttribute('data-axp')] = { x: r.x, y: r.y, w: r.width, h: r.height };
        });
        return o;
      });

      await setHidden(false);
      await page.waitForTimeout(60);
      const shown = PNG.sync.read(await page.screenshot());

      await setHidden(true);
      await page.waitForTimeout(60);
      const hidden = PNG.sync.read(await page.screenshot());

      const px = (png, x, y2) => {
        const idx = (png.width * y2 + x) << 2;
        return [png.data[idx], png.data[idx + 1], png.data[idx + 2]];
      };

      for (const [id, r] of Object.entries(rects)) {
        const m = meta[id];
        if (!m) continue;
        const cm = m.color.match(/rgba?\(([^)]+)\)/);
        if (!cm) continue;
        const p = cm[1].split(',').map(parseFloat);
        if (p.length > 3 && p[3] < 0.99) continue;
        const fg = [p[0], p[1], p[2]];

        const x0 = Math.max(0, Math.floor(r.x));
        const x1 = Math.min(VW - 1, Math.ceil(r.x + r.w));
        const y0 = Math.max(0, Math.floor(r.y));
        const y1 = Math.min(VH - 1, Math.ceil(r.y + r.h));

        for (let yy = y0; yy <= y1; yy++) {
          // Ignore the band occupied by the sticky/fixed header: content
          // scrolled under a translucent bar is a transient scroll state,
          // not the design's own contrast.
          if (yy < stickyH && !m.inSticky) continue;
          for (let xx = x0; xx <= x1; xx++) {
            const a = px(shown, xx, yy);
            const b = px(hidden, xx, yy);
            // A glyph pixel has to (a) change when the text goes transparent
            // and (b) actually BE the text colour in the shown frame. Without
            // (b) we also catch icon strokes that inherit currentColor, and
            // their anti-aliased rims report nonsense backgrounds.
            const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
            if (d < 90) continue;
            const near =
              Math.abs(a[0] - fg[0]) + Math.abs(a[1] - fg[1]) + Math.abs(a[2] - fg[2]);
            if (near > 45) continue; // anti-aliased edge or a non-text mark
            const rr = ratio(fg, b);
            if (!worst[id] || rr < worst[id].ratio) worst[id] = { ratio: rr, bg: b };
          }
        }
      }
    }

    const fails = [];
    for (const [id, w] of Object.entries(worst)) {
      const m = meta[id];
      const need = m.large ? 3 : 4.5;
      if (w.ratio < need) fails.push({ ...m, ratio: Math.round(w.ratio * 100) / 100, need, bg: w.bg });
    }

    console.log('\n==================== ' + site.key.toUpperCase() + ' ====================');
    console.log(`measured ${Object.keys(worst).length} text elements at real glyph pixels`);
    if (!fails.length) {
      console.log('  PASS — every text element clears its threshold on its worst glyph pixel');
    } else {
      problems += fails.length;
      console.log(`  ${fails.length} FAILING:`);
      fails
        .sort((a, b) => a.ratio - b.ratio)
        .forEach((f) =>
          console.log(
            `    ${f.ratio}:1 (needs ${f.need})  ${f.px}px/${f.weight}  ${f.sel}\n` +
              `        "${f.text}"\n` +
              `        ${f.color} on rgb(${f.bg.join(',')})`
          )
        );
    }
    await page.close();
  }

  await browser.close();
  console.log('\n' + (problems ? `>>> ${problems} real contrast failures` : '>>> no real contrast failures'));
})();
