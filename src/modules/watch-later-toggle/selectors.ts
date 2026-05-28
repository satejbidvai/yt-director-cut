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

/** Warn once per key per session. Callers use this after a confirmed miss. */
export const warnOnceMiss = createWarnOnceMiss('[ytdc:watch-later-toggle]');

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

// --- WL playlist page selectors (/playlist?list=WL) ---

export const PLAYLIST_ITEM_SELECTOR = 'ytd-playlist-video-renderer';
export const WL_PROCESSED_ATTR = 'data-ytdc-wl-remove';

/** The playlist contents container to observe for new items. */
export function findWLPlaylistContainer(): Element | null {
  return (
    document.querySelector('ytd-playlist-video-list-renderer #contents') ??
    document.querySelector('ytd-playlist-video-list-renderer')
  );
}

/** The "Action menu" three-dot button scoped to a playlist item. */
export function findPlaylistItemMenuButton(item: Element): HTMLElement | null {
  return item.querySelector<HTMLElement>('#menu button[aria-label="Action menu"]');
}

/** The "Remove from Watch later" item inside the overflow dropdown. */
export function findRemoveFromWLItem(dropdown: ParentNode): HTMLElement | null {
  const items = findAll<HTMLElement>(dropdown, 'ytd-menu-service-item-renderer');
  return (
    items.find((item) => {
      const label = item.querySelector('yt-formatted-string');
      return label && /remove from watch later/i.test(label.textContent ?? '');
    }) ?? null
  );
}

/** Extract the video ID from a playlist item's title link href. */
export function extractVideoIdFromItem(item: Element): string | null {
  const link = item.querySelector<HTMLAnchorElement>('a#video-title');
  if (!link) return null;
  try {
    return new URL(link.href).searchParams.get('v');
  } catch {
    return null;
  }
}

// --- Masthead header selectors ---

const HEADER_BUTTONS_SELECTOR = 'ytd-masthead #end #buttons';

/** The right-side button container in YouTube's top masthead. */
export function findHeaderButtonContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(HEADER_BUTTONS_SELECTOR);
}

const NOTIFICATION_BUTTON_SELECTOR = 'ytd-notification-topbar-button-renderer';

/** The notification bell button in the masthead. */
export function findNotificationButton(root: ParentNode): Element | null {
  return root.querySelector(NOTIFICATION_BUTTON_SELECTOR);
}

// --- Home feed selectors (pathname === '/') ---

export const FEED_CARD_SELECTOR = 'ytd-rich-item-renderer';
export const FEED_WL_PROCESSED_ATTR = 'data-ytdc-wl-feed';

/** The home feed grid container to observe for new cards. */
export function findFeedContainer(): Element | null {
  return (
    document.querySelector('ytd-rich-grid-renderer #contents') ??
    document.querySelector('ytd-rich-grid-renderer')
  );
}

/** The menu button wrapper used as insertion reference on a feed card. */
export function findCardMenuContainer(card: Element): HTMLElement | null {
  return card.querySelector<HTMLElement>('.ytLockupMetadataViewModelMenuButton');
}

/** Extract the video ID from a feed card's watch link. */
export function extractVideoIdFromCard(card: Element): string | null {
  const link = card.querySelector<HTMLAnchorElement>('a[href*="/watch?v="]');
  if (!link) return null;
  try {
    return new URL(link.href).searchParams.get('v');
  } catch {
    return null;
  }
}
