import { Moon, Sun } from "lucide-react";
import { Button } from "@md-to-pdf/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@md-to-pdf/ui/components/tooltip";
import { copy } from "@/copy";
import type { Theme } from "@/lib/storage";

type Props = { theme: Theme; onToggle: () => void };

export function ThemeToggle({ theme, onToggle }: Props) {
  const label = theme === "dark" ? copy.themeToLight : copy.themeToDark;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 active:scale-[0.97] transition-transform duration-(--dur-fast)"
          onClick={onToggle}
          aria-label={label}
        >
          {theme === "dark" ? (
            <Sun className="size-4" strokeWidth={1.5} aria-hidden />
          ) : (
            <Moon className="size-4" strokeWidth={1.5} aria-hidden />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
