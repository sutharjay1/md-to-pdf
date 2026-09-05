import type { Page } from "@/lib/storage";

export type PdfErrorCode = "rate-limited" | "too-large" | "not-configured" | "failed";

export class PdfError extends Error {
  constructor(public code: PdfErrorCode) {
    super(code);
  }
}

export async function requestPdf(html: string, page: Page, fetchImpl: typeof fetch = fetch): Promise<Blob> {
  const res = await fetchImpl("/api/pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ html, page }),
  });
  if (res.status === 429) throw new PdfError("rate-limited");
  if (res.status === 413) throw new PdfError("too-large");
  if (res.status === 503) throw new PdfError("not-configured");
  if (!res.ok) throw new PdfError("failed");
  return res.blob();
}
