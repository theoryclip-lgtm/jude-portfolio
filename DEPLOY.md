# Deploying the portfolio

Everything is built and committed. What's left needs your GitHub login, which
this machine doesn't have — there's no `gh` CLI and no stored credentials.

---

## Step 1 — Create the repo (2 min)

Go to <https://github.com/new>

- **Repository name:** `jude-portfolio`
- **Public** (required — GitHub Pages on the free plan won't serve a private repo)
- **Do not** tick "Add a README", "Add .gitignore", or "Choose a license". The
  repo here already has commits; those options create a conflicting first commit.

Then, in this folder:

```bash
git remote add origin https://github.com/theoryclip-lgtm/jude-portfolio.git
```

```bash
git push -u origin main
```

A browser window will ask you to sign in to GitHub the first time. That's the
one thing I couldn't do for you.

## Step 2 — Turn on Pages (1 min)

In the repo: **Settings → Pages → Build and deployment → Source → GitHub Actions**.

That's the only setting to change. `.github/workflows/deploy.yml` is already in
the repo; it runs `deploy-build.js` and publishes `dist/` on every push to
`main`. Watch it under the **Actions** tab — first run takes about two minutes.

Your site:

```
https://theoryclip-lgtm.github.io/jude-portfolio/
```

## Step 3 — Custom domain: judewebdev.com (~$11/yr)

Buy at [Cloudflare Registrar](https://domains.cloudflare.com) — wholesale price,
no renewal hikes — or Namecheap. Then:

1. In Cloudflare → **judewebdev.com** → **DNS** → **Add record**, five times:

   | Type | Name | Content | Proxy |
   | --- | --- | --- | --- |
   | A | `@` | `185.199.108.153` | **DNS only** (grey cloud) |
   | A | `@` | `185.199.109.153` | **DNS only** |
   | A | `@` | `185.199.110.153` | **DNS only** |
   | A | `@` | `185.199.111.153` | **DNS only** |
   | CNAME | `www` | `theoryclip-lgtm.github.io` | **DNS only** |

   The proxy toggle has to be grey, not orange. Cloudflare's proxy sits in front
   of the origin and intercepts the domain-validation request GitHub makes to
   issue the TLS certificate, so an orange cloud leaves the site stuck on plain
   HTTP with nothing obvious to point at.

2. Repo **Settings → Pages → Custom domain** → `judewebdev.com` → Save.
3. Tick **Enforce HTTPS** once the certificate finishes (up to an hour).

Nothing else changes. `configure-pages` reports the new URL to the workflow, and
`deploy-build.js` stamps it into the canonical tag, the social card URL and the
sitemap, and writes the `CNAME` file — all on the next push.

One thing that only starts working at this point: `robots.txt` is honoured at a
domain root and nowhere else, so while the site lives under `/jude-portfolio/`
its `Disallow` rules are ignored. On `judewebdev.com` they count. The `noindex`
tags on the demo pages have been carrying that job either way.

---

## Updating the site

Edit `jude-portfolio.html`, then:

```bash
git add -A && git commit -m "what changed" && git push
```

Two minutes later it's live. To see it locally first: `node deploy-build.js` and
open `dist/index.html`.

## If you'd rather not use git at all

Run `node deploy-build.js`, then drag the **`dist`** folder onto
<https://app.netlify.com/drop>. Live in under a minute, no repo. You lose
version history and have to re-drag on every change — fine as a stopgap, worse
as a habit.

---

## What's in the repo

| Path | What it is |
| --- | --- |
| `jude-portfolio.html` | The portfolio. The only file you normally edit. |
| `crew-salon/`, `marisol/`, `nailed-it-studio/` | The three demo sites. |
| `deploy-build.js` | Assembles `dist/` — the folder that gets uploaded. |
| `build.js` + `inline-assets.js` | Builds the single-file `jude-portfolio-standalone.html`. |
| `assets/` | Social card and favicons. `_`-prefixed files are the sources they were rendered from. |
| `.github/workflows/deploy.yml` | Publishes to Pages on push. |

`dist/`, `node_modules/`, `shots/` and the standalone file are gitignored —
all of them are regenerated, never edited by hand.

## Before you send the link

- [ ] Text Crew Salon that their site is in your portfolio. The pages carry
      `noindex` and their canonical points at `crewsalon.com`, so you can't
      outrank them — but they should hear it from you first, not from a Google
      Alert.
- [ ] Open the site on your own phone and press the Call button. It should dial
      (714) 510-6198.
- [ ] Paste the link into a text message to yourself and check the preview card
      renders (dark card, big headline, your number).

**Send the link. Never the HTML file.** Attachments get stripped by spam
filters, and a `.html` attachment from an unknown sender looks like malware to
exactly the kind of cautious small-business owner you're pitching.
