import { render } from "../src/render";

it("renders GFM tables, task lists, strikethrough", async () => {
  const html = await render("| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n\n~~gone~~");
  expect(html).toContain("<table>");
  expect(html).toContain('type="checkbox"');
  expect(html).toContain("<del>gone</del>");
});

it("adds heading ids", async () => {
  expect(await render("## Hello World")).toContain('<h2 id="hello-world">');
});

it("renders footnotes", async () => {
  const html = await render("text[^1]\n\n[^1]: note");
  expect(html).toContain('class="footnotes"');
});

it("uses the video extension for video urls and keeps images", async () => {
  const html = await render("![a](https://youtu.be/dQw4w9WgXcQ)\n\n![b](https://x.com/p.png)");
  expect(html).toContain('data-video="youtube"');
  expect(html).toContain('<img src="https://x.com/p.png" alt="b">');
});

it("highlights fenced code with classes, no inline styles", async () => {
  const html = await render("```ts\nconst a: number = 1\n```");
  expect(html).toContain('<pre><code class="hljs language-ts">');
  expect(html).toContain('<span class="hljs-keyword">const</span>');
  expect(html).not.toContain("style=");
});

it("falls back to escaped plain code for unknown languages", async () => {
  const html = await render("```nope\n<a>\n```");
  expect(html).toContain("&lt;a&gt;");
});

it("opens external links in a new tab", async () => {
  expect(await render("[x](https://example.com)")).toContain('target="_blank" rel="noopener"');
});

it("escapes a quote in a link title", async () => {
  const html = await render(`[x](https://example.com 'a "quote"')`);
  expect(html).toContain('title="a &quot;quote&quot;"');
});

it("keeps column alignment on table cells", async () => {
  const html = await render("| a | b |\n|:-:|--:|\n| 1 | 2 |");
  expect(html).toContain('<th align="center">');
  expect(html).toContain('<td align="right">');
});

it("renders GitHub alerts", async () => {
  const html = await render("> [!WARNING]\n> Careful.");
  expect(html).toContain('class="markdown-alert markdown-alert-warning"');
  expect(html).toContain("Careful.");
});

it("leaves mermaid fences as escaped pre blocks for the client to draw", async () => {
  const html = await render("```mermaid\nflowchart TD\n  A --> B\n```");
  expect(html).toContain('<pre class="mermaid">flowchart TD\n  A --&gt; B</pre>');
  expect(html).not.toContain("hljs");
});

it("renders inline and block math as MathML", async () => {
  const html = await render("Mass $E = mc^2$ and\n\n$$\n\\frac{a}{b}\n$$");
  expect(html).toContain("<math");
  expect(html).toContain('display="block"');
  expect(html).toContain("<mfrac>");
  expect(html).not.toContain("katex-html");
});

it("replaces emoji shortcodes and leaves unknown ones alone", async () => {
  const html = await render("Ship it :rocket: :not_an_emoji:");
  expect(html).toContain("🚀");
  expect(html).toContain(":not_an_emoji:");
});

it("turns leading front matter into a table and drops it from the body", async () => {
  const html = await render("---\ntitle: Doc\ntags:\n  - a\n  - b\n---\n\n# Doc");
  expect(html).toContain('<table class="frontmatter">');
  expect(html).toContain("<td>a, b</td>");
  expect(html).toContain('<h1 id="doc">');
  expect(html).not.toContain("<hr>");
});

it("turns bare issue and PR links into reference cards and leaves titled links alone", async () => {
  const html = await render("<https://github.com/o/r/issues/1>\n\nhttps://gitlab.com/g/p/-/merge_requests/2\n\n[the fix](https://github.com/o/r/pull/3)");
  expect(html).toContain('<a class="ref" data-provider="github" data-kind="issue"');
  expect(html).toContain('<a class="ref" data-provider="gitlab" data-kind="mr"');
  expect(html).toContain('<a href="https://github.com/o/r/pull/3" target="_blank" rel="noopener">the fix</a>');
});
