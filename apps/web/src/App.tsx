import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@md-to-pdf/ui/components/sonner";
import { TooltipProvider } from "@md-to-pdf/ui/components/tooltip";
import { filenameFrom, titleFrom } from "@md-to-pdf/markdown";
import { AppBar } from "@/components/AppBar";
import { CopyButton } from "@/components/CopyButton";
import { EditorPane } from "@/components/EditorPane";
import { Pane } from "@/components/Pane";
import { PreviewView } from "@/components/PreviewView";
import { SegmentedControl, type View } from "@/components/SegmentedControl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { copy } from "@/copy";
import { useDocument } from "@/hooks/useDocument";
import { usePdf } from "@/hooks/usePdf";
import { useRendered } from "@/hooks/useRendered";
import { useTheme } from "@/hooks/useTheme";
import { loadPrefs, savePrefs, type Page } from "@/lib/storage";

const HtmlView = lazy(() => import("@/components/HtmlView"));

const outputTabs: { value: View; label: string }[] = [
  { value: "preview", label: copy.tabs.preview },
  { value: "html", label: copy.tabs.html },
];
const mobileTabs: { value: View; label: string }[] = [{ value: "write", label: copy.tabs.write }, ...outputTabs];

export default function App() {
  const [view, setView] = useState<View>("preview");
  const outputView = view === "write" ? "preview" : view;
  const { doc, setDoc } = useDocument();
  const html = useRendered(doc);
  const [page, setPage] = useState<Page>(() => loadPrefs().page);
  const pdf = usePdf(html, page);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    document.title = copy.title(titleFrom(doc));
  }, [doc]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (pdf.status === "rendering") return;
        void pdf.download(filenameFrom(titleFrom(doc)));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pdf.download, pdf.status, doc]);

  function onPageChange(next: Page) {
    setPage(next);
    savePrefs({ page: next });
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div className="h-dvh overflow-hidden flex flex-col">
        <AppBar
          page={page}
          onPageChange={onPageChange}
          onDownload={() => pdf.download(filenameFrom(titleFrom(doc)))}
          downloadDisabled={pdf.status === "rendering"}
          downloadLabel={pdf.status === "rendering" ? copy.rendering : copy.download}
        >
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </AppBar>
        <div className="lg:hidden h-9 flex items-center px-4 border-b">
          <SegmentedControl value={view} onChange={setView} options={mobileTabs} />
        </div>
        <main className="min-h-0 flex-1 grid grid-rows-[minmax(0,1fr)] lg:grid-cols-2">
          <EditorPane doc={doc} onChange={setDoc} className={`lg:border-r ${view === "write" ? "" : "hidden lg:flex"}`} />
          <Pane
            header={
              <>
                <div className="hidden lg:flex">
                  <SegmentedControl value={outputView} onChange={setView} options={outputTabs} />
                </div>
                {outputView === "html" && <CopyButton text={html} />}
              </>
            }
            className={view === "write" ? "hidden lg:flex" : ""}
          >
            <div key={outputView} className="h-full animate-in fade-in duration-(--dur-base)">
              {outputView === "preview" && <PreviewView html={html} />}
              {outputView === "html" && (
                <Suspense fallback={null}>
                  <HtmlView html={html} />
                </Suspense>
              )}
            </div>
          </Pane>
        </main>
        <Toaster position="bottom-center" theme={theme} />
      </div>
    </TooltipProvider>
  );
}
