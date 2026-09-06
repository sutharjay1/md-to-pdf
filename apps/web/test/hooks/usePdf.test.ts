import { act, renderHook, waitFor } from "@testing-library/react";
import { usePdf } from "@/hooks/usePdf";

vi.mock("@/lib/pdf", () => ({
  requestPdf: vi.fn(async () => new Blob(["%PDF"])),
  PdfError: class extends Error { code = "failed"; },
}));

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:1");
  URL.revokeObjectURL = vi.fn();
});

it("goes idle → rendering → fresh", async () => {
  const { result } = renderHook(({ html }) => usePdf(html, "A4"), { initialProps: { html: "<p>a</p>" } });
  expect(result.current.status).toBe("idle");
  act(() => void result.current.render());
  expect(result.current.status).toBe("rendering");
  await waitFor(() => expect(result.current.status).toBe("fresh"));
});

it("goes to error status when the request fails", async () => {
  const { requestPdf } = await import("@/lib/pdf");
  vi.mocked(requestPdf).mockRejectedValueOnce(new Error("boom"));
  const { result } = renderHook(() => usePdf("<p>a</p>", "A4"));
  act(() => void result.current.render());
  await waitFor(() => expect(result.current.status).toBe("error"));
  expect(result.current.error).toBe("failed");
});

it("counts one save per download, and none when the render fails", async () => {
  const track = vi.fn();
  vi.stubGlobal("kobbe", { track });
  const { result } = renderHook(() => usePdf("<p>a</p>", "A4"));

  await act(() => result.current.download("doc.pdf"));
  expect(track).toHaveBeenCalledExactlyOnceWith("PDF saved");

  // the second download reuses the rendered blob, and still counts as a save
  await act(() => result.current.download("doc.pdf"));
  expect(track).toHaveBeenCalledTimes(2);

  const { requestPdf } = await import("@/lib/pdf");
  vi.mocked(requestPdf).mockRejectedValueOnce(new Error("boom"));
  const failing = renderHook(() => usePdf("<p>b</p>", "A4"));
  await act(() => failing.result.current.download("doc.pdf"));
  expect(track).toHaveBeenCalledTimes(2);
});

it("does nothing when the tracker is absent or blocked", async () => {
  vi.stubGlobal("kobbe", undefined);
  const { result } = renderHook(() => usePdf("<p>a</p>", "A4"));
  await expect(act(() => result.current.download("doc.pdf"))).resolves.not.toThrow();
});
