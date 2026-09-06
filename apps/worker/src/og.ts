export type OgCard = { title: string; description?: string; image?: string };

const MAX_HTML = 512 * 1024;
const TIMEOUT_MS = 8000;
const UA = "Mozilla/5.0 (compatible; md-to-pdf link preview)";

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

/** Public web pages only: no other scheme, no host that resolves inside a private network. */
function publicPage(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
  if (/^\[?(::1?|fc|fd)/i.test(host)) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return null;
    }
  }
  return url;
}

/** The punctuation that actually turns up in titles and descriptions; anything rarer is left as written. */
const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "",
  mdash: "\u2014", ndash: "\u2013", hellip: "\u2026", middot: "\u00b7", bull: "\u2022",
  lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d", laquo: "\u00ab", raquo: "\u00bb",
  copy: "\u00a9", reg: "\u00ae", trade: "\u2122", deg: "\u00b0", times: "\u00d7", euro: "\u20ac", pound: "\u00a3",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
      if (code[0] === "#") {
        const point = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
        return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole;
      }
      return NAMED[code.toLowerCase()] ?? whole;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, names: string[]): string | undefined {
  for (const name of names) {
    const escaped = name.replace(/[:.]/g, "\\$&");
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*>|<meta[^>]+content\\s*=\\s*["'][^"']*["'][^>]*(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*>`,
      "i",
    );
    const tag = pattern.exec(html)?.[0];
    const content = tag && /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (content) {
      const value = decodeEntities(content);
      if (value) return value;
    }
  }
  return undefined;
}

/** Reads what the page says about itself: Open Graph first, then Twitter's copy of it, then the plain document. */
export function parseOg(html: string, pageUrl: string): OgCard | null {
  const head = (html.split(/<\/head>/i)[0] ?? html).slice(0, MAX_HTML);
  const title =
    metaContent(head, ["og:title", "twitter:title"]) ??
    (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] ? decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)![1]) : undefined);
  if (!title) return null;
  const description = metaContent(head, ["og:description", "twitter:description", "description"]);
  const rawImage = metaContent(head, ["og:image:secure_url", "og:image:url", "og:image", "twitter:image", "twitter:image:src"]);
  let image: string | undefined;
  if (rawImage) {
    try {
      const resolved = new URL(rawImage, pageUrl);
      if (resolved.protocol === "https:") image = resolved.toString();
    } catch {
      image = undefined;
    }
  }
  return { title, description, image };
}

/** Pages can be enormous; the card lives in the head, so stop reading once there is enough of it. */
async function readCapped(response: Response, limit: number): Promise<string> {
  const body = response.body;
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (text.length < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return text.slice(0, limit);
}

/**
 * Fetches a page's Open Graph card. The browser cannot read another origin's markup, so the Worker does it,
 * and answers with the handful of fields a card needs.
 */
export async function handleOg(request: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const target = publicPage(new URL(request.url).searchParams.get("url") ?? "");
  if (!target) return new Response("Expected ?url= with a public http(s) page", { status: 400 });

  let upstream: Response;
  try {
    upstream = await fetchImpl(target.toString(), {
      headers: { accept: "text/html,application/xhtml+xml", "user-agent": UA, "accept-language": "en" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return new Response("Upstream unreachable", { status: 502 });
  }
  if (!upstream.ok) return new Response("Upstream failed", { status: 502 });
  if (!upstream.headers.get("content-type")?.includes("html")) return new Response("Not an HTML page", { status: 415 });

  const html = await readCapped(upstream, MAX_HTML);
  const card = parseOg(html, upstream.url || target.toString());
  if (!card) return new Response("No card", { status: 404 });

  return new Response(JSON.stringify(card), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" },
  });
}
