import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@md-to-pdf/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@md-to-pdf/ui/components/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@md-to-pdf/ui/components/tooltip";
import { copy } from "@/copy";

/** What the preview hands over: a picture by its source, or a drawn diagram as markup. Natural sizes, 0 when unknown. */
export type Media =
  | { kind: "image"; src: string; alt: string; width: number; height: number }
  | { kind: "diagram"; svg: string; width: number; height: number };

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const STEP = 1.25;
/** Space kept clear around the fitted media: a margin at the sides, and the toolbar underneath. */
const ROOM_X = 64;
const ROOM_Y = 160;
/** Diagrams sit on the page colour they were drawn for, not straight on the dark backdrop. */
const SURFACE_PAD = 24;
/** Pointer travel under which a press is a click rather than a pan. */
const CLICK_SLOP = 4;

type View = { zoom: number; x: number; y: number };
const START: View = { zoom: 1, x: 0, y: 0 };

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function reducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

type Props = { media: Media | null; onClose: () => void };

export function MediaViewer({ media, onClose }: Props) {
  return (
    <Dialog open={media !== null} onOpenChange={(open) => !open && onClose()}>
      {media && <Viewer media={media} onClose={onClose} />}
    </Dialog>
  );
}

function Viewer({ media, onClose }: { media: Media; onClose: () => void }) {
  const vw = useSyncExternalStore(subscribeResize, () => window.innerWidth);
  const vh = useSyncExternalStore(subscribeResize, () => window.innerHeight);
  /** Only what the toolbar shows is state. Panning, zooming and turning write the transform themselves. */
  const [percent, setPercent] = useState(100);
  const [panning, setPanning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>(START);
  const rotation = useRef(0);
  const press = useRef<{ x: number; y: number; ox: number; oy: number; onMedia: boolean; moved: boolean } | null>(null);
  const frame = useRef(0);

  const pad = media.kind === "diagram" ? SURFACE_PAD * 2 : 0;
  const roomW = Math.max(vw - ROOM_X - pad, 1);
  const roomH = Math.max(vh - ROOM_Y - pad, 1);
  const known = media.width > 0 && media.height > 0;
  // A photo blown up past its own pixels only gets blurrier; a diagram is vector and fills the screen cleanly.
  const ceiling = media.kind === "image" ? 1 : Infinity;
  const fit = known ? Math.min(roomW / media.width, roomH / media.height, ceiling) : 1;
  const fitSideways = known ? Math.min(roomW / media.height, roomH / media.width, ceiling) : 1;
  // Turning the media does not resize its box — that would relayout the whole drawing mid-animation. The
  // fit it needs on its side rides along in the transform instead, so a quarter turn is pure compositing.
  const sidewaysRef = useRef(1);
  sidewaysRef.current = fitSideways / fit;

  const apply = useCallback((animate: boolean) => {
    const el = mediaRef.current;
    if (!el) return;
    const { zoom, x, y } = view.current;
    const deg = rotation.current;
    const scale = zoom * (deg % 180 !== 0 ? sidewaysRef.current : 1);
    el.style.transition = animate && !reducedMotion() ? "transform var(--dur-move) var(--ease-out-expo)" : "none";
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${deg}deg)`;
  }, []);

  /** The percentage is for reading, so it follows at most once a frame rather than once an event. */
  const showPercent = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      setPercent(Math.round(view.current.zoom * 100));
    });
  }, []);

  /** Zooms by a factor, keeping the point (px, py), measured from the stage centre, where it is. */
  const zoomBy = useCallback(
    (factor: number, px = 0, py = 0, animate = true) => {
      const v = view.current;
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
      const k = zoom / v.zoom;
      view.current = { zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
      apply(animate);
      showPercent();
    },
    [apply, showPercent],
  );

  // The fitted box changes with the window, and so does the scale a turned drawing needs.
  useLayoutEffect(() => {
    apply(false);
  }, [apply, fit, fitSideways]);

  useLayoutEffect(() => () => cancelAnimationFrame(frame.current), []);

  // Wheel zoom needs a listener that can cancel, or a trackpad pinch zooms the whole page instead.
  const stageRef = useCallback(
    (stage: HTMLDivElement | null) => {
      if (!stage) return;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const rect = stage.getBoundingClientRect();
        const px = e.clientX - rect.left - rect.width / 2;
        const py = e.clientY - rect.top - rect.height / 2;
        // No transition on the wheel: each notch would fight the last one's easing.
        zoomBy(Math.exp(-e.deltaY * 0.0015), px, py, false);
      };
      stage.addEventListener("wheel", onWheel, { passive: false });
      return () => stage.removeEventListener("wheel", onWheel);
    },
    [zoomBy],
  );

  function reset() {
    view.current = START;
    apply(true);
    showPercent();
  }

  function rotate() {
    rotation.current += 90;
    apply(true);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const actions: Record<string, () => void> = {
      "+": () => zoomBy(STEP),
      "=": () => zoomBy(STEP),
      "-": () => zoomBy(1 / STEP),
      "0": reset,
      r: rotate,
    };
    const act = actions[e.key.toLowerCase()];
    if (!act) return;
    e.preventDefault();
    act();
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const onMedia = e.target instanceof Element && e.target.closest("[data-viewer-media]") !== null;
    const { x, y } = view.current;
    press.current = { x: e.clientX, y: e.clientY, ox: x, oy: y, onMedia, moved: false };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.moved && Math.hypot(dx, dy) < CLICK_SLOP) return;
    if (!p.moved) setPanning(true);
    p.moved = true;
    view.current = { ...view.current, x: p.ox + dx, y: p.oy + dy };
    apply(false);
  }

  function onPointerUp() {
    const p = press.current;
    press.current = null;
    if (p?.moved) setPanning(false);
    // A press on the backdrop that did not travel is a click away from the media.
    if (p && !p.moved && !p.onMedia) onClose();
  }

  const size = known ? { width: media.width * fit, height: media.height * fit } : { maxWidth: roomW, maxHeight: roomH };
  const label = media.kind === "image" ? media.alt || copy.viewer.image : copy.viewer.diagram;

  return (
    <DialogContent
      ref={contentRef}
      showCloseButton={false}
      overlayClassName="bg-black/85"
      aria-describedby={undefined}
      onOpenAutoFocus={(e) => {
        // Focus the viewer itself: the keys work straight away, and no toolbar tooltip pops open.
        e.preventDefault();
        contentRef.current?.focus();
      }}
      onKeyDown={onKeyDown}
      className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-transparent p-0 shadow-none sm:max-w-none"
    >
      <DialogTitle className="sr-only">{label}</DialogTitle>
      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          press.current = null;
          setPanning(false);
        }}
        className={`relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden ${panning ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div ref={mediaRef} data-viewer-media className="will-change-transform [backface-visibility:hidden]">
          {media.kind === "image" ? (
            <img src={media.src} alt={media.alt} draggable={false} style={size} className="block max-w-none select-none" />
          ) : (
            <div
              role="img"
              aria-label={copy.viewer.diagram}
              style={{ ...size, padding: SURFACE_PAD }}
              className="box-content rounded-lg bg-background select-none [&>svg]:size-full [&>svg]:max-w-none!"
              dangerouslySetInnerHTML={{ __html: media.svg }}
            />
          )}
        </div>
      </div>

      <div className="flex shrink-0 justify-center pt-2 pb-6">
        <div className="flex h-10 items-center gap-0.5 rounded-full border bg-popover px-1.5 text-popover-foreground shadow-lg">
          <ToolButton label={copy.viewer.zoomOut} onClick={() => zoomBy(1 / STEP)} disabled={percent <= MIN_ZOOM * 100}>
            <ZoomOut />
          </ToolButton>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-14 px-0 text-[13px] tabular-nums"
                aria-label={`${copy.viewer.resetZoom}, ${percent}%`}
                onClick={reset}
              >
                {percent}%
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{copy.viewer.resetZoom}</TooltipContent>
          </Tooltip>
          <ToolButton label={copy.viewer.zoomIn} onClick={() => zoomBy(STEP)} disabled={percent >= MAX_ZOOM * 100}>
            <ZoomIn />
          </ToolButton>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <ToolButton label={copy.viewer.rotate} onClick={rotate}>
            <RotateCw />
          </ToolButton>
        </div>
      </div>

      <DialogClose asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="absolute top-3 right-3 text-white hover:bg-white/15 hover:text-white"
          aria-label={copy.viewer.close}
        >
          <X />
        </Button>
      </DialogClose>
    </DialogContent>
  );
}

function ToolButton({ label, ...props }: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} {...props} />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
