import { useEffect, useRef } from "react";

function fraction(el: HTMLElement): number {
  const travel = el.scrollHeight - el.clientHeight;
  return travel > 0 ? el.scrollTop / travel : 0;
}

/**
 * Keeps the editor and the preview at the same point in the document. They have different heights, so the
 * shared measure is how far through its own scroll each one is.
 */
export function useSyncedScroll(enabled: boolean) {
  const editor = useRef<HTMLTextAreaElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  /** The scroll a mirror just caused, so the pane it landed on does not mirror it straight back. */
  const echo = useRef<{ el: HTMLElement; top: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const editorEl: HTMLElement | null = editor.current;
    const previewEl: HTMLElement | null = preview.current;
    if (!editorEl || !previewEl) return;

    const mirror = (from: HTMLElement, to: HTMLElement) => {
      if (echo.current?.el === from && Math.abs(from.scrollTop - echo.current.top) < 1.5) {
        echo.current = null;
        return;
      }
      to.scrollTop = fraction(from) * (to.scrollHeight - to.clientHeight);
      echo.current = { el: to, top: to.scrollTop };
    };
    const syncPreview = () => mirror(editorEl, previewEl);
    const syncEditor = () => mirror(previewEl, editorEl);

    editorEl.addEventListener("scroll", syncPreview, { passive: true });
    previewEl.addEventListener("scroll", syncEditor, { passive: true });
    return () => {
      echo.current = null;
      editorEl.removeEventListener("scroll", syncPreview);
      previewEl.removeEventListener("scroll", syncEditor);
    };
  }, [enabled]);

  return { editor, preview };
}
