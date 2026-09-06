import { classifyRef, refHtml } from "@md-to-pdf/markdown";
import { inlineRefs, resetRefCache } from "@/lib/refs";

const fetchMock = vi.fn();
beforeEach(() => {
  resetRefCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

const card = (href: string) => `<p>${refHtml(classifyRef(href)!, href)}</p>`;

it("returns html without cards untouched and never fetches", () => {
  const onUpdate = vi.fn();
  expect(inlineRefs("<p>plain</p>", onUpdate)).toBe("<p>plain</p>");
  expect(fetchMock).not.toHaveBeenCalled();
  expect(onUpdate).not.toHaveBeenCalled();
});

it("fetches once, calls onUpdate, then fills title, state and meta from cache", async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ title: "Fix the thing", state: "closed", pull_request: { merged_at: "2026-01-01" }, user: { login: "jay" }, created_at: "2026-01-06T10:00:00Z", comments: 3 }),
  });
  const href = "https://github.com/o/r/pull/1";
  let resolveUpdate!: () => void;
  const updated = new Promise<void>((r) => (resolveUpdate = r));
  const first = inlineRefs(card(href), resolveUpdate);
  expect(first).not.toContain("ref-title");
  expect(first).toContain('<span class="ref-repo">o/r#1</span><span class="ref-kind">Pull request</span>');
  await updated;
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith("https://api.github.com/repos/o/r/issues/1", expect.anything());
  const second = inlineRefs(card(href), () => {});
  expect(second).toContain('<span class="ref-main"><span class="ref-title">Fix the thing</span></span><span class="ref-head">');
  expect(second).toContain('<span class="ref-kind">Pull request</span></span><span class="ref-end"><span class="ref-side"><span class="ref-author">jay</span><span class="ref-date">6 Jan 2026</span><span class="ref-comments">3 comments</span></span><span class="ref-state" data-state="merged">Merged</span></span></span>');
  expect(second).toContain('title="Fix the thing"');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("maps GitLab fields and singular comment", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ title: "MR", state: "opened", author: { username: "ana" }, user_notes_count: 1 }) });
  const href = "https://gitlab.com/g/p/-/merge_requests/2";
  await new Promise<void>((r) => inlineRefs(card(href), r));
  const out = inlineRefs(card(href), () => {});
  expect(out).toContain('data-state="open">Open</span>');
  expect(out).toContain('<span class="ref-end"><span class="ref-side"><span class="ref-author">ana</span><span class="ref-comments">1 comment</span></span><span class="ref-state" data-state="open">Open</span></span>');
  expect(out).not.toContain("ref-date");
});

it("marks draft pull requests as Draft", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ title: "WIP", state: "open", draft: true, pull_request: { merged_at: null } }) });
  const href = "https://github.com/o/r/pull/4";
  await new Promise<void>((r) => inlineRefs(card(href), r));
  expect(inlineRefs(card(href), () => {})).toContain('<span class="ref-end"><span class="ref-state" data-state="draft">Draft</span></span>');
});

it("keeps the basic card when the API says no", async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 404 });
  const href = "https://github.com/o/private/issues/9";
  await new Promise<void>((r) => inlineRefs(card(href), r));
  const out = inlineRefs(card(href), () => {});
  expect(out).toContain('<span class="ref-kind">Issue</span>');
  expect(out).not.toContain("ref-main");
  expect(out).not.toContain("ref-state");
});
