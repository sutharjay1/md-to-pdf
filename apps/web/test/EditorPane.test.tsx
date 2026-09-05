import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorPane } from "@/components/EditorPane";

it("shows the word count and inserts two spaces on Tab", async () => {
  const onChange = vi.fn();
  render(<EditorPane doc="one two" onChange={onChange} />);
  expect(screen.getByText("2 words")).toBeInTheDocument();
  const box = screen.getByRole("textbox", { name: "Markdown" });
  box.focus();
  (box as HTMLTextAreaElement).setSelectionRange(7, 7);
  await userEvent.keyboard("{Tab}");
  expect(onChange).toHaveBeenCalledWith("one two  ");
});

it("rejects wrong file types", async () => {
  const onChange = vi.fn();
  render(<EditorPane doc="" onChange={onChange} />);
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await userEvent.upload(input, new File(["x"], "a.pdf", { type: "application/pdf" }));
  expect(onChange).not.toHaveBeenCalled();
});
