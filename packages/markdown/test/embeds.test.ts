import { embedHost, embedHtml } from "../src/embeds";

it("names the host without the www", () => {
  expect(embedHost("https://www.example.com/a?b=1")).toBe("example.com");
  expect(embedHost("http://sub.example.co.uk:8080/x")).toBe("sub.example.co.uk:8080");
});

it("has nothing to say about a non-web url", () => {
  expect(embedHost("mailto:a@b.test")).toBeNull();
  expect(embedHost("nonsense")).toBeNull();
  expect(embedHtml("javascript:alert(1)")).toBe("");
});

it("escapes the url it prints", () => {
  const html = embedHtml('https://example.com/"><script>');
  expect(html).toContain('href="https://example.com/&quot;&gt;&lt;script&gt;"');
  expect(html).not.toContain("<script>");
});
