import { yt, pill } from '../../framework/styles';
import { findActionRow, warnOnceMiss } from './selectors';
import { addWLId, removeWLId, getWLIds, onWLChange } from '../../shared/wl-store';
import { addToWatchLater, removeFromWatchLater } from '../../shared/yt-action';

const BUTTON_ID = 'redline-watch-later-button';
const BUTTON_LABEL = 'Later';

// Copied from YouTube's Save button DOM — outline (not saved) and filled (saved).
// margin-left:-6px matches YouTube's icon inset; margin-right:6px is the icon–text gap.
const ICON_STYLE = 'pointer-events:none;display:block;flex-shrink:0;margin-left:-6px;margin-right:6px';
const BOOKMARK_OUTLINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor" aria-hidden="true" style="${ICON_STYLE}"><path d="M19 2H5a2 2 0 00-2 2v16.887c0 1.266 1.382 2.048 2.469 1.399L12 18.366l6.531 3.919c1.087.652 2.469-.131 2.469-1.397V4a2 2 0 00-2-2ZM5 20.233V4h14v16.233l-6.485-3.89-.515-.309-.515.309L5 20.233Z"></path></svg>`;
const BOOKMARK_FILLED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor" aria-hidden="true" style="${ICON_STYLE}"><path d="M19 2H5a2 2 0 00-2 2v16.887c0 1.266 1.382 2.048 2.469 1.399L12 18.366l6.531 3.919c1.087.652 2.469-.131 2.469-1.397V4a2 2 0 00-2-2Z"></path></svg>`;

export const watchPageStyles = `
  #${BUTTON_ID}:hover:not(:disabled) {
    background: ${yt.chipBgHover};
  }`;

let unsubWLChange: (() => void) | null = null;

export function removeInjectedButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
  unsubWLChange?.();
  unsubWLChange = null;
}

export async function injectButton(isCancelled: () => boolean): Promise<void> {
  // YouTube's Polymer re-stamps the action-row children multiple times during
  // SPA navigations.  We wait for #flexible-item-buttons to (a) exist with
  // children and (b) stop mutating for 300ms before injecting.
  const flexContainer = await waitForStableFlexContainer();
  if (!flexContainer) {
    warnOnceMiss("action-row", "flexible-item-buttons did not stabilise within timeout");
    return;
  }

  if (isCancelled()) return;
  if (document.getElementById(BUTTON_ID)) return;
  const btn = buildButton();
  flexContainer.appendChild(btn);

  // When Save is collapsed into the overflow menu, YouTube leaves an empty
  // (hidden) container element that still occupies flex gap space, creating a
  // visible gap before our button.  Collapse that gap by removing our margin
  // when the preceding sibling is not user-visible.
  const prev = btn.previousElementSibling as HTMLElement | null;
  if (prev && prev.offsetHeight === 0) {
    btn.style.marginLeft = '0';
  }

  // Set initial icon state based on cached WL IDs.
  const videoId = new URL(location.href).searchParams.get('v');
  if (videoId) {
    const ids = await getWLIds();
    updateIcon(btn, ids.includes(videoId));
  }

  // Keep icon in sync with external WL changes (other tabs, other modules).
  unsubWLChange = onWLChange((ids) => {
    const el = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
    if (!el) return;
    const vid = new URL(location.href).searchParams.get('v');
    if (vid) updateIcon(el, ids.includes(vid));
  });
}

/**
 * Wait for #flexible-item-buttons to exist, have children, and stop receiving
 * DOM mutations for a debounce window — meaning YouTube is done re-stamping.
 */
function waitForStableFlexContainer(): Promise<Element | null> {
  const DEBOUNCE_MS = 300;
  const TIMEOUT_MS = 6000;

  return new Promise((resolve) => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let observer: MutationObserver | null = null;

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, TIMEOUT_MS);

    function cleanup() {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (observer) observer.disconnect();
      clearTimeout(timeout);
    }

    function tryResolve() {
      const row = findActionRow();
      const fc = row?.querySelector<Element>('#flexible-item-buttons');
      if (fc && fc.children.length > 0) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          cleanup();
          resolve(fc);
        }, DEBOUNCE_MS);
      }
    }

    // Check immediately
    tryResolve();

    // Watch for mutations
    observer = new MutationObserver(() => tryResolve());
    observer.observe(document, { childList: true, subtree: true });
  });
}

function updateIcon(btn: HTMLButtonElement, isSaved: boolean): void {
  const svg = btn.querySelector('svg');
  if (svg) {
    const temp = document.createElement('template');
    temp.innerHTML = isSaved ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG;
    svg.replaceWith(temp.content.firstChild!);
  }
}

function buildButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Toggle Watch Later for this video');
  // Hand-rolled styling that reads as a native YouTube pill in both light and
  // dark themes. We intentionally do NOT clone YouTube's web component (per
  // design open question O1, authoring is more durable than cloning a custom
  // element whose internals churn).
  Object.assign(btn.style, {
    display: "inline-flex",
    alignItems: "center",
    height: pill.height,
    padding: `0 ${pill.paddingX}`,
    marginLeft: "8px",
    border: "none",
    borderRadius: pill.borderRadius,
    background: yt.chipBg,
    color: yt.textPrimary,
    font: pill.font,
    cursor: "pointer",
    whiteSpace: "nowrap",
    verticalAlign: "top",
  } satisfies Partial<CSSStyleDeclaration>);

  btn.innerHTML = `${BOOKMARK_OUTLINE_SVG}<span>${BUTTON_LABEL}</span>`;

  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (btn.disabled) return;
    btn.disabled = true;
    toggleWatchLater(btn).finally(() => {
      btn.disabled = false;
    });
  });
  return btn;
}

async function toggleWatchLater(btn: HTMLButtonElement): Promise<void> {
  const videoId = new URL(location.href).searchParams.get('v');
  if (!videoId) return;

  const ids = await getWLIds();
  const isInWL = ids.includes(videoId);

  const dispatched = isInWL
    ? removeFromWatchLater(videoId)
    : addToWatchLater(videoId);

  if (!dispatched) {
    warnOnceMiss('ytd-app', 'ytd-app element not found — cannot toggle Watch Later');
    return;
  }

  // Optimistic icon flip before the async store write settles.
  updateIcon(btn, !isInWL);

  if (isInWL) {
    await removeWLId(videoId);
  } else {
    await addWLId(videoId);
  }
}
