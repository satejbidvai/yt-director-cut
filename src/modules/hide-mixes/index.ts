import type { FeatureModule } from "../../framework/types";
import { injectStyles } from "../../framework/style-injection";

const HIDE_MIXES_CSS = `ytd-rich-item-renderer:has(a[href*="start_radio=1"]) { display: none !important; }`;

export const hideMixesModule: FeatureModule = {
  id: "hide-mixes",
  name: "Hide Mixes",
  description: "Remove Mix playlists from the home feed",
  group: "minimalist-yt",

  enable(ctx) {
    let disposeStyles: (() => void) | null = null;

    ctx.onNavigate((url) => {
      disposeStyles?.();
      disposeStyles = null;

      if (url.pathname === "/") {
        disposeStyles = injectStyles(HIDE_MIXES_CSS);
      }
    });

    return () => {
      disposeStyles?.();
      disposeStyles = null;
    };
  },
};
