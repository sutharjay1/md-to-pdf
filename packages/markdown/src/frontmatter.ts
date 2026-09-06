import { escapeHtml } from "./highlight";

const BLOCK = /^\uFEFF?(?:[ \t]*\r?\n)*---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;

export type FrontMatter = { fields: [string, string][]; body: string };

function unquote(value: string): string {
  const v = value.trim();
  return /^(['"]).*\1$/.test(v) ? v.slice(1, -1) : v;
}

/** Splits a leading YAML block off the document. Scalars and simple lists only; anything deeper is kept as text. */
export function splitFrontMatter(markdown: string): FrontMatter {
  const match = BLOCK.exec(markdown);
  if (!match) return { fields: [], body: markdown };
  const fields: [string, string][] = [];
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    const last = fields[fields.length - 1];
    if (item && last) {
      last[1] = last[1] ? `${last[1]}, ${unquote(item[1])}` : unquote(item[1]);
      continue;
    }
    const pair = /^([\w.-]+)\s*:\s*(.*)$/.exec(line);
    if (pair) {
      let value = unquote(pair[2]);
      if (/^\[.*\]$/.test(value)) value = value.slice(1, -1).split(",").map(unquote).filter(Boolean).join(", ");
      fields.push([pair[1], value]);
    } else if (last) {
      last[1] = `${last[1]} ${line.trim()}`.trim();
    }
  }
  return { fields, body: markdown.slice(match[0].length) };
}

export function frontMatterHtml(fields: [string, string][]): string {
  if (!fields.length) return "";
  const rows = fields.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join("");
  return `<table class="frontmatter"><tbody>${rows}</tbody></table>\n`;
}
