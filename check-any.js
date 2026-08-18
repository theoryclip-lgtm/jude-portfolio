// check-any.js — same preview check as check-demos.js, but for a portfolio
// file anywhere on disk (the packaged deliverable lives outside this project,
// which has the only copy of playwright).
//   node check-any.js "C:\path\to\index.html" [...more]
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  for (const file of process.argv.slice(2)) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('file:///' + path.resolve(file).split(path.sep).join('/'), {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(8000);
    console.log('\n=== ' + path.basename(file) + ' ===');
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;
      const i = await frame
        .evaluate(() => ({
          title: document.title,
          nodes: document.body ? document.body.querySelectorAll('*').length : 0,
          imgsOk: [...document.images].filter((x) => x.naturalWidth > 0).length,
          imgsAll: document.images.length,
          videoOk: [...document.querySelectorAll('video')].filter((v) => v.readyState > 0)
            .length,
          videoAll: document.querySelectorAll('video').length,
          sheets: document.styleSheets.length,
        }))
        .catch(() => null);
      if (!i) continue;
      console.log(
        `  "${(i.title || '(untitled)').slice(0, 44)}"  nodes=${i.nodes}  ` +
          `img=${i.imgsOk}/${i.imgsAll}  video=${i.videoOk}/${i.videoAll}  sheets=${i.sheets}`
      );
    }
    await page.close();
  }
  await browser.close();
})();
