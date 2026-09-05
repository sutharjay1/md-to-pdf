type Hljs = typeof import("highlight.js/lib/core").default;

const ALIASES: Record<string, string> = {
  ts: "typescript", js: "javascript", sh: "bash", shell: "bash", zsh: "bash",
  yml: "yaml", py: "python", rs: "rust", html: "xml", md: "markdown",
};

let instance: Promise<Hljs> | null = null;

async function load(): Promise<Hljs> {
  const [{ default: hljs }, ...langs] = await Promise.all([
    import("highlight.js/lib/core"),
    import("highlight.js/lib/languages/typescript"),
    import("highlight.js/lib/languages/javascript"),
    import("highlight.js/lib/languages/json"),
    import("highlight.js/lib/languages/bash"),
    import("highlight.js/lib/languages/python"),
    import("highlight.js/lib/languages/go"),
    import("highlight.js/lib/languages/rust"),
    import("highlight.js/lib/languages/css"),
    import("highlight.js/lib/languages/xml"),
    import("highlight.js/lib/languages/markdown"),
    import("highlight.js/lib/languages/yaml"),
    import("highlight.js/lib/languages/sql"),
    import("highlight.js/lib/languages/diff"),
  ]);
  const names = ["typescript", "javascript", "json", "bash", "python", "go", "rust", "css", "xml", "markdown", "yaml", "sql", "diff"];
  names.forEach((name, i) => hljs.registerLanguage(name, langs[i].default));
  return hljs;
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  instance ??= load();
  const hljs = await instance;
  const language = ALIASES[lang] ?? lang;
  if (!hljs.getLanguage(language)) return escapeHtml(code);
  return hljs.highlight(code, { language }).value;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
