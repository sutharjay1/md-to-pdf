import { Button } from "@md-to-pdf/ui/components/button";
import { copy } from "@/copy";
import type { PdfErrorCode } from "@/lib/pdf";
import type { PdfStatus } from "@/hooks/usePdf";

type Props = { status: PdfStatus; url: string | null; error: PdfErrorCode | null; onRetry: () => void };

const messages: Record<PdfErrorCode, string> = {
  "rate-limited": copy.pdfRateLimited,
  "too-large": copy.pdfTooLarge,
  failed: copy.pdfError,
};

export function PdfView({ status, url, error, onRetry }: Props) {
  if (status === "error") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 bg-muted text-muted-foreground">
        <p>{messages[error ?? "failed"]}</p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[13px] relative before:absolute before:-inset-1.5 before:content-[''] active:scale-[0.97] transition-transform duration-(--dur-fast)"
          onClick={onRetry}
        >
          {copy.tryAgain}
        </Button>
      </div>
    );
  }
  return (
    <div className="h-full bg-muted">
      {url && (
        <iframe
          title={copy.pdfFrameTitle}
          src={url}
          className={`h-full w-full border-0 transition-opacity duration-(--dur-move) ${status === "rendering" ? "opacity-60" : "opacity-100"}`}
        />
      )}
    </div>
  );
}
