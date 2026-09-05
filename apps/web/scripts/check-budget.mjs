import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const LIMIT = 150 * 1024;
const dir = path.resolve("dist/assets");
const html = readFileSync(path.resolve("dist/index.html"), "utf8");
const initial = [...html.matchAll(/src="\/assets\/([^"]+\.js)"/g)].map((m) => m[1]);
const preloaded = [...html.matchAll(/rel="modulepreload"[^>]*href="\/assets\/([^"]+\.js)"/g)].map((m) => m[1]);
const files = new Set([...initial, ...preloaded]);

let total = 0;
for (const f of files) {
  const size = gzipSync(readFileSync(path.join(dir, f))).length;
  total += size;
  console.log(`${f}  ${(size / 1024).toFixed(1)} KB gz`);
}
const lazy = readdirSync(dir).filter((f) => f.endsWith(".js") && !files.has(f));
console.log(`lazy chunks: ${lazy.join(", ") || "none"}`);
console.log(`initial JS: ${(total / 1024).toFixed(1)} KB gz (limit ${LIMIT / 1024} KB)`);
if (total > LIMIT) {
  console.error("Budget exceeded");
  process.exit(1);
}
statSync(path.resolve("dist/prose.css"));
