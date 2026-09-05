import { inlineRefs, resetRefCache } from "@/lib/refs";

const fetchMock = vi.fn();
beforeEach(() => {
  resetRefCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

const card = (href: string) => `<p><a class="ref" data-provider="github" data-kind="issue" href="${href}"><span class="ref-provider">GitHub</span><span class="ref-id">o/r#1</span></a></p>`;

it("returns html without cards untouched and never fetches", () => {
  const onUpdate = vi.fn();
  expect(inlineRefs("<p>plain</p>", onUpdate)).toBe("<p>plain</p>");
  expect(fetchMock).not.toHaveBeenCalled();
  expect(onUpdate).not.toHaveBeenCalled();
});

it("fetches once, calls onUpdate, then fills the card from cache", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ title: "Fix the thing", state: "closed", pull_request: { merged_at: "2026-01-01" } }) });
  const href = "https://github.com/o/r/pull/1";
  let resolveUpdate!: () => void;
  const updated = new Promise<void>((r) => (resolveUpdate = r));
  const first = inlineRefs(card(href), resolveUpdate);
  expect(first).not.toContain("ref-title");
  await updated;
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith("https://api.github.com/repos/o/r/issues/1", expect.anything());
  const second = inlineRefs(card(href), () => {});
  expect(second).toContain('<span class="ref-title">Fix the thing</span>');
  expect(second).toContain('<span class="ref-state" data-state="merged">Merged</span>');
  expect(second).toContain('title="Fix the thing"');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("keeps the basic card when the API says no", async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 404 });
  const href = "https://github.com/o/private/issues/9";
  await new Promise<void>((r) => inlineRefs(card(href), r));
  const out = inlineRefs(card(href), () => {});
  expect(out).toContain('class="ref-id"');
  expect(out).not.toContain("ref-title");
  expect(out).not.toContain("ref-state");
});
