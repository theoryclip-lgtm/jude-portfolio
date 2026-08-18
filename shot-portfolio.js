// shot-portfolio.js — confirm the standalone bundle's iframe previews render.
// build.py inlines each demo as srcdoc, so a broken bundle shows grey boxes.
const { chromium } = require('playwright');
const path = require('path');

const ROOT = __dirname;
(async () => {
  const browser = await chromium.launch();
  for (const file of ['jude-portfolio.html', 'jude-portfolio-standalone.html']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('file:///' + path.join(ROOT, file).replace(/\\/g, '/'), {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(4000);

    const frames = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.mock-live iframe')).map((f) => ({
        title: f.getAttribute('title') || f.dataset.demo || f.getAttribute('src'),
        hasSrcdoc: !!f.srcdoc,
        src: f.getAttribute('src') || null,
      }))
    );

    // Did each preview actually paint something?
    const painted = [];
    for (const fr of page.frames()) {
      if (fr === page.mainFrame()) continue;
      const info = await fr
        .evaluate(() => ({
          title: document.title,
          h1: (document.querySelector('h1') || {}).textContent || '',
          bg: getComputedStyle(document.body).backgroundColor,
          nodes: document.body ? document.body.querySelectorAll('*').length : 0,
        }))
        .catch(() => null);
      if (info) painted.push(info);
    }

    console.log('\n=== ' + file + ' ===');
    frames.forEach((f) => console.log(`  iframe: ${f.title}  srcdoc=${f.hasSrcdoc} src=${f.src}`));
    painted.forEach((p) =>
      console.log(`  rendered: "${p.title}"  h1="${p.h1.trim().slice(0, 30)}"  ${p.nodes} nodes  bg=${p.bg}`)
    );

    // The cards fade in on scroll, so walk the page first or the shot is blank.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.7;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
    });
    await page.waitForTimeout(900);

    const cards = await page.$$('.project');
    for (let i = 0; i < cards.length; i++) {
      await cards[i]
        .screenshot({
          path: path.join(ROOT, 'shots', file.replace('.html', '') + `-card${i + 1}.png`),
        })
        .catch(() => {});
    }
    await page.close();
  }
  await browser.close();
})();
