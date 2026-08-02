import { cloneNativeButton } from '../../shared/clone-button';
import { findActionRow, warnOnceMiss } from './selectors';
import { getWLIds, onWLChange } from '../../shared/wl-store';
import { toggleWatchLater } from '../../shared/wl-toggle';

const BUTTON_ID = 'ytdc-watch-later-button';
const BUTTON_LABEL = 'Later';

const ICON_STYLE = 'pointer-events:none;display:inherit;width:100%;height:100%';
const CLOCK_OUTLINE_PATH = 'M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 110 18.001A9 9 0 0112 3Zm0 3a1 1 0 00-1 1v5.565l.485.292 3.33 2a1 1 0 001.03-1.714L13 11.435V7a1 1 0 00-1-1Z';
const CLOCK_FILLED_PATH = 'M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 5a1 1 0 00-1 1v5.565l.485.292 3.33 2a1 1 0 001.03-1.714L13 11.435V7a1 1 0 00-1-1Z';

function clockSvg(pathD: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true" style="${ICON_STYLE}"><path fill-rule="evenodd" d="${pathD}"/></svg>`;
}

// Clone the last standalone pill in the row (typically Save) — avoids identity-specific
// classes that early buttons (e.g. Ask/Chat) carry.
const TEMPLATE_BUTTON_SELECTOR = 'yt-button-view-model:last-of-type';

let unsubWLChange: (() => void) | null = null;

export function removeInjectedButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
  unsubWLChange?.();
  unsubWLChange = null;
}

export async function injectButton(isCancelled: () => boolean): Promise<void> {
  const flexContainer = await waitForStableFlexContainer();
  if (!flexContainer) {
    warnOnceMiss("action-row", "flexible-item-buttons did not stabilise within timeout");
    return;
  }

  if (isCancelled()) return;
  if (document.getElementById(BUTTON_ID)) return;

  const btn = buildClonedButton(flexContainer);
  if (!btn) {
    warnOnceMiss("clone-template", "could not find a native button to clone in action row");
    return;
  }

  flexContainer.appendChild(btn);

  // When Save is collapsed into the overflow menu, YouTube leaves an empty
  // (hidden) container element that still occupies flex gap space, creating a
  // visible gap before our button.  Collapse that gap when the preceding
  // sibling is not user-visible.
  const prev = btn.previousElementSibling as HTMLElement | null;
  if (prev?.offsetHeight === 0) {
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
    const el = document.getElementById(BUTTON_ID);
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

    tryResolve();

    observer = new MutationObserver(() => tryResolve());
    observer.observe(document, { childList: true, subtree: true });
  });
}

/**
 * Clone a native action-row button and replace its icon + label.
 * Returns null if the template cannot be found or its structure is unexpected.
 */
function buildClonedButton(flexContainer: Element): HTMLElement | null {
  const clone = cloneNativeButton(flexContainer, TEMPLATE_BUTTON_SELECTOR);
  if (!clone) return null;

  // Find the inner <button> element for attaching listeners and aria.
  const innerButton = clone.querySelector<HTMLButtonElement>('button');
  if (!innerButton) return null;

  // Find the label text node — match the original text to verify structure.
  const originalLabel = innerButton.textContent?.trim();
  if (!originalLabel) return null;

  const labelNode = findTextNode(innerButton, originalLabel);
  if (!labelNode) return null;

  // Find the icon SVG inside the aria-hidden icon container.
  const iconContainer = innerButton.querySelector<HTMLElement>('[aria-hidden="true"] svg');
  if (!iconContainer) return null;

  // Replace label
  labelNode.textContent = BUTTON_LABEL;

  // Replace icon SVG — the wrapper div provides fill:currentcolor and sizing.
  const temp = document.createElement('template');
  temp.innerHTML = clockSvg(CLOCK_OUTLINE_PATH);
  iconContainer.replaceWith(temp.content.firstChild!);

  // Set our ID and aria-label
  clone.id = BUTTON_ID;
  innerButton.setAttribute('aria-label', 'Toggle Watch Later for this video');
  innerButton.removeAttribute('title');

  // Use aria-disabled for disabled state (matches YouTube's pattern).
  innerButton.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (innerButton.getAttribute('aria-disabled') === 'true') return;
    innerButton.setAttribute('aria-disabled', 'true');
    handleToggleClick(clone).finally(() => {
      innerButton.setAttribute('aria-disabled', 'false');
    });
  });

  return clone;
}

function findTextNode(root: HTMLElement, expectedText: string): Text | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent?.trim() === expectedText) {
      return node;
    }
  }
  return null;
}

function updateIcon(element: HTMLElement, isSaved: boolean): void {
  const svg = element.querySelector('svg');
  if (!svg) return;
  const path = svg.querySelector('path');
  if (path) {
    path.setAttribute('d', isSaved ? CLOCK_FILLED_PATH : CLOCK_OUTLINE_PATH);
  }
}

async function handleToggleClick(element: HTMLElement): Promise<void> {
  const videoId = new URL(location.href).searchParams.get('v');
  if (!videoId) return;

  const ok = await toggleWatchLater(videoId, (saved) => {
    updateIcon(element, saved);
  });

  if (!ok) {
    warnOnceMiss('ytd-app', 'ytd-app element not found — cannot toggle Watch Later');
  }
}
