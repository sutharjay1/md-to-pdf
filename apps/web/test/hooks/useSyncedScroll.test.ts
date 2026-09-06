import { renderHook } from "@testing-library/react";
import { useSyncedScroll } from "@/hooks/useSyncedScroll";

function pane(scrollHeight: number, clientHeight: number) {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollHeight", { value: scrollHeight });
  Object.defineProperty(el, "clientHeight", { value: clientHeight });
  document.body.append(el);
  return el;
}

it("mirrors the scroll position as a fraction, without bouncing back", () => {
  const editor = pane(2000, 500) as unknown as HTMLTextAreaElement;
  const preview = pane(5000, 500) as unknown as HTMLDivElement;
  const { result, rerender } = renderHook(({ on }) => useSyncedScroll(on), { initialProps: { on: false } });
  result.current.editor.current = editor;
  result.current.preview.current = preview;
  rerender({ on: true });

  editor.scrollTop = 750; // halfway through 1500px of travel
  editor.dispatchEvent(new Event("scroll"));
  expect(preview.scrollTop).toBe(2250); // half of 4500px of travel

  const settled = preview.scrollTop;
  preview.dispatchEvent(new Event("scroll")); // the mirrored scroll must not scroll the editor back
  expect(editor.scrollTop).toBe(750);
  expect(preview.scrollTop).toBe(settled);
});

it("stops mirroring when the toggle is off", () => {
  const editor = pane(2000, 500) as unknown as HTMLTextAreaElement;
  const preview = pane(5000, 500) as unknown as HTMLDivElement;
  const { result, rerender } = renderHook(({ on }) => useSyncedScroll(on), { initialProps: { on: false } });
  result.current.editor.current = editor;
  result.current.preview.current = preview;
  rerender({ on: true });
  rerender({ on: false });

  editor.scrollTop = 750;
  editor.dispatchEvent(new Event("scroll"));
  expect(preview.scrollTop).toBe(0);
});
