import { splitFrontMatter, frontMatterHtml } from "../src/frontmatter";

it("returns the document untouched without a leading block", () => {
  const md = "# Hi\n\n---\n\nnot front matter\n\n---\n";
  expect(splitFrontMatter(md)).toEqual({ fields: [], body: md });
});

it("parses scalars, quoted values, inline lists and block lists", () => {
  const md = `---\ntitle: "Markdown Showcase"\nauthor: Jay\ndate: 2026-09-06\ntags:\n  - markdown\n  - mermaid\nkeywords: [a, "b"]\n# comment\n---\n\n# Body`;
  const { fields, body } = splitFrontMatter(md);
  expect(fields).toEqual([
    { key: "title", value: "Markdown Showcase" },
    { key: "author", value: "Jay" },
    { key: "date", value: "2026-09-06" },
    { key: "tags", value: "markdown, mermaid", list: ["markdown", "mermaid"] },
    { key: "keywords", value: "a, b", list: ["a", "b"] },
  ]);
  expect(body).toBe("\n# Body");
});

it("tolerates a BOM or blank lines before the block and a dotted close", () => {
  expect(splitFrontMatter("﻿\n\n---\ntitle: A\n...\nbody").fields).toEqual([{ key: "title", value: "A" }]);
  expect(splitFrontMatter("\n---\ntitle: A\n---\r\nbody").body).toBe("body");
});

it("renders a properties panel with chips and links, escaped, and nothing for no fields", () => {
  expect(frontMatterHtml([])).toBe("");
  const html = frontMatterHtml([
    { key: "title", value: "<b>" },
    { key: "tags", value: "a, b", list: ["a", "b"] },
    { key: "homepage", value: "https://example.com/x?y=1" },
  ]);
  expect(html).toContain('<dl class="frontmatter">');
  expect(html).toContain('<div class="fm-row"><dt>title</dt><dd>&lt;b&gt;</dd></div>');
  expect(html).toContain('<dd><span class="fm-tag">a</span><span class="fm-tag">b</span></dd>');
  expect(html).toContain('<dd><a href="https://example.com/x?y=1" target="_blank" rel="noopener">https://example.com/x?y=1</a></dd>');
  expect(html).not.toContain("<table");
});
