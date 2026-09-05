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

it("goes idle → rendering → fresh, then stale when html changes", async () => {
  const { result, rerender } = renderHook(({ html }) => usePdf(html, "A4"), { initialProps: { html: "<p>a</p>" } });
  expect(result.current.status).toBe("idle");
  act(() => void result.current.render());
  expect(result.current.status).toBe("rendering");
  await waitFor(() => expect(result.current.status).toBe("fresh"));
  expect(result.current.url).toBe("blob:1");
  rerender({ html: "<p>b</p>" });
  expect(result.current.status).toBe("stale");
});
