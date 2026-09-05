const INLINE = /[*_`~[\]()!#>]/g;

function stripFences(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, "");
}

export function titleFrom(markdown: string): string {
  const lines = stripFences(markdown).split("\n");
  for (let i = 0; i < lines.length; i++) {
    const atx = lines[i].match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (atx) return atx[1].replace(INLINE, "").trim();
    const next = lines[i + 1] ?? "";
    if (lines[i].trim() && /^\s{0,3}(=+|-+)\s*$/.test(next)) {
      return lines[i].replace(INLINE, "").trim();
    }
  }
  return "";
}

export function filenameFrom(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "document"}.pdf`;
}

export function wordCount(markdown: string): number {
  const words = stripFences(markdown).replace(INLINE, " ").match(/\S+/g);
  return words ? words.filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0;
}
