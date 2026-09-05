# md-to-pdf

A single-page web app that turns markdown into a good-looking PDF, with markdown
on the left, the rendered result on the right, and no accounts, setup, or
cloud storage.

## Run locally

```bash
pnpm install
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
```

Fill in `apps/worker/.dev.vars` with your own Cloudflare credentials (see
Deploy below) if you want the PDF route to work locally.

To work on the UI alone, without the PDF route:

```bash
pnpm -F web dev
```

To run the full app, including the Worker's `/api/pdf` route:

```bash
pnpm build && pnpm -F worker dev
```

## Workspace layout

- `apps/web`, the Vite plus React front end: editor, preview, HTML view, and
  PDF view.
- `apps/worker`, the Cloudflare Worker that serves the built assets and
  proxies PDF requests to Cloudflare's Browser Rendering API.
- `packages/markdown`, the markdown pipeline: `marked` with GFM, syntax
  highlighting, footnotes, video embeds, and heading ids.
- `packages/ui`, shared shadcn/ui components used by the web app.
- `packages/tsconfig`, shared TypeScript configs for the other packages.

## Deploy

The PDF route needs two Worker secrets: `CF_ACCOUNT_ID` and `CF_API_TOKEN`
(the API token needs the Browser Rendering edit scope). Set them as Worker
secrets, or put them in `apps/worker/.dev.vars` for local development:

```bash
pnpm -F worker exec wrangler secret put CF_API_TOKEN
pnpm -F worker exec wrangler secret put CF_ACCOUNT_ID
```

Then build and deploy:

```bash
pnpm deploy
```

This runs `web#build` (the Vite build plus the bundle budget check) and then
`wrangler deploy` from `apps/worker`, which serves `apps/web/dist` as static
assets and handles `/api/*` routes itself.

`/api/pdf` only accepts same-origin requests, but that is not a substitute
for rate limiting: a Cloudflare rate-limiting rule on `/api/pdf` is
recommended to keep any one client from draining the Browser Rendering
quota.

## Limits

The PDF route runs on Cloudflare's Browser Rendering, which has real limits.
On the Workers Free plan: 10 browser-minutes per day and one REST request per
10 seconds account-wide. A render takes roughly 2 to 4 seconds, so about 150
to 300 PDFs per day, serialized. That is fine for personal use. Workers Paid
($5/month) raises this to 10 browser-hours per month and 30 requests per
second, with overage billed at $0.09 per browser-hour. Every request body is
capped at 50 MB by Cloudflare and 2 MB by this app.

## Video markdown

Standard image syntax is used for video embeds too. The markdown pipeline
detects the URL and swaps in a player for the preview and a static
placeholder for the PDF, since the PDF cannot play video:

| Markdown | Preview | PDF |
|---|---|---|
| `![alt](https://.../clip.mp4)` (`.mp4`, `.webm`, `.mov`, `.m4v`) | `<video controls preload="metadata" src>` | bordered placeholder with a play glyph, the alt text, and the URL as a link |
| `![alt](https://www.youtube.com/watch?v=ID)`, `youtu.be/ID`, `/shorts/ID` | 16:9 `youtube-nocookie.com` embed | YouTube thumbnail, alt as caption, linked to the video |
| `![alt](https://vimeo.com/ID)` | 16:9 Vimeo player embed | placeholder as for a video file (Vimeo thumbnails would need an API call) |

Everything else in image syntax stays a plain `<img>`.

## Copy

All user-facing strings live in `apps/web/src/copy.ts`.

## Further reading

- Design spec: `docs/superpowers/specs/2026-09-05-md-to-pdf-design.md`
- Implementation plan: `docs/superpowers/plans/2026-09-05-md-to-pdf.md`
