import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { loadPrefs } from "@/lib/storage";
import "@md-to-pdf/ui/styles/globals.css";
import "@md-to-pdf/markdown/prose.css";

document.documentElement.classList.toggle("dark", loadPrefs().theme === "dark");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
