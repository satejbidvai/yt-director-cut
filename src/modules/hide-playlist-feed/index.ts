import type { FeatureModule } from '../../framework/types';
import { injectStyles } from '../../framework/style-injection';
import { fetchAndCacheWLIds, getWLIds, onWLChange } from '../../shared/wl-store';

/**
 * Build a CSS rule that hides every home-feed tile whose thumbnail links to
 * one of the given video IDs.  The browser applies this to existing *and*
 * future elements (infinite scroll), so no MutationObserver is needed.
 */
function buildHideCSS(ids: string[]): string {
  if (ids.length === 0) return '';
  const selectors = ids.map(
    (id) => `ytd-rich-item-renderer:has(a[href*="${id}"])`,
  );
  return `${selectors.join(',\n')} { display: none !important; }`;
}

export const hidePlaylistFeedModule: FeatureModule = {
  id: 'hide-playlist-feed',
  name: 'Hide Playlist Feed',
  description:
    'Hides videos already in your Watch Later playlist from the home feed',

  enable(ctx) {
    let disposeStyles: (() => void) | null = null;
    let fetched = false;

    function applyCSS(ids: string[]) {
      disposeStyles?.();
      disposeStyles = null;
      const css = buildHideCSS(ids);
      if (css) disposeStyles = injectStyles(css);
    }

    // Re-inject CSS whenever the WL set changes (e.g. from watch-later-toggle)
    const disposeWatcher = onWLChange(applyCSS);

    ctx.onNavigate((url) => {
      if (url.pathname !== '/') return;

      if (fetched) {
        void getWLIds().then(applyCSS);
      } else {
        fetched = true;
        // Fetch triggers a storage write which fires onWLChange → applyCSS
        void fetchAndCacheWLIds();
      }
    });

    return () => {
      disposeStyles?.();
      disposeStyles = null;
      disposeWatcher();
    };
  },
};
