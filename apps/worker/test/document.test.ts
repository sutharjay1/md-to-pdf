import { buildPrintDocument } from "../src/document";

it("embeds fonts, css, and the fragment", () => {
  const html = buildPrintDocument("<p>hi</p>", ".doc{}", { inter: "AAAA", mono: "BBBB" });
  expect(html).toContain("<!doctype html>");
  expect(html).toContain('url(data:font/woff2;base64,AAAA)');
  expect(html).toContain('url(data:font/woff2;base64,BBBB)');
  expect(html).toContain(".doc{}");
  expect(html).toContain('<body class="doc"><p>hi</p></body>');
});
