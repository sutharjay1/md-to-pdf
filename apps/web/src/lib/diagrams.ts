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

const BLOCK = /<pre class="mermaid">([\s\S]*?)<\/pre>/g;

/** The renderer escapes the diagram source on its way into the html; mermaid wants it back as written. */
function unescape(text: string): string {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

/**
 * Replaces the renderer's mermaid blocks with inline SVG, so Preview, HTML and the PDF all carry the drawn
 * diagram. Works on the html string: parsing the whole document on every keystroke is what made typing lag.
 */
export async function inlineDiagrams(html: string): Promise<string> {
  if (!html.includes('<pre class="mermaid">')) return html;
  const blocks = [...html.matchAll(BLOCK)];
  if (!blocks.length) return html;
  lib ??= load();
  const mermaid = await lib;
  let out = "";
  let at = 0;
  // Sequential on purpose: mermaid lays each diagram out in the live DOM, and drawing 21 of them with
  // Promise.all measured 3.3-4.6s against 0.58s one at a time.
  for (const block of blocks) {
    out += html.slice(at, block.index) + (await draw(mermaid, unescape(block[1])));
    at = block.index + block[0].length;
  }
  return out + html.slice(at);
}

/** True when a diagram still has to be drawn, which takes long enough that the text should be shown first. */
export function diagramsPending(html: string): boolean {
  if (!html.includes('<pre class="mermaid">')) return false;
  return [...html.matchAll(BLOCK)].some((block) => !cache.has(unescape(block[1])));
}
