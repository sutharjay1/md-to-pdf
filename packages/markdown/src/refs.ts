import { escapeHtml } from "./highlight";

export type Ref = {
  provider: "github" | "gitlab";
  kind: "issue" | "pr" | "mr";
  path: string;
  number: number;
  api: string;
};

const GITHUB = /^https?:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/(issues|pull)\/(\d+)(?:[/?#].*)?$/i;
const GITLAB = /^https?:\/\/gitlab\.com\/((?:[\w.-]+\/)+?[\w.-]+)\/(?:-\/)?(issues|merge_requests)\/(\d+)(?:[/?#].*)?$/i;

export function classifyRef(url: string): Ref | null {
  const gh = GITHUB.exec(url);
  if (gh) {
    const number = Number(gh[3]);
    return { provider: "github", kind: gh[2] === "pull" ? "pr" : "issue", path: gh[1], number, api: `https://api.github.com/repos/${gh[1]}/issues/${number}` };
  }
  const gl = GITLAB.exec(url);
  if (gl) {
    const number = Number(gl[3]);
    const resource = gl[2] === "merge_requests" ? "merge_requests" : "issues";
    return { provider: "gitlab", kind: resource === "issues" ? "issue" : "mr", path: gl[1], number, api: `https://gitlab.com/api/v4/projects/${encodeURIComponent(gl[1])}/${resource}/${number}` };
  }
  return null;
}

export function refLabel(ref: Ref): string {
  return `${ref.path}${ref.kind === "mr" ? "!" : "#"}${ref.number}`;
}

export function refKindLabel(ref: Ref): string {
  return ref.kind === "issue" ? "Issue" : ref.kind === "pr" ? "Pull request" : "Merge request";
}

/** The card as the renderer emits it: the source line and the kind. The browser adds the state, title, author and date once the API answers. */
export function refHtml(ref: Ref, href: string): string {
  const provider = ref.provider === "github" ? "GitHub" : "GitLab";
  return (
    `<a class="ref" data-provider="${ref.provider}" data-kind="${ref.kind}" href="${escapeHtml(href)}" target="_blank" rel="noopener">` +
    `<span class="ref-head"><span class="ref-source"><span class="ref-provider">${provider}</span><span class="ref-repo">${escapeHtml(refLabel(ref))}</span></span></span>` +
    `<span class="ref-meta"><span class="ref-kind">${refKindLabel(ref)}</span></span></a>`
  );
}
