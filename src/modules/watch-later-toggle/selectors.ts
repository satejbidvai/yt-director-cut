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

import { createWarnOnceMiss } from '../../shared/logger';
import { POPUP_CONTAINER } from '../../shared/overflow-menu';

/** Warn once per key per session. Callers use this after a confirmed miss. */
export const warnOnceMiss = createWarnOnceMiss('[redline:watch-later-toggle]');

function findAll<T extends Element = Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

// --- Selector definitions ---

// The action row: the ytd-menu-renderer inside the watch-page metadata that
// contains Like / Share / Save / etc.
const ACTION_ROW_SELECTOR = 'ytd-watch-metadata ytd-menu-renderer';

export function findActionRow(root: ParentNode = document): Element | null {
  return root.querySelector(ACTION_ROW_SELECTOR);
}

// The native "Save" button inside the action row.
export function findNativeSaveButton(root: ParentNode = document): HTMLElement | null {
  const candidates = findAll<HTMLElement>(root, 'button[aria-label]');
  return candidates.find((b) => /^save\b/i.test(b.getAttribute('aria-label') ?? '')) ?? null;
}

export function findAddToPlaylistPanel(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`${POPUP_CONTAINER} yt-sheet-view-model`);
}

// The "Watch later" row inside the playlist panel — a list item whose
// aria-label starts with "Watch later" (case-insensitive).
export function findWatchLaterRow(panel: ParentNode): HTMLElement | null {
  const rows = findAll<HTMLElement>(panel, 'yt-list-item-view-model[aria-label]');
  return rows.find((r) => /^\s*watch later\b/i.test(r.getAttribute('aria-label') ?? '')) ?? null;
}

// The clickable surface inside a Watch Later row.
export function findCheckboxInRow(row: HTMLElement): HTMLElement {
  return row.querySelector<HTMLElement>('button') ?? row;
}

// --- Overflow menu selectors (Save collapsed into three-dot menu) ---

// The visible "More actions" three-dot button in the action row.
// YouTube renders two buttons with aria-label="More actions" inside
// ytd-menu-renderer; the visible one has a non-zero offsetHeight.
export function findOverflowButton(root: ParentNode = document): HTMLElement | null {
  const candidates = findAll<HTMLElement>(root, 'button[aria-label="More actions"]');
  return candidates.find((b) => b.offsetHeight > 0) ?? null;
}

// The "Save" menu item inside the overflow dropdown, identified by its
// yt-formatted-string text content (no aria-label or <button> exists here).
export function findOverflowSaveItem(dropdown: ParentNode): HTMLElement | null {
  const items = findAll<HTMLElement>(dropdown, 'ytd-menu-service-item-renderer');
  return (
    items.find((item) => {
      const label = item.querySelector('yt-formatted-string');
      return label && /^\s*save\s*$/i.test(label.textContent ?? '');
    }) ?? null
  );
}

// The close affordance on the playlist panel.  The new panel is a dropdown
// that closes on outside click or Escape — there may be no explicit close
// button.
export function findPanelCloseButton(panel: ParentNode): HTMLElement | null {
  return (
    panel.querySelector<HTMLElement>("button[aria-label='Close']") ??
    panel.querySelector<HTMLElement>('#close-button button')
  );
}
