import type { FeatureModule } from '../../framework/types';
import { injectStyles } from '../../framework/style-injection';
import { injectButton, removeInjectedButton, watchPageStyles } from './watch-page';
import { startWLObserver, cleanupWLButtons, playlistRemoveStyles } from './playlist-remove';
import { startHomeFeedObserver, cleanupHomeFeedButtons, homeFeedStyles } from './home-feed';

export const watchLaterToggleModule: FeatureModule = {
  id: 'watch-later-toggle',
  name: 'Watch Later',
  description: 'Save and remove videos with one click',
  enable(ctx) {
    let cancelled = false;

    const disposeStyles = injectStyles(
      watchPageStyles + playlistRemoveStyles + homeFeedStyles,
    );

    const handleNavigation = (url: URL) => {
      removeInjectedButton();
      cleanupWLButtons();
      cleanupHomeFeedButtons();
      if (cancelled) return;

      if (url.pathname === '/watch') {
        void injectButton(() => cancelled);
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
      disposeStyles();
    };
  }
};
