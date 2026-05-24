import { waitFor } from '../../shared/dom-utils';
import { findHeaderButtonContainer, findNotificationButton, warnOnceMiss } from './selectors';

const LINK_CLASS = 'redline-wl-header-link';

const WL_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor" focusable="false" aria-hidden="true"><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1Zm0 2a9 9 0 110 18.001A9 9 0 0112 3Zm0 3a1 1 0 00-1 1v5.565l.485.292 3.33 2a1 1 0 001.03-1.714L13 11.435V7a1 1 0 00-1-1Z"></path></svg>`;

// --yt-spec-* variables are scoped inside YouTube's custom elements and
// don't cascade to arbitrary injected nodes. Use html[dark] to match.
export const headerLinkStyles = `
  .${LINK_CLASS} {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #030303;
    cursor: pointer;
    text-decoration: none;
  }
  html[dark] .${LINK_CLASS} {
    color: #f1f1f1;
  }
  .${LINK_CLASS}:hover {
    background: rgba(0, 0, 0, 0.1);
  }
  html[dark] .${LINK_CLASS}:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .${LINK_CLASS} svg {
    width: 24px;
    height: 24px;
  }`;

let observer: MutationObserver | null = null;

function createLink(): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = LINK_CLASS;
  link.href = '/playlist?list=WL';
  link.title = 'Watch Later';
  link.innerHTML = WL_ICON_SVG;
  return link;
}

function insertLink(container: HTMLElement): void {
  if (container.querySelector(`.${LINK_CLASS}`)) return;
  const link = createLink();
  const notifBtn = findNotificationButton(container);
  if (notifBtn) {
    container.insertBefore(link, notifBtn);
  } else {
    container.prepend(link);
  }
}

/**
 * Inject the WL header link and keep it alive via a MutationObserver.
 * YouTube's Polymer re-stamps the #buttons container on SPA navigations,
 * so a one-shot injection isn't enough.
 */
export async function injectHeaderLink(
  isCancelled: () => boolean,
): Promise<void> {
  cleanupHeaderLink();

  let container: HTMLElement;
  try {
    container = await waitFor(document, findHeaderButtonContainer);
  } catch {
    warnOnceMiss('header-buttons', 'could not find masthead button container');
    return;
  }
  if (isCancelled()) return;

  insertLink(container);

  observer = new MutationObserver(() => {
    if (isCancelled()) { cleanupHeaderLink(); return; }
    insertLink(container);
  });
  observer.observe(container, { childList: true });
}

export function cleanupHeaderLink(): void {
  observer?.disconnect();
  observer = null;
  document.querySelectorAll(`.${LINK_CLASS}`).forEach((el) => el.remove());
}
