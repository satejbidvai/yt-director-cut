import { overlayIcon } from '../../framework/styles';
import { toggleWatchLater } from '../../shared/wl-toggle';
import { getWLIds, onWLChange } from '../../shared/wl-store';
import { waitFor } from '../../shared/dom-utils';
import {
  FEED_CARD_SELECTOR,
  FEED_WL_PROCESSED_ATTR,
  findFeedContainer,
  findCardMenuContainer,
  extractVideoIdFromCard,
  warnOnceMiss,
} from './selectors';

const BUTTON_CLASS = 'redline-wl-feed-btn';

const BOOKMARK_OUTLINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor" aria-hidden="true"><path d="M19 2H5a2 2 0 00-2 2v16.887c0 1.266 1.382 2.048 2.469 1.399L12 18.366l6.531 3.919c1.087.652 2.469-.131 2.469-1.397V4a2 2 0 00-2-2ZM5 20.233V4h14v16.233l-6.485-3.89-.515-.309-.515.309L5 20.233Z"></path></svg>`;
const BOOKMARK_FILLED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor" aria-hidden="true"><path d="M19 2H5a2 2 0 00-2 2v16.887c0 1.266 1.382 2.048 2.469 1.399L12 18.366l6.531 3.919c1.087.652 2.469-.131 2.469-1.397V4a2 2 0 00-2-2Z"></path></svg>`;

export const homeFeedStyles = `
  [${FEED_WL_PROCESSED_ATTR}] .ytLockupMetadataViewModelTextContainer {
    padding-right: 36px;
  }
  [${FEED_WL_PROCESSED_ATTR}][data-redline-ni] .ytLockupMetadataViewModelTextContainer {
    padding-right: 66px;
  }
  ${overlayIcon.css(BUTTON_CLASS, FEED_CARD_SELECTOR)}
  .${BUTTON_CLASS} {
    position: absolute;
    top: -6px;
    right: 52px;
  }
  /* When not-interested is absent, shift closer to the menu button. */
  ${FEED_CARD_SELECTOR}:not([data-redline-ni]) .${BUTTON_CLASS} {
    right: 20px;
  }`;

let observer: MutationObserver | null = null;
let unsubWLChange: (() => void) | null = null;
// Cached locally so processCard can read synchronously.
let cachedWLIds: string[] = [];

function stopObserver(): void {
  observer?.disconnect();
  observer = null;
}

function updateButtonIcon(btn: HTMLButtonElement, isSaved: boolean): void {
  const svg = btn.querySelector('svg');
  if (!svg) return;
  const temp = document.createElement('template');
  temp.innerHTML = isSaved ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG;
  svg.replaceWith(temp.content.firstChild!);
}

function processCard(card: Element): void {
  if (card.querySelector(`.${BUTTON_CLASS}`)) return;
  if (card.querySelector('ytd-ad-slot-renderer')) return;
  if (card.querySelector('a[href*="googleadservices"]')) return;

  const menuContainer = findCardMenuContainer(card);
  if (!menuContainer || !menuContainer.parentElement) return;

  const videoId = extractVideoIdFromCard(card);
  if (!videoId) return;

  card.setAttribute(FEED_WL_PROCESSED_ATTR, '1');

  const isSaved = cachedWLIds.includes(videoId);

  const btn = document.createElement('button');
  btn.className = BUTTON_CLASS;
  btn.type = 'button';
  btn.dataset.videoId = videoId;
  btn.setAttribute('aria-label', isSaved ? 'Remove from Watch Later' : 'Watch Later');
  btn.innerHTML = isSaved ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG;

  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (btn.disabled) return;
    btn.disabled = true;
    void handleToggleClick(btn).finally(() => {
      btn.disabled = false;
    });
  });

  menuContainer.parentElement.insertBefore(btn, menuContainer);
}

function processAllCards(): void {
  document.querySelectorAll(FEED_CARD_SELECTOR).forEach(processCard);
}

/** Sync all visible button icons with the current WL store state. */
function syncAllButtons(ids: string[]): void {
  cachedWLIds = ids;
  for (const btn of document.querySelectorAll<HTMLButtonElement>(`.${BUTTON_CLASS}`)) {
    const vid = btn.dataset.videoId;
    if (!vid) continue;
    const saved = ids.includes(vid);
    updateButtonIcon(btn, saved);
    btn.setAttribute('aria-label', saved ? 'Remove from Watch Later' : 'Watch Later');
  }
}

async function handleToggleClick(btn: HTMLButtonElement): Promise<void> {
  const videoId = btn.dataset.videoId;
  if (!videoId) return;

  const ok = await toggleWatchLater(videoId, (saved) => {
    updateButtonIcon(btn, saved);
    btn.setAttribute('aria-label', saved ? 'Remove from Watch Later' : 'Watch Later');
  });

  if (!ok) {
    warnOnceMiss('ytd-app', 'ytd-app element not found — cannot toggle Watch Later');
  }
}

export async function startHomeFeedObserver(isCancelled: () => boolean): Promise<void> {
  stopObserver();

  cachedWLIds = await getWLIds();
  if (isCancelled()) return;

  let container: Element;
  try {
    container = await waitFor(document, findFeedContainer);
  } catch {
    warnOnceMiss('feed-container', 'could not find feed grid to observe');
    return;
  }
  if (isCancelled()) return;

  unsubWLChange = onWLChange(syncAllButtons);

  processAllCards();

  observer = new MutationObserver(() => processAllCards());
  observer.observe(container, { childList: true, subtree: true });
}

export function cleanupHomeFeedButtons(): void {
  stopObserver();
  unsubWLChange?.();
  unsubWLChange = null;
  document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((el) => el.remove());
  document.querySelectorAll(`[${FEED_WL_PROCESSED_ATTR}]`).forEach((el) => {
    el.removeAttribute(FEED_WL_PROCESSED_ATTR);
  });
}
