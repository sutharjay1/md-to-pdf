import { useEffect, useState } from "react";
import { Toaster } from "@md-to-pdf/ui/components/sonner";
import { TooltipProvider } from "@md-to-pdf/ui/components/tooltip";
import { filenameFrom, titleFrom } from "@md-to-pdf/markdown";
import { AppBar } from "@/components/AppBar";
import { EditorPane } from "@/components/EditorPane";
import { Pane } from "@/components/Pane";
import { PreviewView } from "@/components/PreviewView";
import { SegmentedControl, type View } from "@/components/SegmentedControl";
import { SettingsMenu } from "@/components/SettingsMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { copy } from "@/copy";
import { useDocument } from "@/hooks/useDocument";
import { usePdf } from "@/hooks/usePdf";
import { useRendered } from "@/hooks/useRendered";
import { useSyncedScroll } from "@/hooks/useSyncedScroll";
import { useTheme } from "@/hooks/useTheme";
import { loadPrefs, savePrefs, type LinkStyle, type Page } from "@/lib/storage";

const SAVE_KEY = "s";
const THEME_KEY = "d";

/** Where a letter is text the reader is typing, not a shortcut: the editor, a form field, an open menu. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return target.closest('[role="menu"], [role="dialog"], [role="listbox"]') !== null;
}

const mobileTabs: { value: View; label: string }[] = [
  { value: "write", label: copy.tabs.write },
  { value: "preview", label: copy.tabs.preview },
];

export default function App() {
  const [view, setView] = useState<View>("preview");
  const { doc, setDoc } = useDocument();
  const [page, setPage] = useState<Page>(() => loadPrefs().page);
  const [refs, setRefs] = useState<LinkStyle>(() => loadPrefs().refs);
  const [links, setLinks] = useState<LinkStyle>(() => loadPrefs().links);
  const [syncScroll, setSyncScroll] = useState(() => loadPrefs().syncScroll);
  const html = useRendered(doc, { refs, links });
  const pdf = usePdf(html, page);
  const { theme, toggle: toggleTheme } = useTheme();
  const scroll = useSyncedScroll(syncScroll);

  useEffect(() => {
    document.title = copy.title(titleFrom(doc));
  }, [doc]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === SAVE_KEY) {
        e.preventDefault();
        if (pdf.status === "rendering") return;
        void pdf.download(filenameFrom(titleFrom(doc)));
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      if (key !== THEME_KEY || isTyping(e.target)) return;
      e.preventDefault();
      toggleTheme();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pdf.download, pdf.status, doc, toggleTheme]);

  function onPageChange(next: Page) {
    setPage(next);
    savePrefs({ page: next });
  }

  function onRefsChange(next: LinkStyle) {
    setRefs(next);
    savePrefs({ refs: next });
  }

  function onLinksChange(next: LinkStyle) {
    setLinks(next);
    savePrefs({ links: next });
  }

  function onSyncScrollChange(next: boolean) {
    setSyncScroll(next);
    savePrefs({ syncScroll: next });
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div className="h-dvh overflow-hidden flex flex-col">
        <AppBar
          onDownload={() => pdf.download(filenameFrom(titleFrom(doc)))}
          downloadDisabled={pdf.status === "rendering"}
          downloadLabel={pdf.status === "rendering" ? copy.rendering : copy.download}
        >
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </AppBar>
        <div className="lg:hidden h-9 flex items-center justify-between gap-2 px-4 border-b">
          <SegmentedControl value={view} onChange={setView} options={mobileTabs} />
          <SettingsMenu
            syncScroll={syncScroll}
            onSyncScrollChange={onSyncScrollChange}
            page={page}
            onPageChange={onPageChange}
            refs={refs}
            onRefsChange={onRefsChange}
            links={links}
            onLinksChange={onLinksChange}
          />
        </div>
        <main className="min-h-0 flex-1 grid grid-rows-[minmax(0,1fr)] grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <EditorPane
            doc={doc}
            onChange={setDoc}
            textRef={scroll.editor}
            className={`lg:border-r ${view === "write" ? "" : "hidden lg:flex"}`}
          />
          <Pane
            header={
              <>
                <span className="text-muted-foreground">{copy.tabs.preview}</span>
                <span className="hidden lg:flex items-center">
                  <SettingsMenu
            syncScroll={syncScroll}
            onSyncScrollChange={onSyncScrollChange}
            page={page}
            onPageChange={onPageChange}
            refs={refs}
            onRefsChange={onRefsChange}
            links={links}
            onLinksChange={onLinksChange}
          />
                </span>
              </>
            }
            className={view === "write" ? "hidden lg:flex" : ""}
            scrollRef={scroll.preview}
          >
            <PreviewView html={html} />
          </Pane>
        </main>
        <Toaster position="bottom-center" theme={theme} />
      </div>
    </TooltipProvider>
  );
}
