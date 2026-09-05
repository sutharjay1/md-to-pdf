import { handlePdf, type Env } from "./pdf";

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' https: data:",
  "media-src https:",
  "frame-src blob: https://www.youtube-nocookie.com https://player.vimeo.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/pdf") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      return handlePdf(request, env);
    }
    const res = await env.ASSETS.fetch(request);
    if (res.headers.get("content-type")?.includes("text/html")) {
      const headers = new Headers(res.headers);
      headers.set("content-security-policy", CSP);
      headers.set("x-content-type-options", "nosniff");
      headers.set("referrer-policy", "strict-origin-when-cross-origin");
      return new Response(res.body, { status: res.status, headers });
    }
    return res;
  },
} satisfies ExportedHandler<Env>;
