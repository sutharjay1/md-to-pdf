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
