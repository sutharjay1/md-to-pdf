import { useEffect, useState } from "react";
import { render } from "@md-to-pdf/markdown";

export function useRendered(doc: string): string {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const out = await render(doc);
      if (!cancelled) setHtml(out);
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [doc]);

  return html;
}
