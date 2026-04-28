import type { FeatureModule } from '../../framework/types';
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
  warnOnceMiss,
} from './selectors';
import { waitFor, waitForGone } from './dom-utils';

const BUTTON_ID = 'productive-yt-watch-later-button';
const BUTTON_LABEL = 'Watch Later';

export const watchLaterToggleModule: FeatureModule = {
  id: 'watch-later-toggle',
  name: 'Watch Later toggle',
  description:
    'Adds a one-click button next to the native Save button that toggles the current video in your Watch Later playlist.',
  enable(ctx) {
    let cancelled = false;

    const handleNavigation = (url: URL) => {
      removeInjectedButton();
      if (cancelled) return;
      if (url.pathname !== '/watch') return;
      // Defer so YouTube's Polymer components finish rendering after
      // yt-navigate-finish fires.
      requestAnimationFrame(() => {
        if (!cancelled) void injectButton();
      });
    };

    ctx.onNavigate(handleNavigation);

    return () => {
      cancelled = true;
      removeInjectedButton();
    };
  }
};

function removeInjectedButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
}

async function injectButton(): Promise<void> {
  let actionRow: Element;
  try {
    actionRow = await waitFor<Element>(document, () => findActionRow(), 5000);
  } catch {
    warnOnceMiss("action-row", "not found within timeout");
    return;
  }

  if (document.getElementById(BUTTON_ID)) return;

  const button = buildButton();

  // Append inside #flexible-item-buttons so our pill sits inline with the
  // other action buttons (Ask, Download, etc.) and inherits the same spacing.
  const flexContainer = actionRow.querySelector<Element>('#flexible-item-buttons');
  if (flexContainer) {
    flexContainer.appendChild(button);
  } else {
    actionRow.appendChild(button);
  }
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
    height: "36px",
    padding: "0 16px",
    marginLeft: "8px",
    border: "none",
    borderRadius: "18px",
    background: "var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1))",
    color: "var(--yt-spec-text-primary, inherit)",
    font: "500 14px/36px Roboto, Arial, sans-serif",
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
async function toggleWatchLater(): Promise<void> {
  const actionRow = findActionRow();

  // Path A: Save is a visible pill button in the action row.
  const saveButton =
    (actionRow ? findNativeSaveButton(actionRow) : null) ??
    findNativeSaveButton(document.querySelector('ytd-watch-metadata') ?? document);

  // Path B: Save is collapsed into the three-dot overflow menu.
  if (!saveButton) {
    const opened = await openSaveViaOverflow(actionRow);
    if (!opened) return;
  }

  const popupContainer = document.querySelector<HTMLElement>('ytd-popup-container');
  const previousVisibility = popupContainer?.style.visibility ?? '';
  if (popupContainer) popupContainer.style.visibility = 'hidden';

  try {
    // If we found the pill, click it now (overflow path already clicked).
    if (saveButton) saveButton.click();

    let panel: HTMLElement;
    try {
      panel = await waitFor<HTMLElement>(
        (popupContainer ?? document) as ParentNode,
        () => findAddToPlaylistPanel(),
        4000
      );
    } catch {
      warnOnceMiss("popup-panel", "playlist panel did not appear after Save click");
      return;
    }

    const watchLaterRow = findWatchLaterRow(panel);
    if (!watchLaterRow) {
      warnOnceMiss("watch-later-row", "no row with aria-label^=Watch later in panel");
      return;
    }

    const checkbox = findCheckboxInRow(watchLaterRow) ?? watchLaterRow;
    checkbox.click();

    await new Promise((r) => setTimeout(r, 120));

    const closeBtn = findPanelCloseButton(panel);
    if (closeBtn) {
      closeBtn.click();
    } else {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }

    await waitForGone(document, () => findAddToPlaylistPanel(), 1500);
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
