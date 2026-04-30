const STYLE_ID = "redline-styles";

let styleEl: HTMLStyleElement | null = null;
let refCount = 0;

function getStyleElement(): HTMLStyleElement {
  if (styleEl?.isConnected) return styleEl;
  styleEl = document.createElement("style");
  styleEl.id = STYLE_ID;
  document.head.appendChild(styleEl);
  return styleEl;
}

/**
 * Append a CSS block to the shared extension `<style>` element.
 * Returns a dispose function that removes the block and cleans up the element
 * when no consumers remain.
 */
export function injectStyles(css: string): () => void {
  const el = getStyleElement();
  el.textContent += css;
  refCount++;

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    el.textContent = (el.textContent ?? "").replace(css, "");
    if (--refCount === 0) {
      el.remove();
      styleEl = null;
    }
  };
}
