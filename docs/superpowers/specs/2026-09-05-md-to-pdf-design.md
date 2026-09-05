# MD to PDF — design spec

Date: 2026-09-05
Status: approved by Jay on 2026-09-05 (Turborepo added at his request)
Repo: https://github.com/sutharjay1/md-to-pdf (private)

---

## 1. What this is

A single-page web app. Markdown on the left, the result on the right. The
right pane has two views: the rendered document and the raw HTML. One button
downloads the PDF.

It exists for one job: turn a markdown file into a good-looking PDF with no
setup. Nothing else. No accounts, no cloud storage, no sharing, no analytics.

**Goals**

- Fast: usable in under a second on a cold load, preview updates as you type.
- Light: the initial JavaScript bundle stays under 150 KB gzipped.
- Calm: near-monochrome, one accent, subtle motion, no loops.
- Easy: open the page, paste markdown, click **Download PDF**. Done.

**Non-goals (v1)**

- Multiple documents, folders, or a document list
- Collaboration, sharing links, cloud sync
- Scroll sync between editor and preview
- Themes for the PDF (one paper style)
- Analytics (see Open questions, §17)

---

## 2. Decisions

| # | Decision | Chosen | Why |
|---|---|---|---|
| 1 | Front-end stack | Turborepo + pnpm workspaces; Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui | Jay asked for Turborepo. shadcn/ui is React + Tailwind, so this is the smallest stack that satisfies the design-system requirement. Vite builds a static bundle Cloudflare serves as assets. |
| 2 | PDF generation | Cloudflare Browser Rendering `/pdf` endpoint, called from one Worker route | Real PDF bytes, one-click download, Chrome fidelity. Alternatives in §10.4. |
| 3 | Linear team | Jay | Jay's choice. |
| 4 | Repository | `github.com/sutharjay1/md-to-pdf`, private | Jay asked for the repo; private until he flips it. |
| 5 | PDF viewer | Extend UI `PDFViewer` (EmbedPDF/PDFium, MIT), lazy-loaded, WASM self-hosted, upload/rotate/download hidden | Jay asked for it on 2026-09-06 over the native iframe. Guardrails keep the initial bundle and the no-CDN rule intact. |
| 6 | Security headers | Workers static-assets `_headers` file, not Worker code | With `run_worker_first` limited to `/api/*` the Worker never sees HTML requests. |
| 7 | PDF preview | Removed; Download only | Jay, 2026-09-06: cost and simplicity; the Worker route is unchanged, the Extend viewer and PDFium chunk are gone |

## 3. References

- **Cursor.com on Mobbin** (the UI/UX reference Jay chose):
  https://mobbin.com/sites/cursor-0a30f134-78d8-4b99-9245-8b0ccbc49bfb/018632ec-acc2-4113-bc40-6605e6a7162d/preview
  Screens that informed this spec:
  - Split pane with centered segmented tabs in the pane header (Setup · Secrets · Git · Desktop · Terminal): https://mobbin.com/screens/ea6ec2b1-958b-4c11-bc01-a8288f02668c
  - Diff view: bordered, rounded code card with muted file headers: https://mobbin.com/screens/d744068a-1835-4c35-afa2-e560ccbe565d
  - Agent page: hairline sidebar divider, 13px type, black pill primary button, grey chip secondaries: https://mobbin.com/screens/fef89c8a-bc7c-4167-9471-104efee61a6e
  - Marketing page: one sentence, one button, generous whitespace: https://mobbin.com/screens/fe74d042-38df-4046-9bef-65533403e2d7
- **House design system**: `/Users/jay/root/exact-kb/DESIGN.md` (near-monochrome, orange single accent, Inter + Geist Mono, motion rules). The language carries over; the Astro/CSP implementation details do not.
- **shadcn/ui**: https://ui.shadcn.com — style `new-york`, base colour `neutral`, CSS variables on.
- **Cloudflare Browser Rendering**
  - `/pdf` REST endpoint: https://developers.cloudflare.com/browser-rendering/rest-api/pdf-endpoint/
  - Limits: https://developers.cloudflare.com/browser-rendering/platform/limits/
  - Pricing: https://developers.cloudflare.com/browser-rendering/platform/pricing/
- **Workers static assets**: https://developers.cloudflare.com/workers/static-assets/
- **Turborepo**: https://turborepo.dev/ · **shadcn monorepo setup**: https://ui.shadcn.com/docs/monorepo
- **marked**: https://marked.js.org · **highlight.js**: https://highlightjs.org · **morphdom**: https://github.com/patrick-steele-idem/morphdom

What the Cursor reference taught us, in one list: surfaces are white or
`neutral-50`, separation is a 1px `neutral-200` line, interface type is 13–14px,
the primary action is a small filled pill, secondary actions are text or
outline, and the pane header carries a segmented control rather than a global
tab bar.

---

## 4. Architecture

```
browser (static SPA, Vite build, served as Workers static assets)
  ├─ editor        textarea, autosaved to localStorage
  ├─ render        markdown → HTML fragment (marked + GFM + video + highlight.js)
  ├─ Preview tab   fragment patched into the DOM with morphdom
  ├─ HTML tab      fragment shown as highlighted source, Copy
  └─ Download      POST /api/pdf {html, page} → PDF blob → saved as <title-slug>.pdf

worker (one route: POST /api/pdf)
  ├─ validates body (size, page value)
  ├─ wraps fragment in the print document: prose.css + embedded fonts
  ├─ calls Cloudflare Browser Rendering POST /pdf with {html, pdfOptions}
  └─ streams the PDF back (application/pdf)
```

Turborepo layout: `apps/web` (the SPA), `apps/worker` (the Worker, with an
`assets` binding pointing at `../web/dist`), `packages/markdown` (the render
pipeline and `prose.css`, pure TypeScript, tested in node), `packages/ui`
(shadcn components and the token stylesheet), `packages/tsconfig`. The
packages ship source; Vite and Wrangler compile them where consumed. One
deployable. No database, no KV, no Durable Objects. The API token for Browser
Rendering is a Worker secret.

Units and their contracts:

| Unit | Does | Depends on |
|---|---|---|
| `packages/markdown/src/render.ts` | `render(markdown): Promise<string>` — fragment HTML | marked, highlight.js (lazy), video extension |
| `packages/markdown/src/video.ts` | marked extension: image syntax with video/YouTube/Vimeo URL → embed | nothing |
| `apps/web/src/lib/pdf.ts` | `requestPdf(html, page): Promise<Blob>` | fetch |
| `apps/web/src/lib/storage.ts` | `loadDoc / saveDoc / loadPrefs / savePrefs` | localStorage |
| `packages/markdown/src/text.ts` | `titleFrom(markdown): string`, `filenameFrom(title): string`, `wordCount(markdown): number` | nothing |
| `apps/worker/src/index.ts` | `/api/pdf` handler + asset fallthrough | Browser Rendering REST, ASSETS binding |
| `packages/markdown/prose.css` | the document look, shared by Preview and PDF | nothing |

Every module above is pure and has a test file beside it.

---

## 5. Layout

Desktop (≥ 1024px):

```
┌────────────────────────────────────────────────────────────────────┐
│ MD to PDF                          ◐   A4 ▾   [ Download PDF ]     │  app bar, 44px
├───────────────────────────────┬────────────────────────────────────┤
│ Markdown            1,204 words│ Preview · HTML              Copy   │  pane headers, 36px
├───────────────────────────────┼────────────────────────────────────┤
│                               │                                    │
│  # Title                      │   Title                            │
│  Body text…                   │   Body text…                       │
│                               │                                    │
│                               │                                    │
└───────────────────────────────┴────────────────────────────────────┘
```

- Two panes, 50/50, separated by a 1px `--border` line. Not resizable in v1.
- App bar: wordmark left (plain text, no logo, no SVG). Right: theme toggle
  (icon button), the page-size select, then **Download PDF** — the only
  filled button on the page. The page-size select stays visible at every
  width, immediately left of the download button.
- Left pane header: label "Markdown", word count right-aligned in
  `--muted-foreground`, `tabular-nums`. Also an **Open** ghost button that
  accepts `.md` / `.mdx` / `.markdown` / `.txt` files.
- Right pane header: segmented control **Preview · HTML** on the left,
  a contextual action on the right (see §8).
- Content sits directly on `--background`. No cards.

Tablet and phone (< 1024px): one pane. The app bar's right side becomes an
icon-only download button, with the page-size select still next to it. A
three-way segmented control **Write · Preview · HTML** replaces both pane
headers. Inputs stay at 16px so iOS does not zoom.

---

## 6. Copy

All user-facing text, decided. Sentence case throughout. No exclamation marks.

| Where | Text |
|---|---|
| Wordmark | `MD to PDF` |
| Browser tab title | `<document title> · MD to PDF`, or `MD to PDF` when empty |
| App bar, primary button | `Download PDF` |
| App bar, theme toggle (aria-label) | `Switch to dark theme` / `Switch to light theme` |
| Left pane label | `Markdown` |
| Left pane, open file | `Open` |
| Word count | `1 word` / `1,204 words` |
| Editor placeholder | `Write markdown here. It saves as you type.` |
| Segmented control | `Preview` · `HTML` (mobile adds `Write` first) |
| Preview, empty | `Nothing to preview yet.` |
| HTML tab, action | `Copy` → `Copied` (reverts after 1.5 s) |
| HTML tab, empty | `No HTML yet.` |
| Download, rendering | `Rendering…` (button label while a render is in flight) |
| Page size (app bar) | `A4` · `Letter` |
| Download, error (generic) | toast `Couldn't render the PDF.` |
| Download, error (rate limit) | toast `Too many requests. Wait a moment and try again.` |
| Download, error (too large) | toast `The document is too large to render. Trim it to under 2 MB of HTML.` |
| Open file, wrong type | `Open a .md, .mdx, .markdown or .txt file.` |
| Open file, replaces content | no confirmation dialog; the current doc is kept in a one-step undo: `Replaced with <name>.` + `Undo` (a toast, 6 s) |
| Downloaded filename | `<title-slug>.pdf`, fallback `document.pdf` |
| Footer (none) | — there is no footer |

Welcome document (pre-filled on first visit, lives in `apps/web/src/welcome.md`):

````markdown
# Write on the left, get a PDF on the right

This editor turns markdown into a clean PDF. It saves as you type, so you can
close the tab and come back.

## What works

- **Bold**, *italic*, `code`, [links](https://example.com), and ~~strikethrough~~
- Lists, task lists, tables, blockquotes, and footnotes
- Code blocks with syntax highlighting
- Images and video

| Element | Preview | PDF |
| --- | --- | --- |
| Tables | yes | yes |
| Video | plays inline | thumbnail with a link |

```ts
export function greet(name: string): string {
  return `Hello, ${name}`
}
```

## Video

Use the image syntax with a video URL:

![A short demo](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

Press **Download PDF** in the top right when you are ready.
````

---

## 7. Design system

shadcn/ui, `new-york` style, `neutral` base, CSS variables. Tokens follow the
house system; the values below are the ones that differ from shadcn defaults.

| Token | Light | Dark |
|---|---|---|
| `--background` / `--foreground` | white / `neutral-950` | `neutral-950` / `neutral-50` |
| `--primary` / `--primary-foreground` | `orange-600` / `neutral-950` | `orange-500` / `neutral-950` |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` |
| `--border` | `neutral-200` | `neutral-800` |
| `--ring` | `orange-600` | `orange-500` |
| `--radius` | `0.625rem` | same |

Orange appears in exactly two places: the **Download PDF** button and the
active segment indicator's text. Nothing else. `--primary-foreground` is
near-black because white on orange fails WCAG AA (measured: 3.44:1 on
orange-600).

Typography: Inter for interface and prose, Geist Mono for the editor, the HTML
view, and code. Both self-hosted as variable woff2 in `apps/web/public/fonts/`; never a
font CDN request. Scale: 13px pane headers, 14px interface, 14px editor,
16px prose, 13px code. `tabular-nums` on the word count.

Components used from shadcn/ui: `Button`, `Tabs` (as the segmented control),
`Select` (page size), `Toggle` (theme), `Tooltip` (icon buttons), `Sonner`
(toast). Nothing else is installed. Icons from `lucide-react`, 16px, stroke
1.5. No custom or generated SVGs.

Theme: light by default. Dark only from a stored preference, never from
`prefers-color-scheme`. The PDF is always light.

Surfaces, in order of preference: nothing, hairline divider, recessed
`--muted` well. No cards in v1.

Focus: `focus-visible:outline-2 outline-offset-2 outline-ring`. Touch targets
clear 24px on fine pointers and 44px on coarse ones.

---

## 8. Right pane behaviour

**Preview** — the rendered document, 16px Inter, max width 72ch, centered,
40px padding. Updated on every input, debounced 80 ms, patched with morphdom
so scroll position and playing videos survive edits. External links open in a
new tab.

**HTML** — the same fragment as source text, highlighted (`xml` grammar),
Geist Mono 13px, soft-wrapped, read-only, selectable. Header action: **Copy**.
This is exactly the HTML the PDF is built from, so what you see is what ships.

**Download PDF** (app bar, decision 7) — there is no PDF preview; the button
is the only way to get a PDF. If the last render is fresh for the current
HTML and page size, it saves that blob straight away. Otherwise it renders
first, then saves. The button reads `Rendering…` and is disabled while a
render is in flight. `Cmd/Ctrl+S` triggers the same action and suppresses the
browser's save dialog. A render failure never blocks the UI: it surfaces as a
`sonner` toast (`Couldn't render the PDF.`, the rate-limit message, the
too-large message, or the not-configured message, per §6) and the app is
immediately ready to try again.

---

## 9. Markdown pipeline

`marked` with GFM (tables, task lists, strikethrough, autolinks), plus:

- `marked-highlight` + `highlight.js` core with a curated grammar set
  (`ts`, `js`, `json`, `bash`, `python`, `go`, `rust`, `css`, `xml`, `markdown`,
  `yaml`, `sql`, `diff`). Loaded lazily the first time a fenced block with a
  language appears. Class-based output; one theme stylesheet (`github` light)
  shared by Preview and PDF. No inline styles, so a strict CSP stays possible.
- `marked-footnote` for `[^1]`.
- The video extension (§9.1).
- Heading ids (slugified) so the PDF's internal links work.
- Raw HTML in markdown passes through unchanged. The document is the user's
  own and never leaves their browser except to the PDF renderer, so no
  sanitiser in v1. Adding any sharing feature requires DOMPurify first; this
  is recorded so nobody forgets.

### 9.1 Video markdown

Image syntax, video URL:

| Markdown | Preview | PDF |
|---|---|---|
| `![alt](https://…/clip.mp4)` (`.mp4`, `.webm`, `.mov`, `.m4v`) | `<video controls preload="metadata" src>` | bordered placeholder with a play glyph (text `▶`), the alt text, and the URL as a link |
| `![alt](https://www.youtube.com/watch?v=ID)`, `youtu.be/ID`, `/shorts/ID` | `<iframe src="https://www.youtube-nocookie.com/embed/ID">` 16:9 | `https://img.youtube.com/vi/ID/hqdefault.jpg` thumbnail, alt as caption, linked to the video |
| `![alt](https://vimeo.com/ID)` | `<iframe src="https://player.vimeo.com/video/ID">` 16:9 | placeholder as for `.mp4` (Vimeo thumbnails need an API call) |

Everything else in image syntax stays an `<img>`. Both embed forms carry a
`figure` wrapper with the alt as `figcaption` when alt is non-empty. The PDF
substitution is done by CSS + a `data-video` attribute, not a second render:
`prose.css` hides the player and shows the placeholder under `@media print`.

---

## 10. PDF pipeline

### 10.1 Request

`POST /api/pdf`, JSON `{ html: string, page: "A4" | "Letter" }`. `html` is
the fragment from §9. Limits enforced by the Worker: body ≤ 2 MB, `page` in
the allowed set, `Content-Type` must be JSON. Anything else is `400` with a
plain-text reason.

### 10.2 Worker

1. Read `prose.css` and the font files through the `ASSETS` binding (cached in
   module scope after first read).
2. Build the print document: `<!doctype html><html lang="en"><head><style>
   @font-face(data: URIs) + prose.css</style></head><body class="doc">FRAGMENT
   </body></html>`. Fonts are embedded as data URIs so rendering works from
   `wrangler dev` too, where the remote browser cannot reach localhost.
3. `POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/browser-rendering/pdf`
   with `{ html, pdfOptions: { format, printBackground: true, margin: { top:
   "20mm", right: "18mm", bottom: "22mm", left: "18mm" }, preferCSSPageSize:
   false }, rejectResourceTypes: ["script"], gotoOptions: { waitUntil:
   "networkidle0", timeout: 20000 } }`. Auth header from the `CF_API_TOKEN`
   secret.
4. Pass the response through: `200` with `application/pdf` and
   `Cache-Control: no-store`. Upstream `429` → `429`. Anything else → `502`.

Images and YouTube thumbnails referenced by the document are fetched by the
headless browser, not the Worker. Scripts are rejected so embedded HTML cannot
run in the renderer.

### 10.3 Print stylesheet

`prose.css` carries `@media print` rules: `@page` margins are left to
`pdfOptions`; headings `break-after: avoid`; `pre`, `figure` and table rows
`break-inside: avoid` with the header row repeated on each page; code
soft-wraps; links keep their colour but print no URL suffix; the video
placeholder swap (§9.1), whose URL line uses the document font because the
renderer paints Geist Mono invisibly inside that card. Page size comes from
`pdfOptions.format` (sent lowercase), so the same CSS serves both sizes.

### 10.4 Alternatives considered

| Option | Why not |
|---|---|
| Client-only: print stylesheet + `window.print()` | Zero backend and instant, but "download" becomes the browser's print dialog with "Save as PDF" chosen by hand, and no real PDF bytes. Kept as the documented fallback if the Worker is ever removed. |
| Client-side PDF library (pdfmake, jsPDF) | Real bytes, no backend, but 1 MB+ of lazy code and a hand-written markdown→PDF mapping that never matches the preview. |
| Worker with `@cloudflare/puppeteer` binding | Same engine as the REST endpoint with more code (session management) and no benefit at this size. |

### 10.5 Cost and limits

Workers Free: 10 browser-minutes per day, one REST request per 10 seconds
account-wide. A render takes roughly 2–4 s, so about 150–300 PDFs per day,
serialised. Fine for personal use. Workers Paid ($5/month) includes 10 browser
hours per month and 30 requests per second; overage is $0.09 per browser hour.
Every request body is capped at 50 MB by Cloudflare and 2 MB by us.

---

## 11. Persistence

`localStorage` only:

| Key | Value |
|---|---|
| `md2pdf:doc` | the markdown string |
| `md2pdf:theme` | `"light"` / `"dark"` |
| `md2pdf:page` | `"A4"` / `"Letter"` |

Saved 300 ms after the last keystroke and on `pagehide`. First visit with no
stored doc loads the welcome document. Storage failures (private mode, quota)
are swallowed; the app keeps working for the session.

---

## 12. Motion

Subtle, purposeful, never looping. One duration and one curve per group.

| Group | Duration / curve | Property |
|---|---|---|
| Segmented control indicator | 160 ms `cubic-bezier(0.22, 1, 0.36, 1)` | `translate` |
| View switch (tab content) | 120 ms ease-out | `opacity` |
| Button / link hover | 100 ms ease-out | `color`, `background-color` |
| Copy → Copied label swap | 120 ms ease-out | `opacity` |
| Toast enter/exit | 160 ms `cubic-bezier(0.22, 1, 0.36, 1)` | `translate`, `opacity` |
| PDF rendering state | 160 ms ease-out | `opacity` (previous PDF to 60%) |

No spinners, no progress bars, no skeleton shimmer, no pulsing. "Rendering…"
is a static label that fades in. `prefers-reduced-motion: reduce` disables
every transition entirely: states change instantly, nothing parks or jumps.

---

## 13. Accessibility

- Segmented control is a real `tablist` (shadcn `Tabs`), arrow-key navigable.
- Editor is a native `textarea` with a visible label; `Tab` inserts two spaces
  and `Escape` then `Tab` moves focus on (announced via `aria-describedby`).
- Every icon button has an `aria-label` and a tooltip.
- Toasts use `aria-live="polite"`.
- Colour contrast meets AA on every pair; the orange pair is measured, not assumed.

---

## 14. Performance budget

| Item | Budget |
|---|---|
| Initial JS (gzip) | ≤ 150 KB. React 19 ≈ 55, tailwind-merge ≈ 9, sonner ≈ 8, marked ≈ 7, Radix select + tooltip + floating-ui ≈ 15, morphdom ≈ 4, app ≈ 40 |
| Lazy JS | highlight.js core + grammars ≈ 30 KB, loaded on first fenced block |
| Fonts | Inter var + Geist Mono var, subset to Latin, ≈ 120 KB total, `font-display: swap` |
| Preview update | < 16 ms for a 5,000-word document |
| Cold load to interactive (Cloudflare edge, 4G) | < 1 s |

The budget is checked by a script in CI (`apps/web/scripts/check-budget.mjs`) that fails
the build above the limit. Preact via `preact/compat` would bring this to about 90 KB; it
is not adopted.

---

## 15. Error handling

- Render errors in `marked` are impossible by design (it never throws on input);
  highlight failures fall back to plain `<code>`.
- Worker errors surface as the Download toast messages in §6. The client retries
  nothing automatically.
- Clipboard write failure shows the toast `Couldn't copy. Select the text and copy it instead.`
- localStorage failure is silent (see §11).

---

## 16. Testing

- **Unit (Vitest)**: `render.ts` (GFM features, heading ids, footnotes),
  `video.ts` (every URL form in §9.1, negative cases), `text.ts`
  (title, filename, word count), `storage.ts` (round trip, failure swallow).
- **Worker (Vitest)**: the handler takes an injected `fetch` and a fake
  `ASSETS` binding, so request validation, document assembly, and upstream
  error mapping are tested without a Workers runtime.
- **Manual before release**: render the welcome document to PDF on A4 and
  Letter; check page breaks, code wrapping, the YouTube thumbnail, and the
  `.mp4` placeholder. Test on Chrome, Safari, Firefox desktop, and iOS Safari.
- **Budget**: `apps/web/scripts/check-budget.mjs` in CI.

---

## 17. Open questions

1. **"Matomo database"** — the brief says "We need to make the matomo
   database." Matomo is an analytics product; this app has no database and the
   brief also says lighter and faster. I have treated this as a transcription
   slip and left analytics out. If Matomo tracking is wanted, it is a single
   script tag behind a consent toggle and a separate task.
2. **Product name** — `MD to PDF` is used everywhere as the working name. Rename
   is a find-and-replace in `apps/web/src/copy.ts`.

---

## 18. Deployment

- `apps/worker/wrangler.jsonc`: `main: src/index.ts`, `assets: { directory:
  "../web/dist", binding: "ASSETS", not_found_handling:
  "single-page-application", run_worker_first: ["/api/*"] }`,
  `compatibility_date` current.
- Secrets: `CF_API_TOKEN` (Browser Rendering edit scope), `CF_ACCOUNT_ID`.
- `pnpm build` → turbo → Vite → `apps/web/dist/`; `pnpm deploy` → turbo runs
  `web#build` then `wrangler deploy` in `apps/worker`.
- The budget check runs inside `web#build` and fails the build over 150 KB.
- Headers ship from `apps/web/public/_headers` (decisions 6 and 7):
  `Content-Security-Policy` with `script-src 'self'`, `style-src 'self'
  'unsafe-inline'`, fonts from `self`, images from `https:` `data:`, frames
  from `youtube-nocookie.com` and `player.vimeo.com`, `connect-src 'self'`,
  `frame-ancestors 'none'`, `form-action 'none'`; plus `X-Content-Type-Options:
  nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`. No
  `worker-src` and no `blob:` sources: those existed only for the PDF
  preview's viewer worker and object URLs.
- `/api/pdf` accepts same-origin browser requests only (Fetch Metadata /
  `Origin` check); add a Cloudflare rate-limiting rule on `/api/pdf` before a
  public launch.
