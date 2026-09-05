import { Marked, type MarkedExtension } from "marked";
import { markedHighlight } from "marked-highlight";
import markedFootnote from "marked-footnote";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { frontMatterHtml, splitFrontMatter } from "./frontmatter";
import { escapeHtml, highlightCode } from "./highlight";
import { videoExtension } from "./video";

const HAS_MATH = /\$/;
const HAS_EMOJI = /:[a-z0-9_+-]+:/;
const HAS_ALERT = /^\s{0,3}>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/im;

function baseExtensions(): MarkedExtension[] {
  return [
    markedHighlight({
      async: true,
      langPrefix: "hljs language-",
      highlight: (code, lang) =>
        lang && lang !== "mermaid" ? highlightCode(code, lang) : Promise.resolve(escapeHtml(code)),
    }),
    gfmHeadingId(),
    markedFootnote(),
    videoExtension,
    {
      gfm: true,
      renderer: {
        code(token) {
          if (token.lang !== "mermaid") return false;
          return `<pre class="mermaid">${token.text}</pre>\n`;
        },
        link({ href, title, tokens }) {
          const text = this.parser.parseInline(tokens);
          const external = /^https?:\/\//i.test(href);
          const attrs = [`href="${escapeHtml(href)}"`, title ? `title="${escapeHtml(title)}"` : "", external ? 'target="_blank" rel="noopener"' : ""]
            .filter(Boolean)
            .join(" ");
          return `<a ${attrs}>${text}</a>`;
        },
      },
    },
  ];
}

/** Math, emoji and alerts each carry their own payload, so each is loaded only for documents that use it. */
async function optionalExtensions(math: boolean, emoji: boolean, alert: boolean): Promise<MarkedExtension[]> {
  const list: MarkedExtension[] = [];
  if (alert) {
    const { default: markedAlert } = await import("marked-alert");
    list.push(markedAlert());
  }
  if (math) {
    const { default: markedKatex } = await import("marked-katex-extension");
    list.push(markedKatex({ throwOnError: false, output: "mathml" }));
  }
  if (emoji) {
    const [{ markedEmoji }, { nameToEmoji }] = await Promise.all([import("marked-emoji"), import("gemoji")]);
    list.push(markedEmoji({ emojis: nameToEmoji, renderer: (token) => token.emoji }));
  }
  return list;
}

const instances = new Map<string, Promise<Marked>>();

function instanceFor(markdown: string): Promise<Marked> {
  const math = HAS_MATH.test(markdown);
  const emoji = HAS_EMOJI.test(markdown);
  const alert = HAS_ALERT.test(markdown);
  const key = `${math}:${emoji}:${alert}`;
  let instance = instances.get(key);
  if (!instance) {
    instance = optionalExtensions(math, emoji, alert).then((extra) => new Marked(...extra, ...baseExtensions()));
    instances.set(key, instance);
  }
  return instance;
}

export async function render(markdown: string): Promise<string> {
  const { fields, body } = splitFrontMatter(markdown);
  const marked = await instanceFor(body);
  return frontMatterHtml(fields) + (await marked.parse(body, { async: true }));
}
