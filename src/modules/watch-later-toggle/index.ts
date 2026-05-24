import type { FeatureModule } from '../../framework/types';
import { injectStyles } from '../../framework/style-injection';
import { injectButton, removeInjectedButton, watchPageStyles } from './watch-page';
import { startWLObserver, cleanupWLButtons, playlistRemoveStyles } from './playlist-remove';
import { startHomeFeedObserver, cleanupHomeFeedButtons, homeFeedStyles } from './home-feed';
import { injectHeaderLink, cleanupHeaderLink, headerLinkStyles } from './header-link';

export const watchLaterToggleModule: FeatureModule = {
  id: 'watch-later-toggle',
  name: 'Watch Later',
  description: 'Save and remove videos with one click',
  enable(ctx) {
    let cancelled = false;
    let cleanupFullscreenListener: (() => void) | null = null;

    const disposeStyles = injectStyles(
      watchPageStyles + playlistRemoveStyles + homeFeedStyles + headerLinkStyles,
    );

    void injectHeaderLink(() => cancelled);

    const handleNavigation = (url: URL) => {
      removeInjectedButton();
      cleanupWLButtons();
      cleanupHomeFeedButtons();
      cleanupFullscreenListener?.();
      cleanupFullscreenListener = null;
      if (cancelled) return;

      if (url.pathname === '/watch') {
        void injectButton(() => cancelled);

        const onFullscreenChange = () => {
          if (document.fullscreenElement || cancelled) return;
          removeInjectedButton();
          void injectButton(() => cancelled);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        cleanupFullscreenListener = () => {
          document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
      } else if (
        url.pathname === '/playlist' &&
        url.searchParams.get('list') === 'WL'
      ) {
        startWLObserver();
      } else if (url.pathname === '/') {
        void startHomeFeedObserver(() => cancelled);
      }
    };

    ctx.onNavigate(handleNavigation);

    return () => {
      cancelled = true;
      removeInjectedButton();
      cleanupWLButtons();
      cleanupHomeFeedButtons();
      cleanupHeaderLink();
      cleanupFullscreenListener?.();
      cleanupFullscreenListener = null;
      disposeStyles();
    };
  }
};
