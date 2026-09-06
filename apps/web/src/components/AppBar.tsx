import { Download } from "lucide-react";
import { Button } from "@md-to-pdf/ui/components/button";
import { Logo } from "@/components/Logo";
import { useIsMobile } from "@/hooks/use-mobile";
import { copy } from "@/copy";

type Props = {
  onDownload: () => void;
  downloadDisabled: boolean;
  downloadLabel: string;
  children?: React.ReactNode; // theme toggle and settings slot
};

export function AppBar({ onDownload, downloadDisabled, downloadLabel, children }: Props) {
  const isMobile = useIsMobile();

  return (
    <header className="h-11 shrink-0 flex items-center justify-between px-4 border-b">
      <span className="flex items-center gap-2 font-medium">
        <Logo />
        {copy.wordmark}
      </span>
      <div className="flex items-center gap-1">
        {children}
        <Button
          size={isMobile ? "icon" : "sm"}
          onClick={onDownload}
          disabled={downloadDisabled}
          aria-label={downloadLabel}
          className="text-background"
        >
          <Download aria-hidden className="size-3.5" />
          {!isMobile && <span className="text-xs">{downloadLabel}</span>}
        </Button>
      </div>
    </header>
  );
}
