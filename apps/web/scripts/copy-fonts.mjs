import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const out = path.resolve("public/fonts");
mkdirSync(out, { recursive: true });

const fonts = {
  "inter.woff2": "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  "geist-mono.woff2": "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2",
};
for (const [name, spec] of Object.entries(fonts)) {
  copyFileSync(require.resolve(spec), path.join(out, name));
}
