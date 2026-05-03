import type { FeatureModule } from '../../framework/types';
import { injectStyles } from '../../framework/style-injection';
import { injectButton, removeInjectedButton, watchPageStyles } from './watch-page';
import { startWLObserver, cleanupWLButtons, playlistRemoveStyles } from './playlist-remove';

export const watchLaterToggleModule: FeatureModule = {
  id: 'watch-later-toggle',
  name: 'Watch Later',
  description: 'Save and remove videos with one click',
  enable(ctx) {
    let cancelled = false;

    const disposeStyles = injectStyles(watchPageStyles + playlistRemoveStyles);

    const handleNavigation = (url: URL) => {
      removeInjectedButton();
      cleanupWLButtons();
      if (cancelled) return;

      if (url.pathname === '/watch') {
        void injectButton(() => cancelled);
      } else if (
        url.pathname === '/playlist' &&
        url.searchParams.get('list') === 'WL'
      ) {
        startWLObserver();
      }
    };

    ctx.onNavigate(handleNavigation);

    return () => {
      cancelled = true;
      removeInjectedButton();
      cleanupWLButtons();
      disposeStyles();
    };
  }
};
