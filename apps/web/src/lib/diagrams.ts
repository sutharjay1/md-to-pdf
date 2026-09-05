type Mermaid = typeof import("mermaid").default;

let lib: Promise<Mermaid> | null = null;
const cache = new Map<string, string>();
let seq = 0;

async function load(): Promise<Mermaid> {
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "strict",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  });
  return mermaid;
}

async function draw(mermaid: Mermaid, code: string): Promise<string> {
  const hit = cache.get(code);
  if (hit) return hit;
  const id = `diagram-${(seq += 1)}`;
  let out: string;
  try {
    const { svg } = await mermaid.render(id, code);
    out = `<figure class="diagram">${svg}</figure>`;
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : "Invalid diagram";
    const pre = document.createElement("pre");
    pre.className = "mermaid mermaid-error";
    pre.setAttribute("data-error", message);
    pre.textContent = code;
    out = pre.outerHTML;
  } finally {
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
  }
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  cache.set(code, out);
  return out;
}

/** Replaces the renderer's mermaid blocks with inline SVG, so Preview, HTML and the PDF all carry the drawn diagram. */
export async function inlineDiagrams(html: string): Promise<string> {
  if (!html.includes('class="mermaid"')) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = [...doc.querySelectorAll("pre.mermaid")];
  if (!blocks.length) return html;
  lib ??= load();
  const mermaid = await lib;
  for (const pre of blocks) {
    const drawn = doc.createRange().createContextualFragment(await draw(mermaid, pre.textContent ?? ""));
    pre.replaceWith(drawn);
  }
  return doc.body.innerHTML;
}
