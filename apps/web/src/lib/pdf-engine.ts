import type { PdfEngine } from "@embedpdf/models"
import pdfiumWasmUrl from "@embedpdf/pdfium/pdfium.wasm?url"

// The engine loads this inside a blob: URL worker, where a root-relative path
// (what the ?url import gives us) can't be resolved, so make it absolute.
const PDFIUM_WASM_URL = new URL(pdfiumWasmUrl, import.meta.url).href

let sharedEnginePromise: Promise<PdfEngine> | null = null

export function loadSharedPdfEngine() {
  sharedEnginePromise ??= import("@embedpdf/engines/pdfium-worker-engine").then(
    ({ createPdfiumEngine }) => createPdfiumEngine(PDFIUM_WASM_URL, {})
  )

  return sharedEnginePromise
}
