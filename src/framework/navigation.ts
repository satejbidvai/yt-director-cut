type NavHandler = (url: URL) => void;

const handlers = new Set<NavHandler>();
let attached = false;

function ensureAttached(): void {
  if (attached) return;
  attached = true;
  document.addEventListener("yt-navigate-finish", () => {
    const url = new URL(location.href);
    for (const h of handlers) {
      try {
        h(url);
      } catch (err) {
        console.warn("[productive-yt] navigation handler threw:", err);
      }
    }
  });
}

export function subscribe(handler: NavHandler): void {
  ensureAttached();
  handlers.add(handler);
}

export function unsubscribe(handler: NavHandler): void {
  handlers.delete(handler);
}
