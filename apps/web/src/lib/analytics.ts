declare global {
  interface Window {
    kobbe?: { track: (event: string, properties?: Record<string, string | number | boolean>) => void };
  }
}

/**
 * The one event this app records, from wherever a save starts: the button and the keyboard shortcut both
 * land here, so a save is counted once either way. Pageviews are the tracker's own doing.
 */
export function trackSave(): void {
  window.kobbe?.track("PDF saved");
}
