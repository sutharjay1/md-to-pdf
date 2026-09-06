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
  expect(render).toHaveBeenNthCalledWith(1, expect.any(String), "flowchart TD\n  A --> B", expect.any(HTMLDivElement));
});

it("draws into a stage that is out of the page's flow, and leaves nothing behind in the body", async () => {
  const stages: { position: string; visibility: string; parent: string | undefined }[] = [];
  render.mockImplementation((_id: string, _code: string, stage: HTMLElement) => {
    stages.push({ position: stage.style.position, visibility: stage.style.visibility, parent: stage.parentElement?.tagName });
    return Promise.resolve({ svg: "<svg />" });
  });
  await inlineDiagrams('<pre class="mermaid">flowchart TD</pre>');
  expect(stages).toEqual([{ position: "fixed", visibility: "hidden", parent: "BODY" }]);
  expect(document.body.children).toHaveLength(0);
});

it("takes the stage away even when a diagram throws", async () => {
  render.mockRejectedValueOnce(new Error("boom"));
  await inlineDiagrams('<pre class="mermaid">nope nope</pre>');
  expect(document.body.children).toHaveLength(0);
});
