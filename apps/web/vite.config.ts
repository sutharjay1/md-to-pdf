import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "copy-prose-css",
      closeBundle() {
        mkdirSync("dist", { recursive: true });
        copyFileSync(require.resolve("@md-to-pdf/markdown/prose.css"), "dist/prose.css");
      },
    },
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    target: "es2022",
    rollupOptions: {
      output: { manualChunks: { highlight: ["highlight.js/lib/core"] } },
    },
  },
});
