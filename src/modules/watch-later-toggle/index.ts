import type { FeatureModule } from '../../framework/types';
import { yt, pill } from '../../framework/styles';
import { injectStyles } from '../../framework/style-injection';
import {
  findActionRow,
  findAddToPlaylistPanel,
  findCheckboxInRow,
  findNativeSaveButton,
  findOverflowButton,
  findOverflowDropdown,
  findOverflowSaveItem,
  findPanelCloseButton,
  findWatchLaterRow,
  POPUP_CONTAINER,
  warnOnceMiss,
} from './selectors';
import { waitFor } from './dom-utils';
import { addWLId, removeWLId, getWLIds } from '../../shared/wl-store';

const BUTTON_ID = 'redline-watch-later-button';
const BUTTON_LABEL = 'Watch Later';

export const watchLaterToggleModule: FeatureModule = {
  id: 'watch-later-toggle',
  name: 'Watch Later',
  description: 'Save videos with one click',
  enable(ctx) {
    let cancelled = false;

    const disposeStyles = injectStyles(`
      #${BUTTON_ID}:hover:not(:disabled) {
        background: ${yt.chipBgHover};
      }
      #${BUTTON_ID}:disabled {
        opacity: 0.5;
        cursor: default;
      }
    `);

    const handleNavigation = (url: URL) => {
      removeInjectedButton();
      if (cancelled) return;
      if (url.pathname !== '/watch') return;
      void injectButton(() => cancelled);
    };

    ctx.onNavigate(handleNavigation);

    return () => {
      cancelled = true;
      removeInjectedButton();
      disposeStyles();
    };
  }
};

function removeInjectedButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
}

async function injectButton(isCancelled: () => boolean): Promise<void> {
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
    btn.disabled = true;
    toggleWatchLater().finally(() => {
      btn.disabled = false;
    });
  });
  return btn;
}

/**
 * Toggle the current video's membership in the user's Watch Later playlist by
 * driving YouTube's own UI:
 *   1. Click the native Save button (pill or overflow menu item).
 *   2. Wait for the playlist panel.
 *   3. Click the "Watch later" row.
 *   4. Dismiss the panel.
 *
 * The panel is masked with `visibility: hidden` for the duration of the
 * sequence; the `finally` block always restores visibility, so a mid-sequence
 * miss can never strand the panel.
 */
/**
 * Click the Save button (pill or overflow) and wait for the playlist panel
 * to become layout-ready. Returns the panel element or null on miss.
 */
async function openPlaylistPanel(actionRow: Element | null): Promise<HTMLElement | null> {
  const saveButton =
    (actionRow ? findNativeSaveButton(actionRow) : null) ??
    findNativeSaveButton(document.querySelector('ytd-watch-metadata') ?? document);

  if (saveButton) {
    saveButton.click();
  } else {
    const opened = await openSaveViaOverflow(actionRow);
    if (!opened) return null;
  }

  // Poll until the panel is layout-ready (offsetHeight > 0).  YouTube
  // reuses the same yt-sheet-view-model element across opens; a stale
  // leftover from a previous close sits in the DOM with offsetHeight === 0
  // (its tp-yt-iron-dropdown parent is display:none).  Polling for a
  // positive offsetHeight guarantees YouTube has fully opened a fresh panel
  // whose playlist state reflects the current truth.
  const panelDeadline = Date.now() + 4000;
  while (Date.now() < panelDeadline) {
    const p = findAddToPlaylistPanel();
    if (p && p.offsetHeight > 0) return p;
    await new Promise(r => setTimeout(r, 100));
  }

  warnOnceMiss("popup-panel", "playlist panel did not appear after Save click");
  return null;
}

/** Sync the WL store after a toggle click. */
function syncWLStore(): void {
  const videoId = new URL(location.href).searchParams.get('v');
  if (!videoId) return;

  void getWLIds().then((ids) => {
    const wasInWL = ids.includes(videoId);
    return wasInWL ? removeWLId(videoId) : addWLId(videoId);
  });
}

async function toggleWatchLater(): Promise<void> {
  const actionRow = findActionRow();

  // Hide the popup container BEFORE any click that would open the playlist
  // panel.  This is critical for the overflow path — without it, the panel
  // flashes visibly between saveItem.click() and the visibility assignment.
  const popupContainer = document.querySelector<HTMLElement>(POPUP_CONTAINER);
  const previousVisibility = popupContainer?.style.visibility ?? '';
  if (popupContainer) popupContainer.style.visibility = 'hidden';

  try {
    const panel = await openPlaylistPanel(actionRow);
    if (!panel) return;

    const watchLaterRow = findWatchLaterRow(panel);
    if (!watchLaterRow) {
      warnOnceMiss("watch-later-row", "no row with aria-label^=Watch later in panel");
      return;
    }

    const checkbox = findCheckboxInRow(watchLaterRow);
    checkbox.click();

    syncWLStore();

    await new Promise((r) => setTimeout(r, 120));

    const closeBtn = findPanelCloseButton(panel);
    if (closeBtn) {
      closeBtn.click();
    } else {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }

  } finally {
    if (popupContainer) popupContainer.style.visibility = previousVisibility;
  }
}

/**
 * Open the three-dot overflow menu and click the "Save" item inside it.
 * Returns `true` if the Save item was successfully clicked, `false` on any miss.
 */
async function openSaveViaOverflow(actionRow: Element | null): Promise<boolean> {
  const overflowBtn = actionRow
    ? findOverflowButton(actionRow)
    : findOverflowButton(document.querySelector('ytd-watch-metadata') ?? document);

  if (!overflowBtn) {
    warnOnceMiss("save-button", "neither pill Save button nor overflow button found");
    return false;
  }

  overflowBtn.click();

  let dropdown: HTMLElement;
  try {
    dropdown = await waitFor<HTMLElement>(document, () => findOverflowDropdown(), 2000);
  } catch {
    warnOnceMiss("overflow-dropdown", "dropdown did not appear after clicking overflow button");
    return false;
  }

  const saveItem = findOverflowSaveItem(dropdown);
  if (!saveItem) {
    // Dismiss the dropdown so it doesn't strand open.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    warnOnceMiss("overflow-save-item", 'no "Save" item found in overflow dropdown');
    return false;
  }

  saveItem.click();
  return true;
}
