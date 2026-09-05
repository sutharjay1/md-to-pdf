import { Download } from "lucide-react";
import { Button } from "@md-to-pdf/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@md-to-pdf/ui/components/select";
import { copy } from "@/copy";
import type { Page } from "@/lib/storage";

type Props = {
  page: Page;
  onPageChange: (page: Page) => void;
  onDownload: () => void;
  downloadDisabled: boolean;
  downloadLabel: string;
  children?: React.ReactNode; // theme toggle slot
};

export function AppBar({
  page,
  onPageChange,
  onDownload,
  downloadDisabled,
  downloadLabel,
  children,
}: Props) {
  return (
    <header className="h-11 shrink-0 flex items-center justify-between px-4 border-b">
      <span className="font-medium">{copy.wordmark}</span>
      <div className="flex items-center gap-2">
        {children}
        <Select value={page} onValueChange={(v) => onPageChange(v as Page)}>
          <SelectTrigger
            aria-label={copy.pageSize}
            size="sm"
            className="w-auto gap-1 border-0 bg-transparent px-2 text-[13px] shadow-none data-[size=sm]:h-7"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end" sideOffset={4}>
            <SelectItem value="A4" className="px-2 py-1 text-[13px]">
              {copy.pageSizes.A4}
            </SelectItem>
            <SelectItem value="Letter" className="px-2 py-1 text-[13px]">
              {copy.pageSizes.Letter}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={onDownload}
          disabled={downloadDisabled}
          aria-label={downloadLabel}
          className="gap-2 px-3 h-7 text-background active:scale-[0.97] transition-transform duration-(--dur-fast)"
        >
          <Download aria-hidden strokeWidth={1.5} className="size-4" />
          <span className="hidden text-[15px] font-medium lg:inline">
            {downloadLabel}
          </span>
        </Button>
      </div>
    </header>
  );
}
