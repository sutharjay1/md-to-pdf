import { renderHook, waitFor } from "@testing-library/react";
import { useRendered } from "@/hooks/useRendered";

it("renders after the debounce and keeps the last html while typing", async () => {
  const { result, rerender } = renderHook(({ doc }) => useRendered(doc, { refs: "card", links: "link" }), { initialProps: { doc: "# A" } });
  await waitFor(() => expect(result.current).toContain("<h1"));
  rerender({ doc: "# B" });
  expect(result.current).toContain("A");
  await waitFor(() => expect(result.current).toContain("B"));
});
