import { useEffect, useRef, useState } from "react";
import { loadDoc, saveDoc } from "@/lib/storage";
import welcome from "@/welcome.md?raw";

export function useDocument() {
  const [doc, setDoc] = useState(() => loadDoc() ?? welcome);
  const latest = useRef(doc);
  latest.current = doc;

  useEffect(() => {
    const timer = setTimeout(() => saveDoc(doc), 300);
    return () => clearTimeout(timer);
  }, [doc]);

  useEffect(() => {
    const flush = () => saveDoc(latest.current);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  return { doc, setDoc };
}
