# Marisol — image drop

Eight slots. Drop a file in here with the **exact filename** below and it
appears on the page. Leave one out and you get the composed candlelight
gradient behind it instead — nothing looks broken either way, and nothing
shifts when the photo arrives, because every slot already reserves its aspect
ratio in CSS.

Sources: **Unsplash**, **Pexels**, **Openverse** (free, commercially licensed).
Download and serve locally — do not hotlink.

---

| File | Ratio | What it has to be |
|---|---|---|
| `hero.jpg` | **wide, ≥2000px** | Dark dining room mid-service. Candlelight, shallow depth of field, no faces in focus. **This one carries the page — spend the most time here.** The headline sits on the lower left, so keep that area quiet and dark. |
| `polaroid-1.jpg` | **1:1 square** | Single plated dish, dark plate, shot from above. |
| `polaroid-2.jpg` | **1:1 square** | A cocktail or a wine pour, low light. |
| `kitchen.jpg` | **4:5 portrait** | Open fire or grill, hands working, warm and dark. Runs off the right edge of the viewport, so keep the subject left of centre. |
| `room-1.jpg` | **tall, ~3:4** | Wide dining room, candles lit. Spans two rows in the grid — the tallest slot on the page. |
| `room-2.jpg` | **16:9 landscape** | Open kitchen or the pass. |
| `room-3.jpg` | **16:9 landscape** | The pier, the boats, or the ocean at dawn. This is the one that says *coastal* rather than *steakhouse* — don't skip it. |
| `counter.jpg` | **4:5 portrait** | Chef's counter, cooks plating, fire behind. |

---

## Tone

Everything here should be **underexposed and warm**. If a photo is bright and
evenly lit it will fight the overlay and the type will lose contrast.

## Before you ship

```bash
# needs imagemagick
mogrify -resize 2000x2000\> -quality 82 *.jpg
```

Target **under 300 KB** each. WebP if you can, JPG is fine — if you switch to
WebP, update the eight `url("images/....jpg")` references in `../index.html`.

## Contrast — check this after you add `hero.jpg`

The nav, the headline, the tagline and the address line all sit **directly on
the photograph**. The overlay in `#hero .bg::after` is tuned for a dark image
and includes a top scrim specifically so the brass "Reservations" link holds
4.5:1 against whatever you drop in.

If your hero is brighter than expected, push the first gradient stop darker:

```css
/* marisol/index.html — #hero .bg::after */
linear-gradient(to bottom, rgba(10,8,6,.76) 0%, ...)   /* raise .76 */
```

Then re-measure rather than eyeballing it:

```bash
node ../audit-pixels.js
```

That samples the real composited pixels underneath each glyph, which is the
only way to check text sitting on a photograph.
