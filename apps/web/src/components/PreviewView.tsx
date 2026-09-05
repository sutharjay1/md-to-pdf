import { useEffect, useRef } from "react";
import morphdom from "morphdom";
import { copy } from "@/copy";

type Props = { html: string };

export function PreviewView({ html }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    morphdom(el, `<div>${html}</div>`, { childrenOnly: true });
  }, [html]);

  if (!html.trim()) {
    return <p className="p-10 text-muted-foreground">{copy.previewEmpty}</p>;
  }
  return <div ref={ref} className="doc mx-auto max-w-[72ch] px-10 py-10" />;
}
