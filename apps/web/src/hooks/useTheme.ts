import { useState } from "react";
import { loadPrefs, savePrefs, type Theme } from "@/lib/storage";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => loadPrefs().theme);

  function toggle() {
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(style);
    document.body.offsetHeight;

    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    savePrefs({ theme: next });
    setTheme(next);

    requestAnimationFrame(() => style.remove());
  }

  return { theme, toggle };
}
