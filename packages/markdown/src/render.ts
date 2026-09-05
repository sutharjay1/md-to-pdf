import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import markedFootnote from "marked-footnote";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { escapeHtml, highlightCode } from "./highlight";
import { videoExtension } from "./video";

const marked = new Marked(
  markedHighlight({
    async: true,
    langPrefix: "hljs language-",
    highlight: (code, lang) => (lang ? highlightCode(code, lang) : Promise.resolve(escapeHtml(code))),
  }),
  gfmHeadingId(),
  markedFootnote(),
  videoExtension,
  {
    gfm: true,
    renderer: {
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
);

export function render(markdown: string): Promise<string> {
  return marked.parse(markdown, { async: true });
}
