# KS-Puzzle-Game

A mobile-web jigsaw puzzle for **কৃতী শিক্ষার্থী ২০২৬** (10 Minute School). Players
register with name, school and phone, assemble a 20-piece medal puzzle against a
timer, and their result is written to a Google Sheet. Each phone number gets 5
attempts.

Plain HTML/CSS/JS — no framework, no build step, no server. The only backend is a
Google Apps Script Web App (see [google-apps-script/Code.gs](google-apps-script/Code.gs)),
whose `/exec` URL lives in [public/js/puzzle-sheet.js](public/js/puzzle-sheet.js).

## Layout

```text
public/          <- the entire deployed site; nothing else ships
  index.html
  assets/  css/  js/
  _headers       <- Cloudflare header rules
vercel.json      <- Vercel config (serves public/)
wrangler.jsonc   <- Cloudflare Workers config (serves public/)
md/  ref_image/  google-apps-script/   <- internal only, never deployed
```

Everything deployable lives in `public/`. That boundary is the security model:
design notes, reference art and the Apps Script source cannot be served by
accident, because the hosts are pointed at `public/` and never see the rest.
**Do not put anything in `public/` that shouldn't be world-readable.**

## Local development

Use a static server rather than opening the file directly — `file://` pages get a
`null` origin, which the Apps Script fetch rejects:

```bash
npx serve public          # or: cd public && python -m http.server 8000
```

## Deploying to Vercel

Config is in [vercel.json](vercel.json); no dashboard settings are required.

**From Git:** import the repo at [vercel.com/new](https://vercel.com/new). Set
Framework Preset to **Other** and leave Build Command empty — `vercel.json`
already sets Output Directory to `public`. Deploy.

**From the CLI:**

```bash
npx vercel          # preview deployment
npx vercel --prod   # production
```

[.vercelignore](.vercelignore) keeps internal folders out of the upload entirely,
so they never reach Vercel's build servers.

## Deploying to Cloudflare

Either product works; both read [public/_headers](public/_headers).

**Cloudflare Pages (dashboard, Git-connected):** Workers & Pages → Create →
Pages → Connect to Git. Leave **Build command** empty and set **Build output
directory** to `public`. Save and Deploy.

**Cloudflare Workers (CLI):** [wrangler.jsonc](wrangler.jsonc) declares an
assets-only Worker — there is no server code, Cloudflare just serves `public/`.

```bash
npx wrangler deploy
```

## Headers

Cache and security headers are defined twice — in `vercel.json` for Vercel and in
`public/_headers` for Cloudflare — because the two platforms have no shared
format. **Edit both together** or the platforms will drift apart.

Two things worth knowing before you change them:

- **Cache TTLs are short on purpose.** Asset filenames carry no content hash, so
  `js/main.js` always has the same URL. A long immutable cache would strand
  players on broken game code after a fix. `index.html` revalidates every
  request; JS/CSS cache for an hour; images for a day.
- **`frame-ancestors 'self'` blocks embedding.** If the game needs to run inside
  an iframe on another domain (e.g. a 10 Minute School landing page), change that
  directive in *both* files to name the parent origin, or the iframe renders
  blank.
