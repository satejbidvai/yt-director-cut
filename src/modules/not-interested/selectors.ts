/**
 * Centralized DOM selectors for the Not Interested module.
 *
 * Discipline (per design D9):
 *   1. Custom-element tag names first.
 *   2. Semantic attributes (aria-label, role) next.
 *   3. Class names only as a last resort.
 */

import { createWarnOnceMiss } from '../../shared/logger';

export const warnOnceMiss = createWarnOnceMiss('[ytdc:not-interested]');

export const CARD_SELECTOR = 'ytd-rich-item-renderer';
export const PROCESSED_ATTR = 'data-ytdc-ni';

/** The feed grid container to observe for new cards. */
export function findFeedContainer(): Element | null {
  return (
    document.querySelector('ytd-rich-grid-renderer #contents') ??
    document.querySelector('ytd-rich-grid-renderer')
  );
}

/**
 * The three-dot "More actions" button scoped to a specific card.
 * YouTube's new yt-lockup-view-model uses aria-label="More actions".
 */
export function findCardMenuButton(card: Element): HTMLElement | null {
  return card.querySelector<HTMLElement>('button[aria-label="More actions"]');
}

/**
 * The menu button wrapper div (position: absolute) used as insertion reference.
 * Class: ytLockupMetadataViewModelMenuButton
 */
export function findCardMenuContainer(card: Element): HTMLElement | null {
  return card.querySelector<HTMLElement>('.ytLockupMetadataViewModelMenuButton');
}


/** The global floating video preview element. */
export function findVideoPreview(): Element | null {
  return document.querySelector('#video-preview ytd-video-preview');
}

/**
 * The "Not interested" clickable element inside the dropdown menu.
 * YouTube now uses yt-list-item-view-model with a button inside.
 */
export function findNotInterestedItem(dropdown: ParentNode): HTMLElement | null {
  const items = Array.from(
    dropdown.querySelectorAll<HTMLElement>('yt-list-item-view-model'),
  );
  const match = items.find((item) =>
    item.textContent?.includes('Not interested'),
  );
  if (match) return match.querySelector<HTMLElement>('button') ?? match;

  // Fallback to old DOM structure
  const oldItems = Array.from(
    dropdown.querySelectorAll<HTMLElement>('ytd-menu-service-item-renderer'),
  );
  return (
    oldItems.find((item) => {
      const label = item.querySelector('yt-formatted-string');
      return label && /not interested/i.test(label.textContent ?? '');
    }) ?? null
  );
}
