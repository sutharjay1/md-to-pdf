import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HtmlView } from "@/components/HtmlView";
import { CopyButton } from "@/components/CopyButton";

it("shows the empty message", () => {
  render(<HtmlView html="" />);
  expect(screen.getByText("No HTML yet.")).toBeInTheDocument();
});

it("shows highlighted, escaped source", async () => {
  const { container } = render(<HtmlView html="<p>hi</p>" />);
  await waitFor(() => expect(container.querySelector("code")?.innerHTML).toContain("hljs-tag"));
  expect(container.querySelector("code")?.innerHTML).toContain("&lt;");
  expect(container.querySelector("code")?.textContent).toBe("<p>hi</p>");
});

it("copies and flips the label", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  vi.useFakeTimers({ shouldAdvanceTime: true });
  render(<CopyButton text="abc" />);
  await userEvent.click(screen.getByRole("button", { name: "Copy" }));
  expect(writeText).toHaveBeenCalledWith("abc");
  expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  vi.advanceTimersByTime(1500);
  await waitFor(() => expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument());
  vi.useRealTimers();
});
