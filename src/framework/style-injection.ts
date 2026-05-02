const STYLE_CLASS = "redline-styles";

/**
 * Inject a CSS block into `<head>` via its own `<style>` element.
 * Returns a dispose function that removes the element.
 */
export function injectStyles(css: string): () => void {
  const el = document.createElement("style");
  el.className = STYLE_CLASS;
  el.textContent = css;
  document.head.appendChild(el);

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    if (el.isConnected) el.remove();
  };
}
