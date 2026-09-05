import { useEffect, useState } from "react";
import { copy } from "@/copy";
import { highlightCode } from "@md-to-pdf/markdown";

type Props = { html: string };

export function HtmlView({ html }: Props) {
  const [marked, setMarked] = useState("");

  useEffect(() => {
    let cancelled = false;
    highlightCode(html, "xml").then((out) => {
      if (!cancelled) setMarked(out);
    });
    return () => {
      cancelled = true;
    };
  }, [html]);

  if (!html.trim()) {
    return <p className="p-10 text-muted-foreground">{copy.htmlEmpty}</p>;
  }
  return (
    <pre className="p-6 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words">
      <code className="hljs" dangerouslySetInnerHTML={{ __html: marked }} />
    </pre>
  );
}
