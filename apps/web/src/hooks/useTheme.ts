import { useEffect, useState } from "react";
import { loadPrefs, savePrefs, type Theme } from "@/lib/storage";

function suppressTransitions() {
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  document.body.offsetHeight;
  requestAnimationFrame(() => style.remove());
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => loadPrefs().theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    savePrefs({ theme });
  }, [theme]);

  function toggle() {
    suppressTransitions();
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return { theme, toggle };
}
