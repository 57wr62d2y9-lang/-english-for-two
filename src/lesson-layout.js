// The visual viewport shrinks with an on-screen keyboard even when a WebView
// keeps innerHeight or Telegram's stable viewport at its previous height.
export function lessonViewportHeight(win=globalThis.window) {
  const heights=[win?.innerHeight,win?.visualViewport?.height,win?.Telegram?.WebApp?.viewportStableHeight]
    .filter(h=>Number.isFinite(h)&&h>0);
  return heights.length?Math.floor(Math.min(...heights)):680;
}
