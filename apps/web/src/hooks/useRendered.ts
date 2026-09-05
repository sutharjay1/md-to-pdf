import { useEffect, useState } from "react";
import { render } from "@md-to-pdf/markdown";

async function withDiagrams(html: string): Promise<string> {
  if (!html.includes('class="mermaid"')) return html;
  const { inlineDiagrams } = await import("@/lib/diagrams");
  return inlineDiagrams(html);
}

export function useRendered(doc: string): string {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const out = await withDiagrams(await render(doc));
      if (!cancelled) setHtml(out);
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [doc]);

  return html;
}
