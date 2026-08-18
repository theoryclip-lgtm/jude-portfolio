// check-demos.js — did each work-section preview actually paint, with its media?
// A demo whose assets are missing still "renders" (nodes > 0) but shows zero
// loaded images, so count decoded images/video too, not just DOM nodes.
const { chromium } = require('playwright');
const path = require('path');

const files = process.argv.slice(2);
if (!files.length) files.push('jude-portfolio.html', 'jude-portfolio-standalone.html');

(async () => {
  const browser = await chromium.launch();
  for (const file of files) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const url = 'file:///' + path.join(__dirname, file).split(path.sep).join('/');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);

    console.log('\n=== ' + file + ' ===');
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;
      const info = await frame
        .evaluate(() => ({
          title: document.title,
          nodes: document.body ? document.body.querySelectorAll('*').length : 0,
          imgsOk: [...document.images].filter((i) => i.naturalWidth > 0).length,
          imgsAll: document.images.length,
          bgImgs: [...document.querySelectorAll('*')].filter((e) =>
            getComputedStyle(e).backgroundImage.includes('url(')
          ).length,
          videos: document.querySelectorAll('video').length,
          styled: document.styleSheets.length,
        }))
        .catch(() => null);
      if (!info) continue;
      console.log(
        `  [${frame.url().slice(-42)}] "${info.title.slice(0, 45)}"  nodes=${info.nodes}  ` +
          `img=${info.imgsOk}/${info.imgsAll}  css-bg=${info.bgImgs}  ` +
          `video=${info.videos}  sheets=${info.styled}`
      );
    }
    await page.close();
  }
  await browser.close();
})();
