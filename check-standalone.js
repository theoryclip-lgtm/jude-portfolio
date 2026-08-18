// check-standalone.js — how much of each preview survives when the standalone
// file is on its own, with no demo folders next to it? That's the state it
// ships in when someone downloads a single file out of a chat, so it's the
// state worth measuring rather than guessing at.
//
// Copies the bundle alone into a scratch dir and reports, per preview, whether
// it painted and whether its images/video actually loaded.
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BUNDLE = 'jude-portfolio-standalone.html';

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-alone-'));
  fs.copyFileSync(path.join(__dirname, BUNDLE), path.join(tmp, BUNDLE));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('file:///' + path.join(tmp, BUNDLE).split(path.sep).join('/'), {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(8000);

  console.log(`\n=== ${BUNDLE}, no demo folders present ===`);
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
    const media =
      i.imgsAll || i.videoAll
        ? `img ${i.imgsOk}/${i.imgsAll}, video ${i.videoOk}/${i.videoAll}`
        : 'no media elements';
    console.log(
      `  "${(i.title || '(untitled)').slice(0, 42)}"\n` +
        `      painted: ${i.nodes} nodes, ${i.sheets} stylesheet(s) | ${media}`
    );
  }
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
})();
