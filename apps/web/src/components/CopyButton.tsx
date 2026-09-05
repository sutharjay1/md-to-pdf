import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@md-to-pdf/ui/components/button";
import { copy } from "@/copy";

type Props = { text: string };

export function CopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      toast(copy.copyFailed);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-[13px] relative before:absolute before:-inset-1.5 before:content-[''] active:scale-[0.97] transition-[transform,opacity] duration-(--dur-base)"
      onClick={onClick}
    >
      {copied ? copy.copied : copy.copy}
    </Button>
  );
}
