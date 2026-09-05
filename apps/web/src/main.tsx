import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import "@md-to-pdf/ui/styles/globals.css";
import "@md-to-pdf/markdown/prose.css";

if (localStorage.getItem("md2pdf:theme") === "dark") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
