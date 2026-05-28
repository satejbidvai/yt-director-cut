import type { FeatureModule } from '../../framework/types';
import { overlayIcon } from '../../framework/styles';
import { injectStyles } from '../../framework/style-injection';
import { waitFor } from '../../shared/dom-utils';
import { clickOverflowMenuItem } from '../../shared/overflow-menu';
import {
  CARD_SELECTOR,
  PROCESSED_ATTR,
  findFeedContainer,
  findCardMenuButton,
  findCardMenuContainer,
  findNotInterestedItem,
  findVideoPreview,
  warnOnceMiss,
} from './selectors';

const BUTTON_CLASS = 'ytdc-not-interested-btn';

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
      ${overlayIcon.css(BUTTON_CLASS, CARD_SELECTOR)}
      .${BUTTON_CLASS} {
        position: absolute;
        top: -6px;
        right: 20px;
      }
    `);

    function processCard(card: Element): void {
      // Check for the actual button, not just the attribute — YouTube's SPA
      // rebuilds card internals on navigation while preserving the outer element.
      if (card.querySelector(`.${BUTTON_CLASS}`)) return;
      if (card.querySelector('ytd-ad-slot-renderer')) return;
      if (card.querySelector('a[href*="googleadservices"]')) return;

      const menuContainer = findCardMenuContainer(card);
      if (!menuContainer || !menuContainer.parentElement) return;

      card.setAttribute(PROCESSED_ATTR, '1');

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

    async function startObserving(): Promise<void> {
      stopObserving();

      let container: Element;
      try {
        container = await waitFor(document, findFeedContainer);
      } catch {
        warnOnceMiss('feed-container', 'could not find feed grid to observe');
        return;
      }
      if (cancelled) return;

      processAllCards();
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
      void startObserving();
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

async function handleNotInterested(card: HTMLElement): Promise<void> {
  const menuBtn = findCardMenuButton(card);
  if (!menuBtn) {
    warnOnceMiss('card-menu-btn', 'three-dot button not found on card');
    return;
  }

  const clicked = await clickOverflowMenuItem(menuBtn, findNotInterestedItem);
  if (!clicked) {
    warnOnceMiss('not-interested-item', '"Not interested" item not found in menu');
    return;
  }

  dismissVideoPreview();
}

function dismissVideoPreview(): void {
  const preview = findVideoPreview();
  if (!preview) return;
  preview.setAttribute('hidden', '');
  preview.querySelector<HTMLVideoElement>('video')?.pause();
}
