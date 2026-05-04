import { yt, pill } from '../../framework/styles';
import { findActionRow, warnOnceMiss } from './selectors';
import { addWLId, removeWLId, getWLIds } from '../../shared/wl-store';
import { addToWatchLater, removeFromWatchLater } from '../../shared/yt-action';

const BUTTON_ID = 'redline-watch-later-button';
const BUTTON_LABEL = 'Watch Later';

export const watchPageStyles = `
  #${BUTTON_ID}:hover:not(:disabled) {
    background: ${yt.chipBgHover};
  }
  #${BUTTON_ID}:disabled {
    opacity: 0.5;
    cursor: default;
  }`;

export function removeInjectedButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
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

function buildButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.type = 'button';
  btn.textContent = BUTTON_LABEL;
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
  } satisfies Partial<CSSStyleDeclaration>);

  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (btn.disabled) return;
    btn.disabled = true;
    toggleWatchLater().finally(() => {
      btn.disabled = false;
    });
  });
  return btn;
}

async function toggleWatchLater(): Promise<void> {
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

  if (isInWL) {
    await removeWLId(videoId);
  } else {
    await addWLId(videoId);
  }
}
