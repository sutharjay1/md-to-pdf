import { splitFrontMatter, frontMatterHtml } from "../src/frontmatter";

it("returns the document untouched without a leading block", () => {
  const md = "# Hi\n\n---\n\nnot front matter\n\n---\n";
  expect(splitFrontMatter(md)).toEqual({ fields: [], body: md });
});

it("parses scalars, quoted values, inline lists and block lists", () => {
  const md = `---\ntitle: "Markdown Showcase"\nauthor: Jay\ndate: 2026-09-06\ntags:\n  - markdown\n  - mermaid\nkeywords: [a, "b"]\n# comment\n---\n\n# Body`;
  const { fields, body } = splitFrontMatter(md);
  expect(fields).toEqual([
    ["title", "Markdown Showcase"],
    ["author", "Jay"],
    ["date", "2026-09-06"],
    ["tags", "markdown, mermaid"],
    ["keywords", "a, b"],
  ]);
  expect(body).toBe("\n# Body");
});

it("tolerates a BOM or blank lines before the block and a dotted close", () => {
  expect(splitFrontMatter("\uFEFF\n\n---\ntitle: A\n...\nbody").fields).toEqual([["title", "A"]]);
  expect(splitFrontMatter("\n---\ntitle: A\n---\r\nbody").body).toBe("body");
});

it("renders an escaped table and nothing for no fields", () => {
  expect(frontMatterHtml([])).toBe("");
  const html = frontMatterHtml([["title", "<b>"]]);
  expect(html).toContain('<table class="frontmatter">');
  expect(html).toContain("<th scope=\"row\">title</th><td>&lt;b&gt;</td>");
});
