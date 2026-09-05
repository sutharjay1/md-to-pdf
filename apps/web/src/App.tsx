import { useState } from "react";
import { AppBar } from "@/components/AppBar";
import { Pane } from "@/components/Pane";
import { SegmentedControl, type View } from "@/components/SegmentedControl";
import { copy } from "@/copy";

const outputTabs: { value: View; label: string }[] = [
  { value: "preview", label: copy.tabs.preview },
  { value: "html", label: copy.tabs.html },
  { value: "pdf", label: copy.tabs.pdf },
];
const mobileTabs: { value: View; label: string }[] = [{ value: "write", label: copy.tabs.write }, ...outputTabs];

export default function App() {
  const [view, setView] = useState<View>("preview");
  const outputView = view === "write" ? "preview" : view;

  return (
    <div className="h-dvh flex flex-col">
      <AppBar onDownload={() => {}} downloadDisabled={false} downloadLabel={copy.download} />
      <div className="lg:hidden h-9 flex items-center px-4 border-b">
        <SegmentedControl value={view} onChange={setView} options={mobileTabs} />
      </div>
      <main className="min-h-0 flex-1 grid lg:grid-cols-2">
        <Pane
          header={<span className="text-muted-foreground">{copy.editorLabel}</span>}
          className={`lg:border-r ${view === "write" ? "" : "hidden lg:flex"}`}
        >
          <textarea aria-label={copy.editorLabel} className="w-full h-full p-6 font-mono resize-none bg-transparent outline-none" />
        </Pane>
        <Pane
          header={<SegmentedControl value={outputView} onChange={setView} options={outputTabs} />}
          className={view === "write" ? "hidden lg:flex" : ""}
        >
          <div className="p-10 text-muted-foreground">{copy.previewEmpty}</div>
        </Pane>
      </main>
    </div>
  );
}
