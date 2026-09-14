import { fireEvent, render, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@md-to-pdf/ui/components/tooltip";
import { PreviewView } from "@/components/PreviewView";
import { copy } from "@/copy";

it("opens a picture in the viewer, where it zooms and turns", async () => {
  render(<PreviewView html={'<p><img src="/cat.png" alt="A cat"></p>'} />, { wrapper: TooltipProvider });
  fireEvent.click(screen.getByRole("button", { name: copy.viewer.openImage("A cat") }));

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByRole("img", { name: "A cat" })).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole("button", { name: copy.viewer.zoomIn }));
  expect(within(dialog).getByRole("button", { name: new RegExp(copy.viewer.resetZoom) })).toHaveTextContent("125%");

  fireEvent.click(within(dialog).getByRole("button", { name: copy.viewer.rotate }));
  expect(dialog.querySelector<HTMLElement>("[data-viewer-media]")!.style.transform).toContain("rotate(90deg)");
});

it("opens a drawn diagram from the keyboard", async () => {
  render(<PreviewView html={'<figure class="diagram"><svg viewBox="0 0 200 100"><text>Start</text></svg></figure>'} />, {
    wrapper: TooltipProvider,
  });
  fireEvent.keyDown(screen.getByRole("button", { name: copy.viewer.openDiagram }), { key: "Enter" });

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByRole("img", { name: copy.viewer.diagram })).toHaveTextContent("Start");
});

it("leaves an image inside a link to the link", () => {
  render(<PreviewView html={'<p><a href="https://example.com"><img src="/badge.png" alt="Badge"></a></p>'} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("shows the empty message when there is no html", () => {
  render(<PreviewView html="" />);
  expect(screen.getByText("Nothing to preview yet.")).toBeInTheDocument();
});

it("patches html into the document without remounting", () => {
  const { rerender, container } = render(<PreviewView html="<p id='p'>one</p>" />);
  const first = container.querySelector("#p");
  rerender(<PreviewView html="<p id='p'>two</p>" />);
  expect(container.querySelector("#p")).toBe(first);
  expect(first).toHaveTextContent("two");
});
