import { Download } from "lucide-react";
import { Button } from "@md-to-pdf/ui/components/button";
import { copy } from "@/copy";

type Props = {
  onDownload: () => void;
  downloadDisabled: boolean;
  downloadLabel: string;
  children?: React.ReactNode; // theme toggle slot
};

export function AppBar({ onDownload, downloadDisabled, downloadLabel, children }: Props) {
  return (
    <header className="h-11 shrink-0 flex items-center justify-between px-4 border-b">
      <span className="font-medium">{copy.wordmark}</span>
      <div className="flex items-center gap-2">
        {children}
        <Button
          size="sm"
          onClick={onDownload}
          disabled={downloadDisabled}
          aria-label={copy.download}
          className="active:scale-[0.97] transition-transform duration-(--dur-fast)"
        >
          <Download aria-hidden strokeWidth={1.5} className="size-4" />
          <span className="hidden sm:inline">{downloadLabel}</span>
        </Button>
      </div>
    </header>
  );
}
