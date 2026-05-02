import type { FeatureModule } from '../../framework/types';
import { injectStyles } from '../../framework/style-injection';
import {
  CARD_SELECTOR,
  PROCESSED_ATTR,
  POPUP_CONTAINER,
  findFeedContainer,
  findCardMenuButton,
  findCardMenuContainer,
  findNotInterestedItem,
  warnOnceMiss,
} from './selectors';

const BUTTON_CLASS = 'redline-not-interested-btn';

const PROHIBIT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;

export const notInterestedModule: FeatureModule = {
  id: 'not-interested',
  name: 'Not Interested',
  description: 'Dismiss videos from your feed in one click',

  enable(ctx) {
    let observer: MutationObserver | null = null;
    let cancelled = false;

    const disposeStyles = injectStyles(`
      [${PROCESSED_ATTR}] .ytLockupMetadataViewModelTextContainer {
        padding-right: 36px;
      }
      .${BUTTON_CLASS} {
        position: absolute;
        top: -6px;
        right: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: none;
        border-radius: 18px;
        background: transparent;
        color: rgb(241, 241, 241);
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
      }
      ${CARD_SELECTOR}:hover .${BUTTON_CLASS},
      .${BUTTON_CLASS}:focus-visible {
        opacity: 1;
      }
      .${BUTTON_CLASS}:hover {
        background: var(--yt-spec-badge-chip-background, rgba(255,255,255,0.1));
      }
      .${BUTTON_CLASS} svg {
        width: 20px;
        height: 20px;
      }
    `);

    function processCard(card: Element): void {
      if (card.hasAttribute(PROCESSED_ATTR)) return;
      if (card.querySelector('ytd-ad-slot-renderer')) return;
      if (card.querySelector('a[href*="googleadservices"]')) return;
      card.setAttribute(PROCESSED_ATTR, '1');

      const menuContainer = findCardMenuContainer(card);
      if (!menuContainer || !menuContainer.parentElement) return;

      const btn = document.createElement('button');
      btn.className = BUTTON_CLASS;
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Not interested');
      btn.innerHTML = PROHIBIT_SVG;

      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        btn.disabled = true;
        void handleNotInterested(card as HTMLElement).finally(() => {
          btn.disabled = false;
        });
      });

      menuContainer.parentElement.insertBefore(btn, menuContainer);
    }

    function processAllCards(): void {
      const cards = document.querySelectorAll(CARD_SELECTOR);
      cards.forEach(processCard);
    }

    function startObserving(): void {
      stopObserving();
      processAllCards();

      const container = findFeedContainer();
      if (!container) {
        warnOnceMiss('feed-container', 'could not find feed grid to observe');
        return;
      }

      observer = new MutationObserver(() => processAllCards());
      observer.observe(container, { childList: true, subtree: true });
    }

    function stopObserving(): void {
      observer?.disconnect();
      observer = null;
    }

    ctx.onNavigate((url) => {
      stopObserving();
      if (cancelled) return;
      if (url.pathname !== '/') return;
      startObserving();
    });

    return () => {
      cancelled = true;
      stopObserving();
      disposeStyles();
      document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((el) => el.remove());
      document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach((el) => {
        el.removeAttribute(PROCESSED_ATTR);
      });
    };
  },
};

/**
 * Wait for the iron-dropdown inside the popup container to transition to the
 * given open/closed state. YouTube toggles `aria-hidden` and `display` on
 * `tp-yt-iron-dropdown` when opening/closing.
 */
function waitForDropdown(
  popup: HTMLElement,
  open: boolean,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      const dd = popup.querySelector<HTMLElement>('tp-yt-iron-dropdown');
      const isOpen = dd ? dd.getAttribute('aria-hidden') !== 'true' : false;
      if (isOpen === open) return resolve(true);
      if (Date.now() >= deadline) return resolve(false);
      setTimeout(check, 20);
    };
    check();
  });
}

async function handleNotInterested(card: HTMLElement): Promise<void> {
  const menuBtn = findCardMenuButton(card);
  if (!menuBtn) {
    warnOnceMiss('card-menu-btn', 'three-dot button not found on card');
    return;
  }

  const popupContainer = document.querySelector<HTMLElement>(POPUP_CONTAINER);
  if (!popupContainer) return;

  // If a previous dropdown is still open (e.g. from a failed attempt),
  // close it first with Escape before proceeding.
  const existingDropdown = popupContainer.querySelector<HTMLElement>('tp-yt-iron-dropdown');
  if (existingDropdown && existingDropdown.getAttribute('aria-hidden') !== 'true') {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitForDropdown(popupContainer, false, 500);
  }

  popupContainer.style.visibility = 'hidden';

  try {
    menuBtn.click();

    // Wait for the dropdown to actually open before searching for items.
    // This prevents matching stale items left over from a previous dropdown.
    const opened = await waitForDropdown(popupContainer, true, 2000);

    if (!opened) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return;
    }

    // Now poll for the "Not interested" item within the freshly-opened dropdown.
    const deadline = Date.now() + 2000;
    let notInterestedItem: HTMLElement | null = null;

    while (Date.now() < deadline) {
      notInterestedItem = findNotInterestedItem(popupContainer);
      if (notInterestedItem) break;
      await new Promise((r) => setTimeout(r, 30));
    }

    if (!notInterestedItem) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      warnOnceMiss('not-interested-item', '"Not interested" item not found in dropdown');
      return;
    }

    notInterestedItem.click();
  } finally {
    popupContainer.style.visibility = '';
  }
}
