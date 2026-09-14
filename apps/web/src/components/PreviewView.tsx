import { lazy, Suspense, useEffect, useRef, useState } from "react";
import morphdom from "morphdom";
import type { Media } from "@/components/MediaViewer";
import { copy } from "@/copy";

// Only fetched on the first click, so the viewer and its dialog stay out of the initial bundle.
const MediaViewer = lazy(() => import("@/components/MediaViewer").then((m) => ({ default: m.MediaViewer })));

type Props = { html: string };

/** What opens in the viewer. An image inside a link belongs to the link. */
const VIEWABLE = "img, figure.diagram";
/** Set on the live nodes only, never in the html, so the PDF and the exported HTML stay as they were. */
const MARKS = ["data-viewable", "role", "tabindex", "aria-label"];

function viewableAt(target: EventTarget | null, root: HTMLElement): Element | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest(VIEWABLE);
  return el && root.contains(el) && !el.closest("a") ? el : null;
}

function mark(root: HTMLElement) {
  for (const el of root.querySelectorAll(VIEWABLE)) {
    if (el.closest("a")) continue;
    el.setAttribute("data-viewable", "");
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", el instanceof HTMLImageElement ? copy.viewer.openImage(el.alt) : copy.viewer.openDiagram);
  }
}

function mediaFrom(el: Element): Media | null {
  if (el instanceof HTMLImageElement) {
    return { kind: "image", src: el.currentSrc || el.src, alt: el.alt, width: el.naturalWidth, height: el.naturalHeight };
  }
  const svg = el.querySelector("svg");
  if (!svg) return null;
  const [, , width = 0, height = 0] = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  return { kind: "diagram", svg: svg.outerHTML, width, height };
}

export function PreviewView({ html }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [media, setMedia] = useState<Media | null>(null);
  const empty = !html.trim();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Unchanged nodes are common between renders, and skipping them keeps big subtrees (drawn diagrams) untouched.
    // The viewer's marks are carried onto the incoming node first, or every marked node would compare unequal.
    morphdom(el, `<div>${html}</div>`, {
      childrenOnly: true,
      onBeforeElUpdated: (from, to) => {
        if (from.hasAttribute("data-viewable")) {
          for (const name of MARKS) to.setAttribute(name, from.getAttribute(name) ?? "");
        }
        return !from.isEqualNode(to);
      },
    });
    mark(el);
  }, [html]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const open = (el: Element | null) => {
      const next = el && mediaFrom(el);
      if (next) setMedia(next);
    };
    const onClick = (e: MouseEvent) => open(viewableAt(e.target, root));
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = viewableAt(e.target, root);
      if (!el || el !== e.target) return;
      e.preventDefault();
      open(el);
    };
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, [empty]);

  if (empty) {
    return <p className="p-10 text-muted-foreground">{copy.previewEmpty}</p>;
  }
  return (
    <>
      <div
        ref={ref}
        className="doc mx-auto max-w-[72ch] px-5 py-6 lg:px-10 lg:py-10 [&_[data-viewable]]:cursor-zoom-in [&_[data-viewable]]:outline-none [&_[data-viewable]:focus-visible]:ring-2 [&_[data-viewable]:focus-visible]:ring-ring"
      />
      {media && (
        <Suspense fallback={null}>
          <MediaViewer media={media} onClose={() => setMedia(null)} />
        </Suspense>
      )}
    </>
  );
}
