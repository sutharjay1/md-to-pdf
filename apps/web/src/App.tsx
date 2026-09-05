import { useEffect, useState } from "react";
import { Toaster } from "@md-to-pdf/ui/components/sonner";
import { titleFrom } from "@md-to-pdf/markdown";
import { AppBar } from "@/components/AppBar";
import { EditorPane } from "@/components/EditorPane";
import { Pane } from "@/components/Pane";
import { PreviewView } from "@/components/PreviewView";
import { SegmentedControl, type View } from "@/components/SegmentedControl";
import { copy } from "@/copy";
import { useDocument } from "@/hooks/useDocument";
import { useRendered } from "@/hooks/useRendered";

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

  useEffect(() => {
    document.title = copy.title(titleFrom(doc));
  }, [doc]);

  return (
    <div className="h-dvh flex flex-col">
      <AppBar onDownload={() => {}} downloadDisabled={false} downloadLabel={copy.download} />
      <div className="lg:hidden h-9 flex items-center px-4 border-b">
        <SegmentedControl value={view} onChange={setView} options={mobileTabs} />
      </div>
      <main className="min-h-0 flex-1 grid lg:grid-cols-2">
        <EditorPane doc={doc} onChange={setDoc} className={`lg:border-r ${view === "write" ? "" : "hidden lg:flex"}`} />
        <Pane
          header={<SegmentedControl value={outputView} onChange={setView} options={outputTabs} />}
          className={view === "write" ? "hidden lg:flex" : ""}
        >
          {outputView === "preview" && <PreviewView html={html} />}
        </Pane>
      </main>
      <Toaster position="bottom-center" />
    </div>
  );
}
