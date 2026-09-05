import { useCallback, useEffect, useRef, useState } from "react";
import { PdfError, requestPdf, type PdfErrorCode } from "@/lib/pdf";
import type { Page } from "@/lib/storage";

export type PdfStatus = "idle" | "rendering" | "fresh" | "stale" | "error";

export function usePdf(html: string, page: Page) {
  const [status, setStatus] = useState<PdfStatus>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<PdfErrorCode | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const renderedFor = useRef<{ html: string; page: Page } | null>(null);

  useEffect(() => {
    if (!renderedFor.current) return;
    const changed = renderedFor.current.html !== html || renderedFor.current.page !== page;
    if (changed && status === "fresh") setStatus("stale");
  }, [html, page, status]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const render = useCallback(async (): Promise<Blob | null> => {
    setStatus("rendering");
    setError(null);
    try {
      const blob = await requestPdf(html, page);
      blobRef.current = blob;
      renderedFor.current = { html, page };
      setUrl(URL.createObjectURL(blob));
      setStatus("fresh");
      return blob;
    } catch (e) {
      setError(e instanceof PdfError ? e.code : "failed");
      setStatus("error");
      return null;
    }
  }, [html, page]);

  const download = useCallback(async (filename: string) => {
    const blob = status === "fresh" && blobRef.current ? blobRef.current : await render();
    if (!blob) return;
    const a = document.createElement("a");
    const href = URL.createObjectURL(blob);
    a.href = href;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
  }, [status, render]);

  return { status, url, error, render, download };
}
