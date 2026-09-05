import { classifyRef, refHtml, refLabel } from "../src/refs";

it("classifies GitHub issues and pull requests", () => {
  expect(classifyRef("https://github.com/o/r/issues/12")).toEqual({ provider: "github", kind: "issue", path: "o/r", number: 12, api: "https://api.github.com/repos/o/r/issues/12" });
  expect(classifyRef("https://github.com/o/r/pull/7#discussion_r1")?.kind).toBe("pr");
  expect(classifyRef("https://github.com/o/r/pull/7")?.api).toBe("https://api.github.com/repos/o/r/issues/7");
});

it("classifies GitLab issues and merge requests, with nested groups and both URL forms", () => {
  expect(classifyRef("https://gitlab.com/g/sub/p/-/issues/3")).toEqual({ provider: "gitlab", kind: "issue", path: "g/sub/p", number: 3, api: "https://gitlab.com/api/v4/projects/g%2Fsub%2Fp/issues/3" });
  expect(classifyRef("https://gitlab.com/g/p/merge_requests/9?x=1")?.kind).toBe("mr");
});

it("rejects everything else", () => {
  for (const u of ["https://github.com/o/r", "https://github.com/o/r/issues", "https://github.com/o/r/commit/abc", "https://example.com/issues/1", "https://gitlab.com/g/p/-/pipelines/4"]) {
    expect(classifyRef(u)).toBeNull();
  }
});

it("labels and renders a card", () => {
  const ref = classifyRef("https://gitlab.com/g/p/-/merge_requests/9")!;
  expect(refLabel(ref)).toBe("g/p!9");
  const html = refHtml(ref, "https://gitlab.com/g/p/-/merge_requests/9");
  expect(html).toContain('class="ref" data-provider="gitlab" data-kind="mr"');
  expect(html).toContain('<span class="ref-provider">GitLab</span><span class="ref-id">g/p!9</span>');
});
