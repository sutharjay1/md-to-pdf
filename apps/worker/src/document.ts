export function buildPrintDocument(fragment: string, css: string, fonts: { inter: string; mono: string }): string {
  const fontFaces = `
@font-face{font-family:"Inter";src:url(data:font/woff2;base64,${fonts.inter}) format("woff2");font-weight:100 900}
@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${fonts.mono}) format("woff2");font-weight:100 900}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${fontFaces}\n${css}</style></head><body class="doc">${fragment}</body></html>`;
}
