import { useEffect, useRef } from "react";
import morphdom from "morphdom";
import { copy } from "@/copy";

type Props = { html: string };

export function PreviewView({ html }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Unchanged nodes are common between renders, and skipping them keeps big subtrees (drawn diagrams) untouched.
    morphdom(el, `<div>${html}</div>`, { childrenOnly: true, onBeforeElUpdated: (from, to) => !from.isEqualNode(to) });
  }, [html]);

  if (!html.trim()) {
    return <p className="p-10 text-muted-foreground">{copy.previewEmpty}</p>;
  }
  return <div ref={ref} className="doc mx-auto max-w-[72ch] px-5 py-6 lg:px-10 lg:py-10" />;
}
