import type { FeatureModule } from "../../framework/types";
import { injectStyles } from "../../framework/style-injection";

const HIDE_DOWNLOAD_TOAST_CSS = `
  ytd-video-download-toast-renderer {
    display: none !important;
  }
`;

export const quietDownloadsModule: FeatureModule = {
  id: "quiet-downloads",
  name: "Quiet Downloads",
  description: "No progress popup when downloading",
  group: "minimalist-yt",
  enable() {
    const dispose = injectStyles(HIDE_DOWNLOAD_TOAST_CSS);
    return () => dispose();
  },
};
