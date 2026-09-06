import { Settings2 } from "lucide-react";
import { Button } from "@md-to-pdf/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@md-to-pdf/ui/components/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@md-to-pdf/ui/components/tooltip";
import { copy } from "@/copy";
import type { LinkStyle, Page } from "@/lib/storage";

type Props = {
  syncScroll: boolean;
  onSyncScrollChange: (on: boolean) => void;
  page: Page;
  onPageChange: (page: Page) => void;
  refs: LinkStyle;
  onRefsChange: (style: LinkStyle) => void;
  links: LinkStyle;
  onLinksChange: (style: LinkStyle) => void;
};

export function SettingsMenu({ syncScroll, onSyncScrollChange, page, onPageChange, refs, onRefsChange, links, onLinksChange }: Props) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7" aria-label={copy.settings}>
              <Settings2 className="size-3.5" strokeWidth={1.5} aria-hidden />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">{copy.settings}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{copy.panes}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem checked={syncScroll} onCheckedChange={onSyncScrollChange}>
          {copy.syncScroll}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{copy.pageSize}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={page} onValueChange={(v) => onPageChange(v as Page)}>
          <DropdownMenuRadioItem value="A4">{copy.pageSizes.A4}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="Letter">{copy.pageSizes.Letter}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{copy.refStyle}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={refs} onValueChange={(v) => onRefsChange(v as LinkStyle)}>
          <DropdownMenuRadioItem value="card">{copy.linkStyles.card}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="link">{copy.linkStyles.link}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{copy.linkStyle}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={links} onValueChange={(v) => onLinksChange(v as LinkStyle)}>
          <DropdownMenuRadioItem value="card">{copy.linkStyles.card}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="link">{copy.linkStyles.link}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
