import { act, renderHook } from "@testing-library/react";
import { useTheme } from "@/hooks/useTheme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

it("defaults to light, toggles, persists, and sets the class", () => {
  const { result } = renderHook(() => useTheme());
  expect(result.current.theme).toBe("light");
  expect(localStorage.getItem("md2pdf:theme")).toBeNull();
  act(() => result.current.toggle());
  expect(result.current.theme).toBe("dark");
  expect(document.documentElement).toHaveClass("dark");
  expect(localStorage.getItem("md2pdf:theme")).toBe("dark");
});

it("ignores prefers-color-scheme", () => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
  const { result } = renderHook(() => useTheme());
  expect(result.current.theme).toBe("light");
});
