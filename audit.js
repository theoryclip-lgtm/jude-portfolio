// audit.js — measure what the brief asks to be verified, rather than assert it.
//   node audit.js
// Checks: text contrast against the ACTUAL painted background, heading order,
// focusable elements with no visible focus indicator, and reduced-motion.
const { chromium } = require('playwright');
const path = require('path');

const ROOT = __dirname;
const WIDTH = parseInt(process.argv[2] || '1440', 10);
const SITES = [
  { key: 'crew', file: 'crew-salon/index.html' },
  { key: 'marisol', file: 'marisol/index.html' },
];

const CHECKS = `
(() => {
  const srgb = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = ([r, g, b]) =>
    0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
  const parse = (s) => {
    const m = s.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));

  // Walk up the tree compositing every non-transparent background we meet.
  const effectiveBg = (el) => {
    let acc = null;
    let node = el;
    while (node && node !== document.documentElement.parentNode) {
      const cs = getComputedStyle(node);
      const p = parse(cs.backgroundColor);
      if (p && p.a > 0) {
        acc = acc === null ? { rgb: p.rgb, a: p.a } : { rgb: over(acc.rgb, p.rgb, acc.a), a: 1 };
        if (acc.a >= 1) return acc.rgb;
      }
      node = node.parentElement;
    }
    return acc ? acc.rgb : [255, 255, 255];
  };

  const ratio = (a, b) => {
    const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
    return (hi + 0.05) / (lo + 0.05);
  };

  const results = { contrast: [], headings: [], focus: [], counts: {} };

  // ---- contrast on every element holding real text ----
  document.querySelectorAll('body *').forEach((el) => {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join('');
    if (own.length < 2) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return;

    const fgP = parse(cs.color);
    if (!fgP) return;
    const bg = effectiveBg(el);
    const fg = fgP.a < 1 ? over(fgP.rgb, bg, fgP.a) : fgP.rgb;

    const px = parseFloat(cs.fontSize);
    const wt = parseInt(cs.fontWeight, 10) || 400;
    const large = px >= 24 || (px >= 18.66 && wt >= 700);
    const need = large ? 3 : 4.5;
    const r = ratio(fg, bg);

    // If a background-IMAGE paints anywhere beneath this text, the colour we
    // just composited is not what the user sees. Ancestors aren't enough --
    // a full-bleed hero photo is usually a SIBLING layer -- so hit-test the
    // real paint stack at the element's centre.
    let overImage = false;
    {
      const r2 = el.getBoundingClientRect();
      const cx = Math.min(window.innerWidth - 1, Math.max(0, r2.left + r2.width / 2));
      const cy = Math.min(window.innerHeight - 1, Math.max(0, r2.top + r2.height / 2));
      const stack = document.elementsFromPoint(cx, cy);
      for (const n of stack) {
        const bi = getComputedStyle(n).backgroundImage;
        if (bi && bi !== 'none') { overImage = true; break; }
      }
    }
    if (r < need && overImage) {
      results.overImage = (results.overImage || 0) + 1;
      return;
    }

    if (r < need) {
      results.contrast.push({
        sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''),
        text: own.slice(0, 46),
        px: Math.round(px * 10) / 10,
        weight: wt,
        ratio: Math.round(r * 100) / 100,
        need,
        color: cs.color,
        bg: 'rgb(' + bg.map(Math.round).join(',') + ')',
      });
    }
  });

  // ---- heading order ----
  let prev = 0;
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
    const lvl = parseInt(h.tagName[1], 10);
    if (prev && lvl > prev + 1) {
      results.headings.push({ skipped: 'h' + prev + ' -> h' + lvl, text: h.textContent.trim().slice(0, 46) });
    }
    prev = lvl;
  });
  results.counts.h1 = document.querySelectorAll('h1').length;
  results.counts.headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6').length;

  // ---- focusables ----
  const focusables = document.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  results.counts.focusable = focusables.length;

  // ---- clipped text / horizontal scroll ----
  // A vw-sized headline in a max-width container outgrows it once the
  // container caps, and overflow:hidden silently eats the last glyphs.
  results.clipped = [];
  document.querySelectorAll('h1,h2,h3,p,a,li,span,dd,dt,figcaption').forEach((el) => {
    if (!el.offsetParent) return;
    const cs = getComputedStyle(el);
    if (cs.overflow === 'visible' && cs.overflowX === 'visible') {
      // may still be clipped by an ancestor with overflow:hidden
      const anc = el.closest('[style*="overflow"], .hero-panel, .ph, section');
      if (!anc) return;
      const acs = getComputedStyle(anc);
      if (acs.overflow !== 'hidden' && acs.overflowX !== 'hidden') return;
      const ar = anc.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      if (er.right > ar.right + 1 || er.left < ar.left - 1) {
        results.clipped.push({
          sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className
            ? '.' + el.className.trim().split(/\\s+/)[0] : ''),
          text: el.textContent.trim().slice(0, 34),
          overBy: Math.round(Math.max(er.right - ar.right, ar.left - er.left)),
        });
      }
      return;
    }
    if (el.scrollWidth > el.clientWidth + 2) {
      results.clipped.push({
        sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className
          ? '.' + el.className.trim().split(/\\s+/)[0] : ''),
        text: el.textContent.trim().slice(0, 34),
        overBy: el.scrollWidth - el.clientWidth,
      });
    }
  });
  results.counts.hScroll =
    document.documentElement.scrollWidth - document.documentElement.clientWidth;

  // ---- misc tells ----
  results.counts.emoji = (document.body.innerText.match(
    /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{FE0F}]/gu
  ) || []).filter((c) => c !== '\\u2733' && c !== '\\u2605').length;
  results.counts.imgNoAlt = Array.from(document.querySelectorAll('img')).filter(
    (i) => !i.hasAttribute('alt')
  ).length;
  results.counts.jsonld = document.querySelectorAll('script[type="application/ld+json"]').length;

  return results;
})()
`;

(async () => {
  const browser = await chromium.launch();
  let fail = 0;

  for (const site of SITES) {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 } });
    await page.goto('file:///' + path.join(ROOT, site.file).replace(/\\/g, '/'), {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await page.waitForTimeout(3400);

    const r = await page.evaluate(CHECKS);

    console.log('\n==================== ' + site.key.toUpperCase() + ' ====================');
    console.log(
      `headings: ${r.counts.headings} (h1 x${r.counts.h1})  focusable: ${r.counts.focusable}  ` +
        `json-ld: ${r.counts.jsonld}  emoji: ${r.counts.emoji}  img-without-alt: ${r.counts.imgNoAlt}`
    );

    if (r.counts.hScroll > 0) {
      fail++;
      console.log(`  HORIZONTAL SCROLL: page is ${r.counts.hScroll}px wider than the viewport`);
    } else console.log('  no horizontal scroll');

    if (r.clipped && r.clipped.length) {
      fail++;
      console.log(`\n  CLIPPED TEXT (${r.clipped.length}):`);
      r.clipped.slice(0, 10).forEach((c) =>
        console.log(`    ${c.sel} overflows by ${c.overBy}px — "${c.text}"`));
    } else console.log('  no clipped text');

    if (r.headings.length) {
      fail++;
      console.log('\n  HEADING ORDER SKIPS:');
      r.headings.forEach((h) => console.log(`    ${h.skipped}  "${h.text}"`));
    } else console.log('  heading order: sequential, no skips');

    // JSON-LD must actually parse
    const ld = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => {
        try {
          const o = JSON.parse(s.textContent);
          return { ok: true, type: o['@type'] };
        } catch (e) {
          return { ok: false, err: e.message };
        }
      })
    );
    ld.forEach((x) => {
      if (!x.ok) { fail++; console.log('  JSON-LD PARSE ERROR: ' + x.err); }
      else console.log('  json-ld parses: @type=' + x.type);
    });

    if (r.contrast.length) {
      fail++;
      console.log(`\n  CONTRAST FAILURES (${r.contrast.length}):`);
      r.contrast.forEach((c) =>
        console.log(
          `    ${c.ratio}:1 (needs ${c.need})  ${c.px}px/${c.weight}  ${c.sel}\n` +
            `        "${c.text}"  ${c.color} on ${c.bg}`
        )
      );
    } else console.log('  contrast: every text node clears its threshold');
    if (r.overImage) {
      console.log(
        `  note: ${r.overImage} element(s) sit over a background-image and cannot be` +
          ` measured from the DOM — audit-pixels.js checks those against real pixels`
      );
    }

    // ---- focus visibility: tab through and confirm something changes ----
    const noRing = await page.evaluate(() => {
      const bad = [];
      document
        .querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')
        .forEach((el) => {
          if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
          const before = getComputedStyle(el).outlineStyle + getComputedStyle(el).outlineWidth;
          el.focus();
          const cs = getComputedStyle(el);
          const w = parseFloat(cs.outlineWidth) || 0;
          if (cs.outlineStyle === 'none' || w < 1) {
            bad.push((el.tagName + '.' + (el.className || '')).slice(0, 44) + ' :: ' +
                     el.textContent.trim().slice(0, 24));
          }
          el.blur();
        });
      return bad;
    });
    if (noRing.length) {
      fail++;
      console.log(`\n  NO VISIBLE FOCUS RING (${noRing.length}):`);
      noRing.slice(0, 12).forEach((s) => console.log('    ' + s));
    } else console.log('  focus: every focusable paints an outline');

    // ---- reduced motion ----
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const moving = await page.evaluate(() =>
      Array.from(document.querySelectorAll('body *')).filter((el) => {
        const cs = getComputedStyle(el);
        return cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0;
      }).length
    );
    const hidden = await page.evaluate(() =>
      Array.from(document.querySelectorAll('body *')).filter(
        (el) => getComputedStyle(el).opacity === '0' && el.textContent.trim().length > 1
      ).map((el) => el.tagName + '.' + el.className).slice(0, 6)
    );
    console.log(`  reduced-motion: ${moving} elements still animating` +
      (hidden.length ? `, STUCK INVISIBLE: ${hidden.join(', ')}` : ', nothing stranded invisible'));
    if (moving > 0 || hidden.length) fail++;

    await page.close();
  }

  await browser.close();
  console.log('\n' + (fail ? `>>> ${fail} check group(s) with findings` : '>>> all checks clean'));
})();
