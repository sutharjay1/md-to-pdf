import { embedHtml } from "@md-to-pdf/markdown";
import { inlineEmbeds, resetEmbedCache } from "@/lib/embeds";

const fetchMock = vi.fn();
beforeEach(() => {
  resetEmbedCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

const card = (href: string) => `<p>${embedHtml(href)}</p>`;

it("returns html without cards untouched and never fetches", () => {
  const onUpdate = vi.fn();
  expect(inlineEmbeds("<p>plain</p>", onUpdate)).toBe("<p>plain</p>");
  expect(fetchMock).not.toHaveBeenCalled();
  expect(onUpdate).not.toHaveBeenCalled();
});

it("asks the worker once, then fills title, description and image from cache", async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ title: "Suna", description: "An agent you can host", image: "https://img.test/s.png" }),
  });
  const href = "https://example.com/post";
  await new Promise<void>((r) => inlineEmbeds(card(href), r));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith("/api/og?url=https%3A%2F%2Fexample.com%2Fpost");

  const out = inlineEmbeds(card(href), () => {});
  expect(out).toContain('<span class="embed-title">Suna</span><span class="embed-description">An agent you can host</span>');
  expect(out).toContain('<span class="embed-url">https://example.com/post</span>');
  expect(out).toContain('<span class="embed-thumb"><img src="https://img.test/s.png" alt="" referrerpolicy="no-referrer"></span>');
  expect(out).toContain('title="Suna"');
  expect(inlineEmbeds(card(href), () => {})).toBe(out);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("keeps a card without an image, and drops an image that is not https", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ title: "No picture", image: "http://img.test/s.png" }) });
  const href = "https://example.com/plain";
  await new Promise<void>((r) => inlineEmbeds(card(href), r));
  const out = inlineEmbeds(card(href), () => {});
  expect(out).toContain('<span class="embed-title">No picture</span>');
  expect(out).not.toContain("embed-thumb");
  expect(out).not.toContain("embed-description");
});

it("leaves the bare url when the page has no card", async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 404 });
  const href = "https://example.com/nothing";
  await new Promise<void>((r) => inlineEmbeds(card(href), r));
  const out = inlineEmbeds(card(href), () => {});
  expect(out).toContain('<span class="embed-url">https://example.com/nothing</span>');
  expect(out).not.toContain("embed-title");
});
