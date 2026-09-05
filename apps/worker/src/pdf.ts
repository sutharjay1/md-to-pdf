import { buildPrintDocument } from "./document";

export type Env = { ASSETS: Fetcher; CF_ACCOUNT_ID: string; CF_API_TOKEN: string };

const MAX_BODY = 2 * 1024 * 1024;
const PAGES = new Set(["A4", "Letter"]);

let assets: Promise<{ css: string; fonts: { inter: string; mono: string } }> | null = null;

async function loadAssets(env: Env) {
  const get = async (path: string) => {
    const r = await env.ASSETS.fetch(new Request(`https://assets.local${path}`));
    if (!r.ok) throw new Error(`asset fetch failed: ${path} (${r.status})`);
    return r;
  };
  const [css, inter, mono] = await Promise.all([
    get("/prose.css").then((r) => r.text()),
    get("/fonts/inter.woff2").then((r) => r.arrayBuffer()).then(toBase64),
    get("/fonts/geist-mono.woff2").then((r) => r.arrayBuffer()).then(toBase64),
  ]);
  return { css, fonts: { inter, mono } };
}

function isSameOrigin(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite !== null && secFetchSite !== "same-origin") return false;

  const origin = request.headers.get("origin");
  if (origin === null) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function toBase64(buf: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(buf)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function handlePdf(request: Request, env: Env, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return new Response("Expected application/json", { status: 400 });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response("Body too large", { status: 413 });

  let body: { html?: unknown; page?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (typeof body.html !== "string" || typeof body.page !== "string" || !PAGES.has(body.page)) {
    return new Response("Expected { html: string, page: 'A4' | 'Letter' }", { status: 400 });
  }

  assets ??= loadAssets(env).catch((err) => {
    assets = null;
    throw err;
  });
  let css: string, fonts: { inter: string; mono: string };
  try {
    ({ css, fonts } = await assets);
  } catch {
    return new Response("Failed to load assets", { status: 502 });
  }
  const html = buildPrintDocument(body.html, css, fonts);

  const upstream = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/browser-rendering/pdf`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.CF_API_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({
      html,
      rejectResourceTypes: ["script"],
      gotoOptions: { waitUntil: "networkidle0", timeout: 20000 },
      pdfOptions: {
        format: body.page,
        printBackground: true,
        preferCSSPageSize: false,
        margin: { top: "20mm", right: "18mm", bottom: "22mm", left: "18mm" },
      },
    }),
  });

  if (upstream.status === 429) return new Response("Rate limited", { status: 429 });
  if (!upstream.ok) return new Response("Renderer failed", { status: 502 });
  return new Response(upstream.body, { headers: { "content-type": "application/pdf", "cache-control": "no-store" } });
}
