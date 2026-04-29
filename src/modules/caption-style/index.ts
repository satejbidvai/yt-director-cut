import type { FeatureModule } from "../../framework/types";
import { injectStyles } from "../../framework/style-injection";

const CAPTION_CSS = `
  /* --- YouTube DOM caption elements --- */

  .ytp-caption-segment {
    font-weight: 600 !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 1) !important;
    background: rgba(0, 0, 0, 0.6) !important;
    border-radius: 0.8rem;
    margin: 0 0 0.1rem 0 !important;
    font-size: 2rem !important;
  }

  .ytp-caption-window-bottom {
    background-color: transparent !important;
  }

  /* Larger captions on the watch page (ytd-watch-flexy is the watch page container) */
  ytd-watch-flexy .ytp-caption-segment {
    font-size: 3.5rem !important;
  }

  /* --- Native text track fallback (::cue) --- */

  video::cue {
    font-weight: 600 !important;
    color: white !important;
    background-color: rgba(0, 0, 0, 0.6) !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 1) !important;
    font-size: 2rem !important;
  }
`;

export const captionStyleModule: FeatureModule = {
  id: "caption-style",
  name: "Caption Style",
  description: "Bolder, easier-to-read subtitles",
  enable() {
    const dispose = injectStyles(CAPTION_CSS);
    return () => dispose();
  },
};
