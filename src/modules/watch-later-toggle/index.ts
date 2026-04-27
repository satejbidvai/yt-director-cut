import type { FeatureModule } from "../../framework/types";
import {
  findActionRow,
  findAddToPlaylistPanel,
  findCheckboxInRow,
  findNativeSaveButton,
  findPanelCloseButton,
  findWatchLaterRow,
} from "./selectors";
import { waitFor, waitForGone } from "./dom-utils";

const BUTTON_ID = "productive-yt-watch-later-button";
const BUTTON_LABEL = "📑 Watch Later";

export const watchLaterToggleModule: FeatureModule = {
  id: "watch-later-toggle",
  name: "Watch Later toggle",
  description:
    "Adds a one-click button next to the native Save button that toggles the current video in your Watch Later playlist.",
  enable(ctx) {
    let cancelled = false;

    const handleNavigation = (url: URL) => {
      removeInjectedButton();
      if (cancelled) return;
      if (url.pathname !== "/watch") return;
      void injectButton();
    };

    ctx.onNavigate(handleNavigation);

    return () => {
      cancelled = true;
      removeInjectedButton();
    };
  },
};

function removeInjectedButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
}

async function injectButton(): Promise<void> {
  let actionRow: Element;
  try {
    actionRow = await waitFor<Element>(document, () => findActionRow(), 5000);
  } catch {
    // Selector miss already warned by findActionRow; render nothing.
    return;
  }

  // Idempotency: another navigation event may have raced ahead and injected.
  if (document.getElementById(BUTTON_ID)) return;

  const button = buildButton();
  // Prefer to land next to the native Save button so the pill sits inline
  // with Like / Dislike / Share / Save. Fall back to the action row itself.
  const nativeSave = findNativeSaveButton();
  const anchor =
    nativeSave?.closest("ytd-button-renderer") ??
    nativeSave?.closest("yt-button-view-model") ??
    nativeSave;

  if (anchor && anchor.parentElement) {
    anchor.parentElement.insertBefore(button, anchor.nextSibling);
  } else {
    actionRow.appendChild(button);
  }
}

function buildButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.type = "button";
  btn.textContent = BUTTON_LABEL;
  btn.setAttribute("aria-label", "Toggle Watch Later for this video");
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
    font: "500 14px/36px 'YouTube Sans','Roboto',sans-serif",
    cursor: "pointer",
    whiteSpace: "nowrap",
  } satisfies Partial<CSSStyleDeclaration>);

  btn.addEventListener("click", (ev) => {
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
 *   1. Click the native Save button.
 *   2. Wait for the playlist panel.
 *   3. Click the "Watch later" row.
 *   4. Dismiss the panel.
 *
 * The panel is masked with `visibility: hidden` for the duration of the
 * sequence; the `finally` block always restores visibility, so a mid-sequence
 * miss can never strand the panel.
 */
async function toggleWatchLater(): Promise<void> {
  const saveButton = findNativeSaveButton();
  if (!saveButton) return;

  const popupContainer = document.querySelector<HTMLElement>("ytd-popup-container");
  const previousVisibility = popupContainer?.style.visibility ?? "";
  if (popupContainer) popupContainer.style.visibility = "hidden";

  try {
    saveButton.click();

    let panel: HTMLElement;
    try {
      panel = await waitFor<HTMLElement>(
        (popupContainer ?? document) as ParentNode,
        () => findAddToPlaylistPanel(),
        4000,
      );
    } catch {
      return;
    }

    const watchLaterRow = findWatchLaterRow(panel);
    if (!watchLaterRow) return;

    const checkbox = findCheckboxInRow(watchLaterRow) ?? watchLaterRow;
    checkbox.click();

    // Give YouTube a beat to register the toggle before we tear the panel
    // down — clicking close too quickly can cancel the underlying request.
    await new Promise((r) => setTimeout(r, 120));

    const closeBtn = findPanelCloseButton(panel);
    if (closeBtn) {
      closeBtn.click();
    } else {
      // Fall back to ESC, which YouTube's panel listens for.
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    }

    await waitForGone(document, () => findAddToPlaylistPanel(), 1500);
  } finally {
    if (popupContainer) popupContainer.style.visibility = previousVisibility;
  }
}
