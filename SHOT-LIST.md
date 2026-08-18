# Shot list

Both builds have photo slots wired as CSS background layers with a toned gradient behind them. Drop a file in with the exact name and it appears. Leave it out and you get a clean tonal block instead of a broken-image icon — nothing looks broken either way.

Free and commercially licensed: **Unsplash**, **Pexels**, **Openverse**. Do not hotlink — download, compress, and serve locally. Target under 300 KB each, WebP if you can, JPG is fine.

---

## crestline-dental/images/

| File | What it needs to be | Search terms |
|---|---|---|
| `hero-portrait.jpg` | Smiling patient, natural light, uncluttered light background. Portrait or square crop. Leaves room top and bottom — pills sit over the top, the info card over the bottom. | "smiling woman portrait natural light", "happy patient dentist" |
| `operatory.jpg` | Treatment room, wide, daylight through a window. Empty chair is fine and often better. | "dental clinic interior", "dental operatory window" |
| `dr-alvarado.jpg` | Doctor portrait, 4:5, white coat or scrubs, plain background. | "female dentist portrait", "doctor white coat portrait" |
| `scan.jpg` | Chairside tech — 3D scanner, intraoral camera, screen showing teeth. | "dental 3d scanner", "intraoral camera dentist" |
| `exterior.jpg` | Storefront or entrance, so patients recognise it from the street. | "dental office exterior", "medical office storefront" |

Keep the whole set in one light, cool-daylight tone. Mixing a warm yellow interior with a cold blue one is the fastest way to make a real site look stitched together.

## marisol/images/

| File | What it needs to be | Search terms |
|---|---|---|
| `hero.jpg` | Dark dining room mid-service. Candlelight, shallow depth of field, no faces in focus. This one carries the page — spend the most time here. | "restaurant interior candlelight dark", "fine dining room evening" |
| `polaroid-1.jpg` | Single plated dish, square crop, dark plate. | "plated fish fine dining", "seafood dish dark plate" |
| `polaroid-2.jpg` | Cocktail or a wine pour, low light, square. | "cocktail dark moody", "mezcal cocktail bar" |
| `kitchen.jpg` | Open fire or grill, hands working, warm and dark. | "chef grill fire kitchen", "open flame restaurant kitchen" |
| `room-1.jpg` | Wide dining room, tall crop — this one spans two rows. | "restaurant dining room wide" |
| `room-2.jpg` | Open kitchen or the pass. | "restaurant pass open kitchen" |
| `room-3.jpg` | The pier, boats, or the ocean at dawn. | "newport beach pier dawn", "fishing dory boats beach" |
| `counter.jpg` | Chef's counter, cooks plating, fire behind. | "chefs counter omakase", "kitchen counter seating restaurant" |

Everything here should be underexposed and warm. If a photo is bright and evenly lit it will fight the overlay and the type will lose contrast.

---

## Both sites

Compress before shipping:

```bash
# needs imagemagick
mogrify -resize 2000x2000\> -quality 82 *.jpg
```

Check contrast after you add the hero photos. The overlays are tuned for dark images; a bright hero will make the white and cream headlines hard to read, and you'll need to push the gradient darker in `#hero .bg::after` (Marisol) or `.hero-r` (Crestline).
