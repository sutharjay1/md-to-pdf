#!/usr/bin/env node
/**
 * make-og-card.mjs — the 1200x630 Open Graph card.
 *
 * Ported from exact-kb's `scripts/make-og-cards.mjs`, layout and pipeline unchanged, so both
 * sites unfurl as the same family. **Not part of the build, and deliberately not.** It is run
 * by hand, its PNG output is committed to `apps/web/public/og/`, and that is what ships.
 *
 *   node scripts/make-og-card.mjs
 *
 * ## The typeface, which was the whole defect over there
 *
 * A social card is the most-seen rendering of a site by people who have never visited it, so
 * it has to be in the site's own face. The trap is a format mismatch: renderers in this family
 * (resvg, satori, librsvg) want `ttf`/`otf`, and the only Inter a web repo has is `woff2`,
 * which FreeType cannot load — no `fonts.conf` fixes that. So `wawoff2` (Google's own woff2
 * library, as wasm) decompresses `inter-ui`'s shipped `.woff2` back into the `sfnt` it was
 * built from, into a temp directory thrown away afterwards. Nothing binary is committed.
 *
 * ## Why the semibold text names a different family
 *
 * `inter-ui`'s static instances carry their weight in the family name: `Inter-Regular-subset`
 * is family "Inter", and `Inter-SemiBold-subset` is family "Inter SemiBold" with subfamily
 * "Regular". fontconfig reconciles those into one family with two weights; resvg's font
 * database does not, so `font-family="Inter" font-weight="600"` silently renders Regular.
 * Naming the family outright is the reliable form, and `font-weight` stays on as a hint.
 *
 * The variable `inter.woff2` this site serves is not used here for the same reason: resvg
 * renders a variable font at its default instance, so every weight comes out at 400.
 *
 * Line breaks are computed in `wrap()`, because SVG has no text layout engine.
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import wawoff2 from "wawoff2";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = join(ROOT, "apps/web/public/og");
const INTER_DIR = join(ROOT, "node_modules/inter-ui/web-latin");

/** Family names as they appear in each file's `name` table — see the note above. */
const FONT_REGULAR = "Inter";
const FONT_SEMIBOLD = "Inter SemiBold";

/**
 * The site mark — the same path as `apps/web/src/components/Logo.tsx` and `public/favicon.svg`,
 * moved to the origin of its own 22×21 box, drawn here at 1.75× so it sits 37px tall beside the
 * eyebrow. The card is light (#f8f8f8) to match the site's light default and the mark's artwork.
 */
const MARK_PATH =
  "M15.02 0H6.52C6.30234 0.00062283 6.09083 0.0722446 5.91757 0.203993C5.74431 0.335742 5.61877 0.520423 5.56 0.73L0.02 20.13C-0.00509741 20.216 -0.00660222 20.3073 0.0156432 20.3941C0.0378885 20.4809 0.0830662 20.5602 0.146447 20.6236C0.209827 20.6869 0.28908 20.7321 0.375909 20.7544C0.462739 20.7766 0.553952 20.7751 0.64 20.75L5.69 19.31C5.83579 19.2745 5.97171 19.2066 6.08769 19.1114C6.20367 19.0162 6.29674 18.8961 6.36 18.76L10.77 10L15.18 18.76C15.2433 18.8961 15.3363 19.0162 15.4523 19.1114C15.5683 19.2066 15.7042 19.2745 15.85 19.31L20.9 20.75C20.986 20.7751 21.0773 20.7766 21.1641 20.7544C21.2509 20.7321 21.3302 20.6869 21.3936 20.6236C21.4569 20.5602 21.5021 20.4809 21.5244 20.3941C21.5466 20.3073 21.5451 20.216 21.52 20.13L15.98 0.73C15.9212 0.520423 15.7957 0.335742 15.6224 0.203993C15.4492 0.0722446 15.2377 0.00062283 15.02 0Z";

const CARDS = [
  {
    file: "default",
    eyebrow: "MD to PDF",
    title: "Markdown to PDF, in your browser",
    sub: "Free, no sign-up. Mermaid diagrams, math and code go into the PDF.",
  },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(text, max) {
  const out = [];
  let line = "";
  for (const word of text.split(" ")) {
    if ((line + " " + word).trim().length > max) {
      out.push(line.trim());
      line = word;
    } else line += " " + word;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

/** Horizontal and vertical inset of the card's content. */
const PAD = 64;
const TITLE_MAX = 88;

/**
 * The largest size at which the title fits ONE line across the card. resvg cannot measure
 * text, so this is an estimate: Inter SemiBold at -1.5 letter-spacing averages ~0.53em per
 * character. A wider title gets a smaller size rather than a second line.
 */
function titleSize(text) {
  const fit = Math.floor((1200 - PAD * 2) / (text.length * 0.53));
  return Math.min(TITLE_MAX, fit);
}

function card(c) {
  const size = titleSize(c.title);
  const subLines = wrap(c.sub, 72);
  // Anchored to the bottom: the sub's last baseline sits PAD above the edge (plus room for
  // descenders), the title one step above that.
  const subLast = 630 - PAD - 8;
  const subFirst = subLast - (subLines.length - 1) * 40;
  const titleY = subFirst - 66;

  const sub = subLines
    .map(
      (l, i) =>
        `    <text x="${PAD}" y="${subFirst + i * 40}" font-size="29" font-weight="400" fill="#525252">${esc(l)}</text>`,
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f8f8f8"/>
  <g transform="translate(${PAD} ${PAD}) scale(1.75)"><path d="${MARK_PATH}" fill="#0a0a0a"/></g>
  <g font-family="${FONT_REGULAR}">
    <text x="${PAD + 52}" y="${PAD + 28}" font-family="${FONT_SEMIBOLD}" font-size="26" font-weight="600" fill="#ea580c" letter-spacing="4">${esc(c.eyebrow.toUpperCase())}</text>
    <text x="${PAD}" y="${titleY}" font-family="${FONT_SEMIBOLD}" font-size="${size}" font-weight="600" fill="#0a0a0a" letter-spacing="-1.5">${esc(c.title)}</text>
${sub}
  </g>
</svg>`;
}

async function extractFonts(dir) {
  const files = [];
  for (const weight of ["Regular", "SemiBold"]) {
    const woff2 = readFileSync(join(INTER_DIR, `Inter-${weight}-subset.woff2`));
    const ttf = Buffer.from(await wawoff2.decompress(woff2));
    // A real sfnt starts with 0x00010000; if the decompress ever silently hands back something
    // else, fail here rather than shipping a card in a fallback face.
    if (ttf.readUInt32BE(0) !== 0x00010000) {
      throw new Error(`Inter-${weight}: not an sfnt after decompress`);
    }
    const path = join(dir, `Inter-${weight}.ttf`);
    writeFileSync(path, ttf);
    files.push(path);
  }
  return files;
}

const fontDir = mkdtempSync(join(tmpdir(), "mdtopdf-og-"));
try {
  const fontFiles = await extractFonts(fontDir);
  mkdirSync(OUT_DIR, { recursive: true });
  for (const c of CARDS) {
    const resvg = new Resvg(card(c), {
      font: {
        fontFiles,
        // Nothing from the OS: a card that renders correctly only on the machine that happens
        // to have Inter installed is the same defect in a different costume.
        loadSystemFonts: false,
        defaultFontFamily: FONT_REGULAR,
      },
      fitTo: { mode: "width", value: 1200 },
    });
    writeFileSync(join(OUT_DIR, `${c.file}.png`), resvg.render().asPng());
  }
  console.log(`wrote ${CARDS.length} card${CARDS.length === 1 ? "" : "s"} to ${OUT_DIR}`);
} finally {
  rmSync(fontDir, { recursive: true, force: true });
}
