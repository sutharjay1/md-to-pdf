import { classifyRef, type Ref } from "@md-to-pdf/markdown";

export type RefState = "open" | "closed" | "merged";
export type RefDetails = { title: string; state: RefState };

const cache = new Map<string, RefDetails | null>();
const pending = new Map<string, Promise<void>>();

async function lookup(ref: Ref): Promise<RefDetails | null> {
  const res = await fetch(ref.api, { headers: ref.provider === "github" ? { Accept: "application/vnd.github+json" } : {} });
  if (!res.ok) return null;
  const json = (await res.json()) as { title?: string; state?: string; pull_request?: { merged_at?: string | null } };
  if (typeof json.title !== "string") return null;
  const state: RefState =
    json.pull_request?.merged_at || json.state === "merged" ? "merged" : json.state === "open" || json.state === "opened" ? "open" : "closed";
  return { title: json.title, state };
}

function fill(anchor: Element, details: RefDetails): void {
  const doc = anchor.ownerDocument;
  const title = doc.createElement("span");
  title.className = "ref-title";
  title.textContent = details.title;
  const state = doc.createElement("span");
  state.className = "ref-state";
  state.dataset.state = details.state;
  state.textContent = details.state[0].toUpperCase() + details.state.slice(1);
  anchor.append(title, state);
  anchor.setAttribute("title", details.title);
}

/**
 * Fills reference cards from the public GitHub and GitLab APIs. Cards whose details are already known are
 * filled now; the rest are fetched in the background and `onUpdate` fires once so the caller can re-render.
 */
export function inlineRefs(html: string, onUpdate: () => void): string {
  if (!html.includes('class="ref"')) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const anchors = [...doc.querySelectorAll("a.ref")];
  if (!anchors.length) return html;
  const started: Promise<void>[] = [];
  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") ?? "";
    if (cache.has(href)) {
      const details = cache.get(href);
      if (details) fill(anchor, details);
      continue;
    }
    if (pending.has(href)) continue;
    const ref = classifyRef(href);
    if (!ref) continue;
    const job = lookup(ref)
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

export function resetRefCache(): void {
  cache.clear();
  pending.clear();
}
