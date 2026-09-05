export type Page = "A4" | "Letter";
export type Theme = "light" | "dark";

const KEYS = { doc: "md2pdf:doc", theme: "md2pdf:theme", page: "md2pdf:page" } as const;

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

export function loadPrefs(): { theme: Theme; page: Page } {
  const theme = read(KEYS.theme);
  const page = read(KEYS.page);
  return {
    theme: theme === "dark" ? "dark" : "light",
    page: page === "Letter" ? "Letter" : "A4",
  };
}

export function savePrefs(prefs: Partial<{ theme: Theme; page: Page }>): void {
  if (prefs.theme) write(KEYS.theme, prefs.theme);
  if (prefs.page) write(KEYS.page, prefs.page);
}
