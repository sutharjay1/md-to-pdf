import { inlineDiagrams } from "@/lib/diagrams";

const render = vi.fn();
vi.mock("mermaid", () => ({ default: { initialize: vi.fn(), render } }));

it("returns html without diagrams untouched and never loads mermaid", async () => {
  const html = "<p>plain</p>";
  expect(await inlineDiagrams(html)).toBe(html);
  expect(render).not.toHaveBeenCalled();
});

it("swaps mermaid blocks for figures and reports bad diagrams inline", async () => {
  render.mockResolvedValueOnce({ svg: "<svg><g>ok</g></svg>" }).mockRejectedValueOnce(new Error("Parse error on line 2\nmore"));
  const html = '<pre class="mermaid">flowchart TD\n  A --&gt; B</pre><pre class="mermaid">nope</pre>';
  const out = await inlineDiagrams(html);
  expect(out).toContain('<figure class="diagram"><svg><g>ok</g></svg></figure>');
  expect(out).toContain('class="mermaid mermaid-error" data-error="Parse error on line 2"');
  expect(render).toHaveBeenNthCalledWith(1, expect.any(String), "flowchart TD\n  A --> B");
});
