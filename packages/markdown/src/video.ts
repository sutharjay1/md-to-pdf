import type { MarkedExtension } from "marked";
import { escapeHtml } from "./highlight";

type Video = { kind: "file" } | { kind: "youtube"; id: string } | { kind: "vimeo"; id: string };

const FILE = /\.(mp4|webm|mov|m4v)$/i;
const YT_ID = /^[\w-]{11}$/;

export function classifyVideo(url: string): Video | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (FILE.test(u.pathname)) return { kind: "file" };
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    return YT_ID.test(id) ? { kind: "youtube", id } : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})/)?.[1];
    return id && YT_ID.test(id) ? { kind: "youtube", id } : null;
  }
  if (host === "vimeo.com") {
    const id = u.pathname.match(/^\/(\d+)$/)?.[1];
    return id ? { kind: "vimeo", id } : null;
  }
  return null;
}

export function videoHtml(url: string, alt: string): string | null {
  const video = classifyVideo(url);
  if (!video) return null;
  const href = escapeHtml(url);
  const label = escapeHtml(alt);
  const caption = alt ? `<figcaption>${label}</figcaption>` : "";

  let player: string;
  let placeholder: string;
  switch (video.kind) {
    case "youtube":
      player = `<iframe src="https://www.youtube-nocookie.com/embed/${video.id}" title="${label}" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
      placeholder = `<a class="video-placeholder" href="${href}"><img src="https://img.youtube.com/vi/${video.id}/hqdefault.jpg" alt="${label}"><span class="video-play">▶</span></a>`;
      break;
    case "vimeo":
      player = `<iframe src="https://player.vimeo.com/video/${video.id}" title="${label}" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
      placeholder = `<a class="video-placeholder" href="${href}"><span class="video-play">▶</span><span class="video-url">${href}</span></a>`;
      break;
    case "file":
      player = `<video controls preload="metadata" src="${href}"></video>`;
      placeholder = `<a class="video-placeholder" href="${href}"><span class="video-play">▶</span><span class="video-url">${href}</span></a>`;
      break;
  }
  return `<figure class="video" data-video="${video.kind}">${player}${placeholder}${caption}</figure>`;
}

export const videoExtension: MarkedExtension = {
  renderer: {
    image({ href, text }) {
      return videoHtml(href, text) ?? false;
    },
  },
};
