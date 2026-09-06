import { useEffect, useRef, useState } from "react";
import { render, type RenderOptions } from "@md-to-pdf/markdown";

async function withDiagrams(html: string): Promise<string> {
  if (!html.includes('class="mermaid"')) return html;
  const { inlineDiagrams } = await import("@/lib/diagrams");
  return inlineDiagrams(html);
}

/** Drawing a diagram costs a few hundred milliseconds each, so the text should not wait behind them. */
async function diagramsPending(html: string): Promise<boolean> {
  if (!html.includes('class="mermaid"')) return false;
  const { diagramsPending: pending } = await import("@/lib/diagrams");
  return pending(html);
}

async function withCards(html: string, onUpdate: () => void): Promise<string> {
  let out = html;
  if (out.includes('class="ref"')) {
    const { inlineRefs } = await import("@/lib/refs");
    out = inlineRefs(out, onUpdate);
  }
  if (out.includes('class="embed"')) {
    const { inlineEmbeds } = await import("@/lib/embeds");
    out = inlineEmbeds(out, onUpdate);
  }
  return out;
}

export function useRendered(doc: string, options: RenderOptions = {}): string {
  const [html, setHtml] = useState("");
  const [cardsVersion, setCardsVersion] = useState(0);
  const { refs, links } = options;
  /** The document as drawn, before the cards are filled: reused when a card lands, so only the cards redo. */
  const base = useRef<{ key: string; html: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const bump = () => setCardsVersion((v) => v + 1);
    const key = `${refs} ${links} ${doc}`;
    const timer = setTimeout(async () => {
      if (base.current?.key === key) {
        const filled = await withCards(base.current.html, bump);
        if (!cancelled) setHtml(filled);
        return;
      }
      const parsed = await render(doc, { refs, links });
      // Paint the words as soon as they exist; undrawn diagrams arrive in a second pass.
      if (await diagramsPending(parsed)) {
        const early = await withCards(parsed, bump);
        if (!cancelled) setHtml(early);
      }
      const drawn = await withDiagrams(parsed);
      if (cancelled) return;
      base.current = { key, html: drawn };
      const out = await withCards(drawn, bump);
      if (!cancelled) setHtml(out);
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [doc, refs, links, cardsVersion]);

  return html;
}
