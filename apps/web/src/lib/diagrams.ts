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

/**
 * Mermaid draws by laying the diagram out for real and measuring it, and given no element of its own it
 * appends that working copy straight to <body>. On a cold load the welcome file's diagrams go through one
 * at a time, and each one in turn makes the page taller than the window, so a scrollbar sits down the side
 * of the whole site until the last one is done. The stage is laid out, so the measurements stay honest, but
 * fixed and out of the page's flow, so nothing drawn in it can scroll the page.
 */
function openStage(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = "position:fixed;top:0;left:0;width:100vw;visibility:hidden;pointer-events:none;";
  document.body.appendChild(el);
  return el;
}

async function draw(mermaid: Mermaid, code: string, stage: HTMLElement): Promise<string> {
  const hit = cache.get(code);
  if (hit) return hit;
  const id = `diagram-${(seq += 1)}`;
  let out: string;
  try {
    // Everything mermaid leaves behind, on the way through or after a parse error, lands inside the stage.
    const { svg } = await mermaid.render(id, code, stage);
    out = `<figure class="diagram">${svg}</figure>`;
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : "Invalid diagram";
    const pre = document.createElement("pre");
    pre.className = "mermaid mermaid-error";
    pre.setAttribute("data-error", message);
    pre.textContent = code;
    out = pre.outerHTML;
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
  const stage = openStage();
  try {
    let out = "";
    let at = 0;
    // Sequential on purpose: mermaid lays each diagram out in the live DOM, and drawing 21 of them with
    // Promise.all measured 3.3-4.6s against 0.58s one at a time.
    for (const block of blocks) {
      out += html.slice(at, block.index) + (await draw(mermaid, unescape(block[1]), stage));
      at = block.index + block[0].length;
    }
    return out + html.slice(at);
  } finally {
    stage.remove();
  }
}

/** True when a diagram still has to be drawn, which takes long enough that the text should be shown first. */
export function diagramsPending(html: string): boolean {
  if (!html.includes('<pre class="mermaid">')) return false;
  return [...html.matchAll(BLOCK)].some((block) => !cache.has(unescape(block[1])));
}
