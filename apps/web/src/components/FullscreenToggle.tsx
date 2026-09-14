import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@md-to-pdf/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@md-to-pdf/ui/components/tooltip";
import { copy } from "@/copy";

type Props = { on: boolean; onToggle: () => void };

export function FullscreenToggle({ on, onToggle }: Props) {
  const label = on ? copy.exitFullscreen : copy.enterFullscreen;
  const Icon = on ? Minimize2 : Maximize2;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7" aria-label={label} aria-pressed={on} onClick={onToggle}>
          <Icon className="size-3.5" strokeWidth={1.5} aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">{label}</TooltipContent>
    </Tooltip>
  );
}
