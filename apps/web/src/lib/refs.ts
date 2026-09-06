import { classifyRef, type Ref } from "@md-to-pdf/markdown";

export type RefState = "open" | "closed" | "merged" | "draft";
export type RefDetails = { title: string; state: RefState; author?: string; createdAt?: string; comments?: number };

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
  comments?: number;
  user_notes_count?: number;
};

async function lookup(ref: Ref): Promise<RefDetails | null> {
  const res = await fetch(ref.api, { headers: ref.provider === "github" ? { Accept: "application/vnd.github+json" } : {} });
  if (!res.ok) return null;
  const json = (await res.json()) as Payload;
  if (typeof json.title !== "string") return null;
  const open = json.state === "open" || json.state === "opened";
  const state: RefState =
    json.pull_request?.merged_at || json.state === "merged" ? "merged" : open && json.draft ? "draft" : open ? "open" : "closed";
  return {
    title: json.title,
    state,
    author: json.user?.login ?? json.author?.username,
    createdAt: json.created_at,
    comments: json.comments ?? json.user_notes_count,
  };
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fill(anchor: Element, details: RefDetails): void {
  const doc = anchor.ownerDocument;
  const span = (className: string, text: string) => {
    const el = doc.createElement("span");
    el.className = className;
    el.textContent = text;
    return el;
  };
  const main = span("ref-main", "");
  main.append(span("ref-title", details.title));
  anchor.prepend(main);
  anchor.setAttribute("title", details.title);
  const head = anchor.querySelector(".ref-head");
  if (!head) return;
  const side = span("ref-side", "");
  if (details.author) side.append(span("ref-author", details.author));
  const date = details.createdAt ? formatDate(details.createdAt) : "";
  if (date) side.append(span("ref-date", date));
  if (typeof details.comments === "number" && details.comments > 0) {
    side.append(span("ref-comments", `${details.comments} ${details.comments === 1 ? "comment" : "comments"}`));
  }
  const state = span("ref-state", details.state[0].toUpperCase() + details.state.slice(1));
  state.dataset.state = details.state;
  const end = span("ref-end", "");
  if (side.childElementCount) end.append(side);
  end.append(state);
  head.append(end);
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
