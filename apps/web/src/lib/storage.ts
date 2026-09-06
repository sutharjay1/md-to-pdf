export type Page = "A4" | "Letter";
export type Theme = "light" | "dark";
/** How bare links render: a card, or the URL as written. */
export type LinkStyle = "card" | "link";
export type Prefs = { theme: Theme; page: Page; refs: LinkStyle; links: LinkStyle; syncScroll: boolean };

const KEYS = { doc: "md2pdf:doc", theme: "md2pdf:theme", page: "md2pdf:page", refs: "md2pdf:refs", links: "md2pdf:links", syncScroll: "md2pdf:sync-scroll" } as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable; the session keeps working in memory
  }
}

export function loadDoc(): string | null {
  return read(KEYS.doc);
}

export function saveDoc(doc: string): void {
  write(KEYS.doc, doc);
}

export function loadPrefs(): Prefs {
  const theme = read(KEYS.theme);
  const page = read(KEYS.page);
  return {
    theme: theme === "dark" ? "dark" : "light",
    page: page === "Letter" ? "Letter" : "A4",
    refs: read(KEYS.refs) === "link" ? "link" : "card",
    links: read(KEYS.links) === "card" ? "card" : "link",
    syncScroll: read(KEYS.syncScroll) !== "off",
  };
}

export function savePrefs(prefs: Partial<Prefs>): void {
  if (prefs.theme) write(KEYS.theme, prefs.theme);
  if (prefs.page) write(KEYS.page, prefs.page);
  if (prefs.refs) write(KEYS.refs, prefs.refs);
  if (prefs.links) write(KEYS.links, prefs.links);
  if (prefs.syncScroll !== undefined) write(KEYS.syncScroll, prefs.syncScroll ? "on" : "off");
}
