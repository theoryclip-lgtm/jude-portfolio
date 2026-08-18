// shot.js — screenshot the demo sites at real breakpoints + at portfolio-card scale.
//   node shot.js before        -> writes shots/before/*.png
//   node shot.js after         -> writes shots/after/*.png
//   node shot.js after marisol -> just one site
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const TAG = process.argv[2] || 'shot';
const ONLY = process.argv[3];

const SITES = [
  { key: 'crew', file: 'crew-salon/index.html' },
  { key: 'marisol', file: 'marisol/index.html' },
];

// 1440 = design target, 1024/768 = tablet tiers, 380 = small phone.
// Heights are the real device proportions, not width*0.72.
const WIDTHS = [
  { w: 1440, h: 900 },
  { w: 1024, h: 768 },
  { w: 768, h: 1024 },
  { w: 380, h: 820 },
];

// The portfolio card renders the iframe at 333% width scaled to .3 — so the demo
// actually lays out near 1870px and is then shrunk. Reproduce that exactly.
const CARD = { inner: 1870, scale: 0.3 };

const outDir = path.join(ROOT, 'shots', TAG);
fs.mkdirSync(outDir, { recursive: true });

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  // let the one orchestrated hero animation finish before we judge it
  // (Marisol's last polaroid lands at 2.8s)
  await page.waitForTimeout(3400);
}

(async () => {
  const browser = await chromium.launch();

  for (const site of SITES) {
    if (ONLY && site.key !== ONLY) continue;
    const url = 'file:///' + path.join(ROOT, site.file).replace(/\\/g, '/');

    for (const { w, h } of WIDTHS) {
      const page = await browser.newPage({
        viewport: { width: w, height: h },
        deviceScaleFactor: 1,
      });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await settle(page);

      await page.screenshot({
        path: path.join(outDir, `${site.key}-${w}-full.png`),
        fullPage: true,
      });
      await page.screenshot({ path: path.join(outDir, `${site.key}-${w}-fold.png`) });

      // A 10 000px full-page shot is unreadable once it is scaled to fit.
      // Section-by-section element shots are the only way to actually judge detail.
      if (w === 1440 || w === 380) {
        const ids = await page.evaluate(() =>
          Array.from(document.querySelectorAll('main > section[id], body > section[id]')).map((s) => s.id)
        );
        for (const id of ids) {
          const el = await page.$(`#${id}`);
          if (!el) continue;
          await el
            .screenshot({ path: path.join(outDir, `${site.key}-${w}-sec-${id}.png`) })
            .catch(() => {});
        }
      }

      await page.close();
      console.log(`  ${site.key} @ ${w}`);
    }

    // portfolio-card simulation: full page at 1870, then downscale to 30%
    const cp = await browser.newPage({
      viewport: { width: CARD.inner, height: 1170 },
      deviceScaleFactor: CARD.scale,
    });
    await cp.goto(url, { waitUntil: 'domcontentloaded' });
    await settle(cp);
    await cp.screenshot({ path: path.join(outDir, `${site.key}-card30.png`) });
    await cp.close();
    console.log(`  ${site.key} @ card 30%`);
  }

  await browser.close();
  console.log(`\nwrote -> shots/${TAG}/`);
})();
