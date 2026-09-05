import { act, renderHook } from "@testing-library/react";
import { useDocument } from "@/hooks/useDocument";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

it("loads the welcome doc on first visit", () => {
  const { result } = renderHook(() => useDocument());
  expect(result.current.doc).toContain("# Write on the left");
});

it("loads the stored doc and autosaves after 300ms", () => {
  localStorage.setItem("md2pdf:doc", "stored");
  const { result } = renderHook(() => useDocument());
  expect(result.current.doc).toBe("stored");
  act(() => result.current.setDoc("edited"));
  expect(localStorage.getItem("md2pdf:doc")).toBe("stored");
  act(() => vi.advanceTimersByTime(300));
  expect(localStorage.getItem("md2pdf:doc")).toBe("edited");
});
