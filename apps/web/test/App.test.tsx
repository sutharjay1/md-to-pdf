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

test("offers Write and Preview, and nothing else", () => {
  render(<App />);
  expect(screen.getAllByRole("tab", { name: copy.tabs.preview }).length).toBeGreaterThan(0);
  expect(screen.queryByRole("tab", { name: "HTML" })).not.toBeInTheDocument();
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

it("toggles the theme with Cmd/Ctrl+D", () => {
  document.documentElement.classList.remove("dark");
  render(<App />);

  fireEvent.keyDown(window, { key: "d", metaKey: true });
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(localStorage.getItem("md2pdf:theme")).toBe("dark");

  fireEvent.keyDown(window, { key: "D", ctrlKey: true });
  expect(document.documentElement.classList.contains("dark")).toBe(false);

  fireEvent.keyDown(window, { key: "d" }); // bare d belongs to the editor
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});
