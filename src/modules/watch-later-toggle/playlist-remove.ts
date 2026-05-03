import { overlayIcon } from '../../framework/styles';
import { clickOverflowMenuItem } from '../../shared/overflow-menu';
import {
  PLAYLIST_ITEM_SELECTOR,
  WL_PROCESSED_ATTR,
  findWLPlaylistContainer,
  findPlaylistItemMenuButton,
  findRemoveFromWLItem,
  extractVideoIdFromItem,
  warnOnceMiss,
} from './selectors';
import { removeWLId } from '../../shared/wl-store';

const WL_REMOVE_BTN_CLASS = 'redline-wl-remove-btn';

const TRASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

export const playlistRemoveStyles = `
  ${PLAYLIST_ITEM_SELECTOR}[${WL_PROCESSED_ATTR}] #menu {
    display: flex;
    align-items: center;
  }
  ${overlayIcon.css(WL_REMOVE_BTN_CLASS, PLAYLIST_ITEM_SELECTOR)}`;

let observer: MutationObserver | null = null;

function stopObserver(): void {
  observer?.disconnect();
  observer = null;
}

function processItem(item: Element): void {
  if (item.querySelector(`.${WL_REMOVE_BTN_CLASS}`)) return;

  const menuDiv = item.querySelector('#menu');
  if (!menuDiv) return;

  item.setAttribute(WL_PROCESSED_ATTR, '1');

  const btn = document.createElement('button');
  btn.className = WL_REMOVE_BTN_CLASS;
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Remove from Watch Later');
  btn.innerHTML = TRASH_SVG;

  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    btn.disabled = true;
    void handleRemoveFromWL(item as HTMLElement).finally(() => {
      btn.disabled = false;
    });
  });

  menuDiv.insertBefore(btn, menuDiv.firstChild);
}

function processAllItems(): void {
  document.querySelectorAll(PLAYLIST_ITEM_SELECTOR).forEach(processItem);
}

export function startWLObserver(): void {
  stopObserver();
  processAllItems();

  const container = findWLPlaylistContainer();
  if (!container) {
    warnOnceMiss('wl-playlist-container', 'could not find WL playlist container to observe');
    return;
  }

  observer = new MutationObserver(() => processAllItems());
  observer.observe(container, { childList: true, subtree: true });
}

export function cleanupWLButtons(): void {
  stopObserver();
  document.querySelectorAll(`.${WL_REMOVE_BTN_CLASS}`).forEach((el) => el.remove());
  document.querySelectorAll(`[${WL_PROCESSED_ATTR}]`).forEach((el) => {
    el.removeAttribute(WL_PROCESSED_ATTR);
  });
}

async function handleRemoveFromWL(item: HTMLElement): Promise<void> {
  const menuBtn = findPlaylistItemMenuButton(item);
  if (!menuBtn) {
    warnOnceMiss('wl-item-menu-btn', 'Action menu button not found on playlist item');
    return;
  }

  const clicked = await clickOverflowMenuItem(menuBtn, findRemoveFromWLItem);
  if (!clicked) {
    warnOnceMiss('wl-remove-item', '"Remove from Watch later" item not found in menu');
    return;
  }

  const videoId = extractVideoIdFromItem(item);
  if (videoId) void removeWLId(videoId);
}
