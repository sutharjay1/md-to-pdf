import { handlePdf } from "../src/pdf";

const env = {
  CF_ACCOUNT_ID: "acct",
  CF_API_TOKEN: "tok",
  ASSETS: {
    fetch: async (req: Request) => {
      const url = new URL(req.url);
      if (url.pathname === "/prose.css") return new Response(".doc{}");
      return new Response(new Uint8Array([1, 2, 3]));
    },
  } as unknown as Fetcher,
};

function post(body: unknown, headers: Record<string, string> = { "content-type": "application/json" }) {
  return new Request("https://app.test/api/pdf", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
}

it("returns 503 when the renderer is not configured", async () => {
  const unconfigured = { ...env, CF_ACCOUNT_ID: "", CF_API_TOKEN: "" };
  const res = await handlePdf(post({ html: "<p/>", page: "A4" }), unconfigured);
  expect(res.status).toBe(503);
});

it("rejects non-json and bad page values", async () => {
  expect((await handlePdf(post("x", { "content-type": "text/plain" }), env)).status).toBe(400);
  expect((await handlePdf(post({ html: "<p/>", page: "Tabloid" }), env)).status).toBe(400);
});

it("rejects bodies over 2 MB", async () => {
  const res = await handlePdf(post({ html: "x".repeat(2 * 1024 * 1024 + 1), page: "A4" }), env);
  expect(res.status).toBe(413);
});

it("forwards to browser rendering and streams the pdf back", async () => {
  const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(init!.body as string);
    expect(body.html).toContain('<body class="doc"><p>hi</p></body>');
    expect(body.pdfOptions.format).toBe("letter");
    expect(body.rejectResourceTypes).toEqual(["script"]);
    return new Response(new Uint8Array([37, 80, 68, 70]), { headers: { "content-type": "application/pdf" } });
  });
  const res = await handlePdf(post({ html: "<p>hi</p>", page: "Letter" }), env, fetchImpl as unknown as typeof fetch);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("application/pdf");
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(fetchImpl.mock.calls[0][0]).toBe("https://api.cloudflare.com/client/v4/accounts/acct/browser-rendering/pdf");
  expect((fetchImpl.mock.calls[0][1]!.headers as Record<string, string>).authorization).toBe("Bearer tok");
});

it("maps upstream 429 to 429 and other failures to 502", async () => {
  const limited = async () => new Response("slow down", { status: 429 });
  expect((await handlePdf(post({ html: "<p/>", page: "A4" }), env, limited as unknown as typeof fetch)).status).toBe(429);
  const broken = async () => new Response("nope", { status: 500 });
  expect((await handlePdf(post({ html: "<p/>", page: "A4" }), env, broken as unknown as typeof fetch)).status).toBe(502);
});

it("maps a failed asset load to 502 and retries (not sticks) on the next request", async () => {
  vi.resetModules();
  const { handlePdf: freshHandlePdf } = await import("../src/pdf");

  const brokenAssets = {
    ...env,
    ASSETS: {
      fetch: async (req: Request) => {
        const url = new URL(req.url);
        if (url.pathname === "/prose.css") return new Response("not found", { status: 404 });
        return new Response(new Uint8Array([1, 2, 3]));
      },
    } as unknown as Fetcher,
  };

  const failed = await freshHandlePdf(post({ html: "<p/>", page: "A4" }), brokenAssets);
  expect(failed.status).toBe(502);

  const fetchImpl = async () => new Response(new Uint8Array([37, 80, 68, 70]), { headers: { "content-type": "application/pdf" } });
  const ok = await freshHandlePdf(post({ html: "<p/>", page: "A4" }), env, fetchImpl as unknown as typeof fetch);
  expect(ok.status).toBe(200);
});

it("rejects cross-origin requests and accepts a matching origin", async () => {
  const crossOrigin = post(
    { html: "<p/>", page: "A4" },
    { "content-type": "application/json", origin: "https://evil.example" },
  );
  expect((await handlePdf(crossOrigin, env)).status).toBe(403);

  const fetchImpl = async () => new Response(new Uint8Array([37, 80, 68, 70]), { headers: { "content-type": "application/pdf" } });
  const sameOrigin = post(
    { html: "<p/>", page: "A4" },
    { "content-type": "application/json", origin: "https://app.test" },
  );
  const res = await handlePdf(sameOrigin, env, fetchImpl as unknown as typeof fetch);
  expect(res.status).toBe(200);
});
