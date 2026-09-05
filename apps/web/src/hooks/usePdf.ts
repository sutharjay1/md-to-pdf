import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { copy } from "@/copy";
import { PdfError, requestPdf, type PdfErrorCode } from "@/lib/pdf";
import type { Page } from "@/lib/storage";

export type PdfStatus = "idle" | "rendering" | "fresh" | "error";

const errorMessages: Record<PdfErrorCode, string> = {
  "rate-limited": copy.pdfRateLimited,
  "too-large": copy.pdfTooLarge,
  "not-configured": copy.pdfNotConfigured,
  failed: copy.pdfError,
};

export function usePdf(html: string, page: Page) {
  const [status, setStatus] = useState<PdfStatus>("idle");
  const [error, setError] = useState<PdfErrorCode | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const renderedFor = useRef<{ html: string; page: Page } | null>(null);

  const render = useCallback(async (): Promise<Blob | null> => {
    setStatus("rendering");
    setError(null);
    try {
      const blob = await requestPdf(html, page);
      blobRef.current = blob;
      renderedFor.current = { html, page };
      setStatus("fresh");
      return blob;
    } catch (e) {
      const code = e instanceof PdfError ? e.code : "failed";
      setError(code);
      setStatus("error");
      toast.error(errorMessages[code]);
      return null;
    }
  }, [html, page]);

  const download = useCallback(async (filename: string) => {
    const fresh = renderedFor.current?.html === html && renderedFor.current?.page === page ? blobRef.current : null;
    const blob = fresh ?? (await render());
    if (!blob) return;
    const a = document.createElement("a");
    const href = URL.createObjectURL(blob);
    a.href = href;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
  }, [html, page, render]);

  return { status, error, render, download };
}
