export type EmbedDetails = { title: string; description?: string; image?: string };

const cache = new Map<string, EmbedDetails | null>();
const pending = new Map<string, Promise<void>>();

async function lookup(href: string): Promise<EmbedDetails | null> {
  const res = await fetch(`/api/og?url=${encodeURIComponent(href)}`);
  if (!res.ok) return null;
  const json = (await res.json()) as Partial<EmbedDetails>;
  if (typeof json.title !== "string" || !json.title) return null;
  return {
    title: json.title,
    description: typeof json.description === "string" ? json.description : undefined,
    image: typeof json.image === "string" && json.image.startsWith("https://") ? json.image : undefined,
  };
}

function fill(anchor: Element, details: EmbedDetails): void {
  const doc = anchor.ownerDocument;
  const body = anchor.querySelector(".embed-body");
  if (!body) return;
  const span = (className: string, text: string) => {
    const el = doc.createElement("span");
    el.className = className;
    el.textContent = text;
    return el;
  };
  const parts: Element[] = [span("embed-title", details.title)];
  if (details.description) parts.push(span("embed-description", details.description));
  body.prepend(...parts);
  anchor.setAttribute("title", details.title);
  if (!details.image) return;
  const thumb = doc.createElement("span");
  thumb.className = "embed-thumb";
  const img = doc.createElement("img");
  // Set as attributes, not properties: this html is also handed to the PDF renderer as a string.
  img.setAttribute("src", details.image);
  img.setAttribute("alt", "");
  img.setAttribute("referrerpolicy", "no-referrer");
  thumb.append(img);
  anchor.append(thumb);
}

/**
 * Fills link cards from the page's own Open Graph tags, read by the Worker at /api/og. Cards whose details are
 * already known are filled now; the rest are fetched in the background and `onUpdate` fires once so the caller
 * can re-render. A page with no card of its own keeps the plain URL.
 */
export function inlineEmbeds(html: string, onUpdate: () => void): string {
  if (!html.includes('class="embed"')) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const anchors = [...doc.querySelectorAll("a.embed")];
  if (!anchors.length) return html;
  const started: Promise<void>[] = [];
  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") ?? "";
    if (cache.has(href)) {
      const details = cache.get(href);
      if (details) fill(anchor, details);
      continue;
    }
    if (pending.has(href) || !href) continue;
    const job = lookup(href)
      .catch(() => null)
      .then((details) => {
        cache.set(href, details);
        pending.delete(href);
      });
    pending.set(href, job);
    started.push(job);
  }
  if (started.length) void Promise.all(started).then(onUpdate);
  return doc.body.innerHTML;
}

export function resetEmbedCache(): void {
  cache.clear();
  pending.clear();
}
