import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl } from "@/components/SegmentedControl";

const options = [
  { value: "preview", label: "Preview" },
  { value: "write", label: "Write" },
] as const;

test("renders a tablist and reports changes", async () => {
  const onChange = vi.fn();
  render(<SegmentedControl value="preview" onChange={onChange} options={[...options]} />);
  expect(screen.getByRole("tablist")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
  await userEvent.click(screen.getByRole("tab", { name: "Write" }));
  expect(onChange).toHaveBeenCalledWith("write");
});
