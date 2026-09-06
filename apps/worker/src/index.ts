import { handleOg } from "./og";
import { handlePdf, type Env } from "./pdf";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/pdf") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      return handlePdf(request, env);
    }
    if (url.pathname === "/api/og") return handleOg(request);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
