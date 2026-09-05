import { useEffect, useState } from "react";
import { render } from "@md-to-pdf/markdown";

async function withDiagrams(html: string): Promise<string> {
  if (!html.includes('class="mermaid"')) return html;
  const { inlineDiagrams } = await import("@/lib/diagrams");
  return inlineDiagrams(html);
}

async function withRefs(html: string, onUpdate: () => void): Promise<string> {
  if (!html.includes('class="ref"')) return html;
  const { inlineRefs } = await import("@/lib/refs");
  return inlineRefs(html, onUpdate);
}

export function useRendered(doc: string): string {
  const [html, setHtml] = useState("");
  const [refsVersion, setRefsVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const rendered = await withDiagrams(await render(doc));
      const out = await withRefs(rendered, () => setRefsVersion((v) => v + 1));
      if (!cancelled) setHtml(out);
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [doc, refsVersion]);

  return html;
}
