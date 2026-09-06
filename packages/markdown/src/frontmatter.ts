import { escapeHtml } from "./highlight";

const BLOCK = /^﻿?(?:[ \t]*\r?\n)*---[ \t]*\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;
const URL = /^https?:\/\/\S+$/i;

export type FrontMatterField = { key: string; value: string; list?: string[] };
export type FrontMatter = { fields: FrontMatterField[]; body: string };

function unquote(value: string): string {
  const v = value.trim();
  return /^(['"]).*\1$/.test(v) ? v.slice(1, -1) : v;
}

/** Splits a leading YAML block off the document. Scalars and simple lists only; anything deeper is kept as text. */
export function splitFrontMatter(markdown: string): FrontMatter {
  const match = BLOCK.exec(markdown);
  if (!match) return { fields: [], body: markdown };
  const fields: FrontMatterField[] = [];
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    const last = fields[fields.length - 1];
    if (item && last) {
      last.list = [...(last.list ?? []), unquote(item[1])];
      last.value = last.list.join(", ");
      continue;
    }
    const pair = /^([\w.-]+)\s*:\s*(.*)$/.exec(line);
    if (pair) {
      const raw = unquote(pair[2]);
      if (/^\[.*\]$/.test(raw)) {
        const list = raw.slice(1, -1).split(",").map(unquote).filter(Boolean);
        fields.push({ key: pair[1], value: list.join(", "), list });
      } else {
        fields.push({ key: pair[1], value: raw });
      }
    } else if (last) {
      last.value = `${last.value} ${line.trim()}`.trim();
    }
  }
  return { fields, body: markdown.slice(match[0].length) };
}

function valueHtml(field: FrontMatterField): string {
  if (field.list) return field.list.map((item) => `<span class="fm-tag">${escapeHtml(item)}</span>`).join("");
  if (URL.test(field.value)) return `<a href="${escapeHtml(field.value)}" target="_blank" rel="noopener">${escapeHtml(field.value)}</a>`;
  return escapeHtml(field.value);
}

/** A properties panel: one row per key, no table lines. */
export function frontMatterHtml(fields: FrontMatterField[]): string {
  if (!fields.length) return "";
  const rows = fields.map((f) => `<div class="fm-row"><dt>${escapeHtml(f.key)}</dt><dd>${valueHtml(f)}</dd></div>`).join("");
  return `<dl class="frontmatter">${rows}</dl>\n`;
}
