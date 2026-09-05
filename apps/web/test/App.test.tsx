import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "@/App";
import { copy } from "@/copy";

const requestPdf = vi.fn();

vi.mock("@/lib/pdf", () => ({
  requestPdf: (...args: unknown[]) => requestPdf(...args),
  PdfError: class extends Error {
    code = "failed";
  },
}));

beforeEach(() => {
  requestPdf.mockReset();
  URL.createObjectURL = vi.fn(() => "blob:1");
  URL.revokeObjectURL = vi.fn();
});

test("renders the wordmark", () => {
  render(<App />);
  expect(screen.getByText("MD to PDF")).toBeInTheDocument();
});

test("no PDF tab is shown", () => {
  render(<App />);
  expect(screen.getAllByRole("tab", { name: copy.tabs.html }).length).toBeGreaterThan(0);
  expect(screen.queryByRole("tab", { name: "PDF" })).not.toBeInTheDocument();
});

it("guards Cmd/Ctrl+S while a PDF render is already in flight", async () => {
  let resolveRender!: (blob: Blob) => void;
  requestPdf.mockImplementation(() => new Promise<Blob>((resolve) => { resolveRender = resolve; }));

  render(<App />);

  fireEvent.keyDown(window, { key: "s", metaKey: true });
  await waitFor(() => expect(requestPdf).toHaveBeenCalledTimes(1));

  fireEvent.keyDown(window, { key: "s", metaKey: true });
  expect(requestPdf).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolveRender(new Blob(["%PDF"]));
    await Promise.resolve();
  });
});

it("shows a toast when the PDF request fails", async () => {
  requestPdf.mockRejectedValue(new Error("boom"));

  render(<App />);

  fireEvent.keyDown(window, { key: "s", metaKey: true });

  await waitFor(() => expect(screen.getByText(copy.pdfError)).toBeInTheDocument());
});
