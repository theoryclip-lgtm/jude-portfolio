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

## Step 3 — Custom domain (later, ~$10/yr)

Buy the domain at [Cloudflare Registrar](https://domains.cloudflare.com) (sells
at cost) or Namecheap. Then:

1. Repo **Settings → Pages → Custom domain** → enter the domain → Save.
2. At the registrar, add these DNS records:

   | Type | Name | Value |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `theoryclip-lgtm.github.io` |

3. Tick **Enforce HTTPS** once the certificate finishes (up to an hour).

The workflow picks the domain up automatically — `configure-pages` reports the
live URL and `deploy-build.js` stamps it into the social tags and sitemap.

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
