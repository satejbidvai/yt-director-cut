/**
 * Centralized DOM selectors for the Watch Later module.
 *
 * Discipline (per design D9):
 *   1. Custom-element tag names first (`ytd-watch-flexy`, etc.).
 *   2. Semantic attributes (`aria-label`, role) next.
 *   3. Class names only as a last resort.
 *
 * Every miss fires a single `console.warn` per session via `findOrWarn`.
 */

const warnedKeys = new Set<string>();

export function findOrWarn<T extends Element = Element>(
  key: string,
  root: ParentNode,
  selector: string,
): T | null {
  const el = root.querySelector<T>(selector);
  if (!el && !warnedKeys.has(key)) {
    warnedKeys.add(key);
    console.warn(
      `[productive-yt:watch-later-toggle] selector miss key="${key}" selector="${selector}"`,
    );
  }
  return el;
}

export function findAll<T extends Element = Element>(
  root: ParentNode,
  selector: string,
): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

// --- Selector definitions ---

// The watch-page top-level custom element.
export const WATCH_FLEXY = "ytd-watch-flexy";

// The action row containing Like / Dislike / Share / Save / etc. on a watch page.
// In current YouTube DOM it lives inside `#actions` of `ytd-watch-metadata`. We
// keep two reasonable shapes here so that one missing variant still allows the
// other to find the row.
export const ACTION_ROW_SELECTORS = [
  "ytd-watch-metadata #actions #actions-inner #menu",
  "ytd-watch-metadata #actions #menu",
  "ytd-watch-metadata #menu ytd-menu-renderer",
] as const;

export function findActionRow(root: ParentNode = document): Element | null {
  for (const sel of ACTION_ROW_SELECTORS) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  if (!warnedKeys.has("action-row")) {
    warnedKeys.add("action-row");
    console.warn(
      `[productive-yt:watch-later-toggle] selector miss key="action-row" tried=${JSON.stringify(
        ACTION_ROW_SELECTORS,
      )}`,
    );
  }
  return null;
}

// The native "Save" button on the watch page action row.
export function findNativeSaveButton(root: ParentNode = document): HTMLElement | null {
  // Localized aria-labels start with "Save". Match prefix to ride out variants
  // like "Save to playlist".
  const candidates = findAll<HTMLElement>(
    root,
    "ytd-watch-metadata button[aria-label]",
  );
  const match = candidates.find((b) => /^save\b/i.test(b.getAttribute("aria-label") ?? ""));
  if (!match && !warnedKeys.has("native-save")) {
    warnedKeys.add("native-save");
    console.warn(
      "[productive-yt:watch-later-toggle] selector miss key=\"native-save\" (no button[aria-label^=Save] under ytd-watch-metadata)",
    );
  }
  return match ?? null;
}

// The popup container that hosts the "Save to playlist" panel after Save is clicked.
// YouTube renders this inside `ytd-popup-container` near the end of <body>.
export const POPUP_CONTAINER = "ytd-popup-container";
export const ADD_TO_PLAYLIST_RENDERER = "ytd-add-to-playlist-renderer";

export function findAddToPlaylistPanel(): HTMLElement | null {
  const popup = document.querySelector<HTMLElement>(POPUP_CONTAINER);
  if (!popup) {
    if (!warnedKeys.has("popup-container")) {
      warnedKeys.add("popup-container");
      console.warn(
        "[productive-yt:watch-later-toggle] selector miss key=\"popup-container\"",
      );
    }
    return null;
  }
  return popup.querySelector<HTMLElement>(ADD_TO_PLAYLIST_RENDERER);
}

// The "Watch later" row inside the playlist panel — a checkbox row whose
// label text reads "Watch later" (matched case-insensitively, prefix to be
// defensive against trailing whitespace / decoration).
export function findWatchLaterRow(panel: ParentNode): HTMLElement | null {
  const rows = findAll<HTMLElement>(panel, "ytd-playlist-add-to-option-renderer");
  const match = rows.find((r) => {
    const label = r.querySelector("yt-formatted-string#label")?.textContent ?? "";
    return /^\s*watch later\b/i.test(label);
  });
  if (!match && !warnedKeys.has("watch-later-row")) {
    warnedKeys.add("watch-later-row");
    console.warn(
      "[productive-yt:watch-later-toggle] selector miss key=\"watch-later-row\" (no row labelled 'Watch later')",
    );
  }
  return match ?? null;
}

// The clickable checkbox surface inside a Watch Later row.
export function findCheckboxInRow(row: ParentNode): HTMLElement | null {
  return (
    row.querySelector<HTMLElement>("tp-yt-paper-checkbox") ??
    row.querySelector<HTMLElement>("[role='checkbox']") ??
    row.querySelector<HTMLElement>("ytd-checkbox-renderer")
  );
}

// The close affordance on the playlist panel.
export function findPanelCloseButton(panel: ParentNode): HTMLElement | null {
  return (
    panel.querySelector<HTMLElement>("button[aria-label='Close']") ??
    panel.querySelector<HTMLElement>("yt-icon-button#close-button button") ??
    panel.querySelector<HTMLElement>("#close-button button")
  );
}
