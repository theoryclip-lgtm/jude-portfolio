// shoot-showcase.js — hero + scrolled shots of each demo, as JPEGs small
// enough to embed as data URIs in a presentation page.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'showcase');
fs.mkdirSync(OUT, { recursive: true });

const SITES = [
  { key: 'crew-salon', scrollTo: 1800 },
  { key: 'marisol', scrollTo: 1700 },
  { key: 'nailed-it-studio', scrollTo: 1900 },
];

(async () => {
  const browser = await chromium.launch();
  for (const site of SITES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    const url =
      'file:///' +
      path.join(__dirname, site.key, 'index.html').split(path.sep).join('/');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);

    await page.screenshot({
      path: path.join(OUT, site.key + '-hero.jpg'),
      type: 'jpeg',
      quality: 68,
    });

    // Walk down so lazy-loaded imagery has fetched before the second shot.
    await page.evaluate(async (target) => {
      for (let y = 0; y <= target; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
    }, site.scrollTo);
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, site.key + '-scrolled.jpg'),
      type: 'jpeg',
      quality: 68,
    });
    await page.close();
    console.log('shot ' + site.key);
  }

  // The portfolio's own work section, for the "installed" view.
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  await page.goto(
    'file:///' + path.join(__dirname, 'jude-portfolio.html').split(path.sep).join('/'),
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForTimeout(6000);
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.6;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 110));
    }
    document.querySelector('#work').scrollIntoView();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(OUT, 'portfolio-work.jpg'),
    type: 'jpeg',
    quality: 68,
  });
  await page.close();
  console.log('shot portfolio work section');
  await browser.close();
})();
