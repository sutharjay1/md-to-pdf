import { handleOg, parseOg } from "../src/og";

const page = `<!doctype html><html><head>
  <title>Fallback &amp; title</title>
  <meta property="og:title" content="Suna &mdash; open source">
  <meta name="twitter:description" content="An   agent  you  can  host">
  <meta property="og:image" content="/social.png">
</head><body><meta property="og:title" content="body tag wins nothing"></body></html>`;

function get(url: string, headers: Record<string, string> = {}) {
  return new Request(`https://app.test/api/og?url=${encodeURIComponent(url)}`, { headers });
}

function html(body: string, headers: Record<string, string> = { "content-type": "text/html" }) {
  return new Response(body, { headers });
}

it("reads og tags, decodes entities, collapses space and resolves the image", () => {
  const card = parseOg(page, "https://example.com/a/b");
  expect(card).toEqual({ title: "Suna — open source", description: "An agent you can host", image: "https://example.com/social.png" });
});

it("falls back to the document title and drops a non-https image", () => {
  const card = parseOg('<head><title>Plain</title><meta property="og:image" content="http://x.test/i.png"></head>', "http://x.test/");
  expect(card).toEqual({ title: "Plain", description: undefined, image: undefined });
});

it("returns null when the page says nothing about itself", () => {
  expect(parseOg("<head></head><body><h1>hi</h1></body>", "https://x.test/")).toBeNull();
});

it("rejects cross-origin callers and non-GET methods", async () => {
  expect((await handleOg(get("https://x.test/", { "sec-fetch-site": "cross-site" }))).status).toBe(403);
  const post = new Request("https://app.test/api/og?url=https%3A%2F%2Fx.test%2F", { method: "POST" });
  expect((await handleOg(post)).status).toBe(405);
});

it("rejects anything that is not a public http(s) page", async () => {
  for (const url of ["", "not a url", "file:///etc/passwd", "http://localhost:8787/", "http://127.0.0.1/", "http://192.168.1.4/", "http://10.0.0.1/"]) {
    expect((await handleOg(get(url))).status).toBe(400);
  }
});

it("returns the card for a public page", async () => {
  const fetchImpl = (async () => html(page)) as unknown as typeof fetch;
  const res = await handleOg(get("https://example.com/a/b"), fetchImpl);
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toContain("max-age=3600");
  await expect(res.json()).resolves.toMatchObject({ title: "Suna — open source" });
});

it("passes upstream trouble through as 502, 415 and 404", async () => {
  const bad = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
  expect((await handleOg(get("https://example.com/"), bad)).status).toBe(502);

  const pdf = (async () => new Response("%PDF", { headers: { "content-type": "application/pdf" } })) as unknown as typeof fetch;
  expect((await handleOg(get("https://example.com/"), pdf)).status).toBe(415);

  const bare = (async () => html("<head></head><body>hi</body>")) as unknown as typeof fetch;
  expect((await handleOg(get("https://example.com/"), bare)).status).toBe(404);

  const boom = (async () => {
    throw new Error("dns");
  }) as unknown as typeof fetch;
  expect((await handleOg(get("https://example.com/"), boom)).status).toBe(502);
});
