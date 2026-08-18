# Claude Code prompt — portfolio demo rebuild

Paste everything below the line into Claude Code, from the folder containing
`jude-portfolio.html`. Attach the five reference screenshots first — Claude Code
reads images from disk, so drop them in `refs/` and it will pick them up.

---

Read `.claude/skills/` and load **Emil Kowalski Design** and **UI UX Pro Max** before you write any code. Both apply to this entire task. Tell me which skills you loaded before you start.

## What this is

I build websites for local businesses in Orange County. This is my portfolio. The demo sites in it are what convinces a dentist or a restaurant owner to hire me, so they have to look like a working professional made them for a paying client — not like an AI generated a landing page.

Two demo sites need rebuilding to that standard:

- `crestline-dental/index.html` — family and cosmetic dental practice, Placentia CA
- `marisol/index.html` — coastal tasting-menu restaurant, Newport Beach

The current versions are structurally fine and the copy is good. The visual execution is not. Treat the existing files as a content source and a starting layout, not as something to preserve.

## Design references

In `refs/`:

- `ref-dental-1.png` — **primary reference for Crestline.** Dusty blue-grey, condensed uppercase display type, rounded cards, circular arrow badges, big numeral stats, asymmetric section headers with a small dotted label in a narrow left column.
- `ref-dental-2.png` — weak reference. Only useful for the floating booking widget over the hero. Ignore the rest, it's a ThemeForest template.
- `ref-dental-3.png` — full-bleed photo hero, floating pill nav, glass cards layered over the photo, two-tone paragraphs with the emphasis in black and the rest in grey.
- `ref-restaurant-1.png` — loud red burger brand. Reference for **type confidence and scale only**, not palette.
- `ref-restaurant-2.png` — **primary reference for Marisol.** Full-bleed dark photo, huge thin letterspaced serif, polaroid cards pinned at an angle, gold circular monogram, marquee ticker with ✳ separators.

Match the *reasoning* in these references, not the pixels. I want to see the same level of craft, not a tracing.

## Non-negotiable: kill the AI tells

Before you write code, read this list. After you build, audit your own output against it and fix what you find. Report what you caught.

**Layout**
- No three-column icon-heading-paragraph card grid. If you catch yourself making one, restructure it.
- Do not give every section the same padding, the same max-width, and the same centered heading. Vary the rhythm deliberately — some sections full-bleed, some inset, some asymmetric.
- Layer things. Real editorial work overlaps elements, breaks them out of their container, lets a photo bleed past a column edge. Perfect symmetry reads as generated.
- No uniform border-radius across every element. Pick where roundness means something.

**Type**
- The display face has to get genuinely large somewhere — the reference sites go to 8–15vw. Timid type is a tell.
- Set a real scale with intentional jumps. Do not size everything with the same `clamp()` formula.
- Do not use the same font pairing you would reach for on any other project.

**Motion**
- One orchestrated moment, not fifteen scattered fade-ups. If every element fades in on scroll it looks generated.
- Every hover state being `translateY(-4px)` is a tell. Vary them or drop most of them.

**Copy**
- Zero marketing filler. No "elevate your smile," no "experience the difference," no "committed to excellence."
- Keep the specificity that's already in the files — real prices, named insurance carriers, actual hours, the front desk person's name, the dory fleet detail. Messy specifics are what real businesses put on real sites.

**Craft**
- No emoji anywhere.
- Line icons must be drawn for this project, not pulled from a generic set.
- Palette: derive it from the reference, use it unevenly. Real palettes have a dominant, a support, and an accent used sparingly — not five tokens at equal weight.

## Photos

Neither site has photography yet. Every image slot is wired as a CSS background layer with a composed gradient fallback behind it. `SHOT-LIST.md` lists all thirteen slots, what each shot needs to be, and search terms.

Do this:

1. Keep the slot architecture — filename, path, fallback layer.
2. Improve the fallback compositions if you can do better than what's there.
3. Add `width`/`height` or `aspect-ratio` on every slot so nothing shifts when the real image loads.
4. Write `images/README.md` in each folder listing exactly what file to drop in.

Do not fake photographs with CSS shapes, SVG illustration, or generative art. A gradient that reads as atmosphere is fine. A CSS drawing of a person is not.

## Professional-build requirements

These are what separate a dev build from a generated one, and they are part of "done":

- Semantic HTML, correct heading order, no `<div>` where a `<section>`, `<article>`, or `<nav>` belongs.
- Visible keyboard focus on every interactive element. Test by tabbing through.
- Verify text contrast against the actual background at 4.5:1 for body copy. The dark restaurant site is where this will fail — check it.
- `prefers-reduced-motion` respected.
- Fonts: `display=swap`, preconnect, and subset if you can.
- Schema.org JSON-LD — `Dentist` for Crestline, `Restaurant` for Marisol, with real address, hours, price range, and phone. This is the single most obviously-a-pro-did-this detail on a local business site and every AI build skips it.
- Open Graph and Twitter card meta, plus a favicon.
- Responsive at 380, 768, 1024, and 1440. Not "doesn't break" — actually good at each.

## Verify visually, then iterate

Do not hand me the first version. Install Playwright, screenshot each site at 1440 and 380, look at the screenshots, and fix the three worst things. Repeat until you would be comfortable showing it to a paying client. Show me the before and after screenshots.

## Portfolio integration

Once both sites are done:

1. The portfolio at `jude-portfolio.html` embeds each demo in an iframe preview at 30% scale. Confirm both still read well at that scale — a design that only works at full size is useless here.
2. Run `python3 build.py` to regenerate `jude-portfolio-standalone.html`, which inlines every demo so the previews work without folder structure.
3. Update the two project card descriptions in `jude-portfolio.html` if the rebuild changed what's worth pointing at.
4. Leave the `nailed-it-studio` card alone.

## Definition of done

I should be able to open either site and not be able to tell whether a person or a model built it. Where you had to choose between "safe" and "distinctive," you chose distinctive and can explain why.

Start by giving me a short plan and your palette and type decisions for both sites. Wait for my go-ahead before writing code.
