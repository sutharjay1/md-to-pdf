import { filenameFrom, titleFrom, wordCount } from "../src/text";

describe("titleFrom", () => {
  it("takes the first heading", () => {
    expect(titleFrom("intro\n\n# Hello *world*\n\n## Sub")).toBe("Hello world");
  });
  it("supports setext headings", () => {
    expect(titleFrom("Hello\n=====\n\ntext")).toBe("Hello");
  });
  it("ignores headings inside code fences", () => {
    expect(titleFrom("```\n# not a title\n```\n# Real")).toBe("Real");
  });
  it("returns empty when there is no heading", () => {
    expect(titleFrom("just text")).toBe("");
  });
});

describe("filenameFrom", () => {
  it("slugifies", () => {
    expect(filenameFrom("Hello, World! 2026")).toBe("hello-world-2026.pdf");
  });
  it("falls back", () => {
    expect(filenameFrom("")).toBe("document.pdf");
    expect(filenameFrom("!!!")).toBe("document.pdf");
  });
  it("caps length at 80", () => {
    expect(filenameFrom("a".repeat(200)).length).toBe(84);
  });
});

describe("wordCount", () => {
  it("counts words, ignoring markdown punctuation", () => {
    expect(wordCount("# Hi there\n\n- one\n- two **three**")).toBe(5);
  });
  it("is zero for empty input", () => {
    expect(wordCount("   \n")).toBe(0);
  });
});
