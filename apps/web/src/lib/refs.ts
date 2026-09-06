import { classifyRef, type Ref } from "@md-to-pdf/markdown";

export type RefState = "open" | "closed" | "merged" | "draft";
export type RefDetails = { title: string; state: RefState; author?: string; createdAt?: string };

const cache = new Map<string, RefDetails | null>();
const pending = new Map<string, Promise<void>>();

type Payload = {
  title?: string;
  state?: string;
  pull_request?: { merged_at?: string | null };
  draft?: boolean;
  user?: { login?: string };
  author?: { username?: string };
  created_at?: string;
};

async function lookup(ref: Ref): Promise<RefDetails | null> {
  const res = await fetch(ref.api, { headers: ref.provider === "github" ? { Accept: "application/vnd.github+json" } : {} });
  if (!res.ok) return null;
  const json = (await res.json()) as Payload;
  if (typeof json.title !== "string") return null;
  const open = json.state === "open" || json.state === "opened";
  const state: RefState =
    json.pull_request?.merged_at || json.state === "merged" ? "merged" : open && json.draft ? "draft" : open ? "open" : "closed";
  return { title: json.title, state, author: json.user?.login ?? json.author?.username, createdAt: json.created_at };
}

function formatMoment(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${time}`;
}

function fill(anchor: Element, details: RefDetails): void {
  const doc = anchor.ownerDocument;
  const span = (className: string, text: string) => {
    const el = doc.createElement("span");
    el.className = className;
    el.textContent = text;
    return el;
  };
  anchor.prepend(span("ref-title", details.title));
  anchor.setAttribute("title", details.title);
  const head = anchor.querySelector(".ref-head");
  const source = anchor.querySelector(".ref-source");
  if (!head || !source) return;
  if (details.author) source.append(span("ref-author", details.author));
  const moment = details.createdAt ? formatMoment(details.createdAt) : "";
  if (moment) source.append(span("ref-date", moment));
  const state = span("ref-state", details.state[0].toUpperCase() + details.state.slice(1));
  state.dataset.state = details.state;
  head.append(state);
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
