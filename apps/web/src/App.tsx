import { useEffect, useState } from "react";
import { Toaster } from "@md-to-pdf/ui/components/sonner";
import { Button } from "@md-to-pdf/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@md-to-pdf/ui/components/select";
import { filenameFrom, titleFrom } from "@md-to-pdf/markdown";
import { AppBar } from "@/components/AppBar";
import { CopyButton } from "@/components/CopyButton";
import { EditorPane } from "@/components/EditorPane";
import { HtmlView } from "@/components/HtmlView";
import { Pane } from "@/components/Pane";
import { PdfView } from "@/components/PdfView";
import { PreviewView } from "@/components/PreviewView";
import { SegmentedControl, type View } from "@/components/SegmentedControl";
import { copy } from "@/copy";
import { useDocument } from "@/hooks/useDocument";
import { usePdf } from "@/hooks/usePdf";
import { useRendered } from "@/hooks/useRendered";
import { loadPrefs, savePrefs, type Page } from "@/lib/storage";

const outputTabs: { value: View; label: string }[] = [
  { value: "preview", label: copy.tabs.preview },
  { value: "html", label: copy.tabs.html },
  { value: "pdf", label: copy.tabs.pdf },
];
const mobileTabs: { value: View; label: string }[] = [{ value: "write", label: copy.tabs.write }, ...outputTabs];

export default function App() {
  const [view, setView] = useState<View>("preview");
  const outputView = view === "write" ? "preview" : view;
  const { doc, setDoc } = useDocument();
  const html = useRendered(doc);
  const [page, setPage] = useState<Page>(() => loadPrefs().page);
  const pdf = usePdf(html, page);

  useEffect(() => {
    document.title = copy.title(titleFrom(doc));
  }, [doc]);

  useEffect(() => {
    if (outputView === "pdf" && (pdf.status === "idle" || pdf.status === "stale")) void pdf.render();
    // depend only on outputView so edits while on the tab mark stale instead of re-rendering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputView]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void pdf.download(filenameFrom(titleFrom(doc)));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pdf.download, doc]);

  function onPageChange(next: Page) {
    setPage(next);
    savePrefs({ page: next });
  }

  return (
    <div className="h-dvh flex flex-col">
      <AppBar
        onDownload={() => pdf.download(filenameFrom(titleFrom(doc)))}
        downloadDisabled={pdf.status === "rendering"}
        downloadLabel={pdf.status === "rendering" ? copy.rendering : copy.download}
      />
      <div className="lg:hidden h-9 flex items-center px-4 border-b">
        <SegmentedControl value={view} onChange={setView} options={mobileTabs} />
      </div>
      <main className="min-h-0 flex-1 grid lg:grid-cols-2">
        <EditorPane doc={doc} onChange={setDoc} className={`lg:border-r ${view === "write" ? "" : "hidden lg:flex"}`} />
        <Pane
          header={
            <>
              <SegmentedControl value={outputView} onChange={setView} options={outputTabs} />
              {outputView === "html" && <CopyButton text={html} />}
              {outputView === "pdf" && (
                <div className="flex items-center gap-3">
                  <Select value={page} onValueChange={(v) => onPageChange(v as Page)}>
                    <SelectTrigger
                      aria-label={copy.pageSize}
                      className="h-7 w-auto gap-1 border-0 bg-transparent px-2 text-[13px] shadow-none"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">{copy.pageSizes.A4}</SelectItem>
                      <SelectItem value="Letter">{copy.pageSizes.Letter}</SelectItem>
                    </SelectContent>
                  </Select>
                  {pdf.status === "rendering" && (
                    <span className="text-muted-foreground transition-opacity duration-(--dur-base)">{copy.rendering}</span>
                  )}
                  {pdf.status === "stale" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[13px] relative before:absolute before:-inset-1.5 before:content-[''] active:scale-[0.97] transition-transform duration-(--dur-fast)"
                      onClick={() => pdf.render()}
                    >
                      {copy.update}
                    </Button>
                  )}
                </div>
              )}
            </>
          }
          className={view === "write" ? "hidden lg:flex" : ""}
        >
          {outputView === "preview" && <PreviewView html={html} />}
          {outputView === "html" && <HtmlView html={html} />}
          {outputView === "pdf" && (
            <PdfView
              status={pdf.status}
              url={pdf.url}
              error={pdf.error}
              fileName={filenameFrom(titleFrom(doc))}
              onRetry={() => pdf.render()}
            />
          )}
        </Pane>
      </main>
      <Toaster position="bottom-center" />
    </div>
  );
}
