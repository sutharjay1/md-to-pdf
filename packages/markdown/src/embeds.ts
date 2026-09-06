import { escapeHtml } from "./highlight";

/** A bare link the reader asked to see as a card. Anything the page itself says arrives later, from /api/og. */
export function embedHost(url: string): string | null {
  try {
    const { protocol, host } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") return null;
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** The card as the renderer emits it: the link itself. The browser adds the title, description and image once /api/og answers. */
export function embedHtml(href: string): string {
  const host = embedHost(href);
  if (!host) return "";
  return (
    `<a class="embed" data-host="${escapeHtml(host)}" href="${escapeHtml(href)}" target="_blank" rel="noopener">` +
    `<span class="embed-body"><span class="embed-url">${escapeHtml(href)}</span></span></a>`
  );
}
