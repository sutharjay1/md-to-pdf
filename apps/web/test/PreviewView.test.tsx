import { render, screen } from "@testing-library/react";
import { PreviewView } from "@/components/PreviewView";

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
