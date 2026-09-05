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

vi.mock("@/components/PdfViewer", () => ({
  default: () => <div data-testid="pdf-viewer-stub" />,
}));

beforeEach(() => {
  requestPdf.mockReset();
  URL.createObjectURL = vi.fn(() => "blob:1");
  URL.revokeObjectURL = vi.fn();
});

function clickTab(name: string) {
  const [tab] = screen.getAllByRole("tab", { name });
  fireEvent.mouseDown(tab, { button: 0 });
}

test("renders the wordmark", () => {
  render(<App />);
  expect(screen.getByText("MD to PDF")).toBeInTheDocument();
});

it("guards Cmd/Ctrl+S while a PDF render is already in flight", async () => {
  let resolveRender!: (blob: Blob) => void;
  requestPdf.mockImplementation(() => new Promise<Blob>((resolve) => { resolveRender = resolve; }));

  render(<App />);

  clickTab(copy.tabs.pdf);
  await waitFor(() => expect(requestPdf).toHaveBeenCalledTimes(1));

  fireEvent.keyDown(window, { key: "s", metaKey: true });
  expect(requestPdf).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolveRender(new Blob(["%PDF"]));
    await Promise.resolve();
  });

  clickTab(copy.tabs.preview);
  await waitFor(() => expect(screen.getByText(/Write on the left, get a PDF on the right/)).toBeInTheDocument());
});
