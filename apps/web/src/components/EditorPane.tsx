import { useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@md-to-pdf/ui/components/button";
import { Pane } from "@/components/Pane";
import { copy } from "@/copy";
import { wordCount } from "@md-to-pdf/markdown";

type Props = { doc: string; onChange: (doc: string) => void; className?: string };

const ACCEPT = /\.(md|markdown|txt)$/i;

export function EditorPane({ doc, onChange, className }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const leaveOnTab = useRef(false);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      leaveOnTab.current = true;
      return;
    }
    if (e.key === "Tab" && leaveOnTab.current) {
      leaveOnTab.current = false;
      return;
    }
    leaveOnTab.current = false;
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart, selectionEnd } = el;
    onChange(doc.slice(0, selectionStart) + "  " + doc.slice(selectionEnd));
    requestAnimationFrame(() => el.setSelectionRange(selectionStart + 2, selectionStart + 2));
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPT.test(file.name)) {
      toast(copy.openWrongType);
      return;
    }
    const previous = doc;
    onChange(await file.text());
    toast(copy.replacedWith(file.name), { duration: 6000, action: { label: copy.undo, onClick: () => onChange(previous) } });
  }

  return (
    <Pane
      className={className}
      header={
        <>
          <span className="text-muted-foreground">{copy.editorLabel}</span>
          <span className="flex items-center gap-3">
            <span className="text-muted-foreground tabular-nums">{copy.words(wordCount(doc))}</span>
            <Button
              variant="ghost"
              size="sm"
              className="relative h-7 px-2 text-[13px] before:absolute before:-inset-1.5 before:content-[''] active:scale-[0.97] transition-transform duration-(--dur-fast)"
              onClick={() => fileRef.current?.click()}
            >
              {copy.open}
            </Button>
            <input ref={fileRef} type="file" accept=".md,.markdown,.txt" className="hidden" onChange={onFile} />
          </span>
        </>
      }
    >
      <p id="editor-tab-hint" className="sr-only">
        {copy.editorTabHint}
      </p>
      <textarea
        aria-label={copy.editorLabel}
        aria-describedby="editor-tab-hint"
        value={doc}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={copy.editorPlaceholder}
        spellCheck
        className="block h-full w-full resize-none bg-transparent p-6 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground max-lg:text-base"
      />
    </Pane>
  );
}
