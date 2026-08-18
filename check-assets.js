// check-assets.js — open one demo directly and list every request that failed.
// Run: node check-assets.js nailed-it-studio
const { chromium } = require('playwright');
const path = require('path');

const demo = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 2400 } });
  const failed = [];
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(r.status() + ' ' + r.url());
  });
  const url =
    'file:///' + path.join(__dirname, demo, 'index.html').split(path.sep).join('/');
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  // Lazy-loaded Webflow images only fetch once scrolled into view.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => ({
    title: document.title,
    imgsOk: [...document.images].filter((i) => i.naturalWidth > 0).length,
    imgsAll: document.images.length,
    broken: [...document.images]
      .filter((i) => !i.naturalWidth)
      .map((i) => i.currentSrc || i.src || i.getAttribute('src') || '(empty src)'),
  }));
  console.log('title:', info.title);
  console.log(`images decoded: ${info.imgsOk}/${info.imgsAll}`);
  const uniq = (a) => [...new Set(a)];
  console.log('\nbroken <img>:');
  uniq(info.broken).slice(0, 25).forEach((u) => console.log('  ' + u.slice(-95)));
  console.log('\nfailed requests:');
  uniq(failed).slice(0, 30).forEach((u) => console.log('  ' + u.slice(-95)));
  await page.screenshot({ path: path.join(__dirname, 'shots', demo + '-direct.png'), fullPage: false });
  await browser.close();
})();
