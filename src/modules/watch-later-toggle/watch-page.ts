import { yt, pill } from '../../framework/styles';
import { findActionRow, warnOnceMiss } from './selectors';
import { getWLIds, onWLChange } from '../../shared/wl-store';
import { toggleWatchLater } from '../../shared/wl-toggle';

const BUTTON_ID = 'redline-watch-later-button';
const BUTTON_LABEL = 'Later';

// margin-left:-6px matches YouTube's icon inset; margin-right:6px is the icon–text gap.
const ICON_STYLE = 'pointer-events:none;display:block;flex-shrink:0;margin-left:-6px;margin-right:6px';
const CLOCK_OUTLINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor" aria-hidden="true" style="${ICON_STYLE}"><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 110 18.001A9 9 0 0112 3Zm0 3a1 1 0 00-1 1v5.565l.485.292 3.33 2a1 1 0 001.03-1.714L13 11.435V7a1 1 0 00-1-1Z"></path></svg>`;
const CLOCK_FILLED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor" aria-hidden="true" style="${ICON_STYLE}"><path fill-rule="evenodd" d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 5a1 1 0 00-1 1v5.565l.485.292 3.33 2a1 1 0 001.03-1.714L13 11.435V7a1 1 0 00-1-1Z"></path></svg>`;

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
    temp.innerHTML = isSaved ? CLOCK_FILLED_SVG : CLOCK_OUTLINE_SVG;
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

  btn.innerHTML = `${CLOCK_OUTLINE_SVG}<span>${BUTTON_LABEL}</span>`;

  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (btn.disabled) return;
    btn.disabled = true;
    handleToggleClick(btn).finally(() => {
      btn.disabled = false;
    });
  });
  return btn;
}

async function handleToggleClick(btn: HTMLButtonElement): Promise<void> {
  const videoId = new URL(location.href).searchParams.get('v');
  if (!videoId) return;

  const ok = await toggleWatchLater(videoId, (saved) => {
    updateIcon(btn, saved);
  });

  if (!ok) {
    warnOnceMiss('ytd-app', 'ytd-app element not found — cannot toggle Watch Later');
  }
}
