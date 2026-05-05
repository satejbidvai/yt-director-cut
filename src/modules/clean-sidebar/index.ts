import type { FeatureModule } from "../../framework/types";
import { injectStyles } from "../../framework/style-injection";

const SIDEBAR_CSS = `
  /* Hamburger menu button */
  ytd-masthead yt-icon-button#guide-button {
    display: none !important;
  }

  /* Shorts entry */
  ytd-guide-renderer ytd-guide-entry-renderer:has(a[title="Shorts"]) {
    display: none !important;
  }

  /* Subscriptions entry */
  ytd-guide-renderer ytd-guide-entry-renderer:has(a[title="Subscriptions"]) {
    display: none !important;
  }

  /* "You >" heading row */
  ytd-guide-collapsible-section-entry-renderer #header {
    display: none !important;
  }

  /* Explore section */
  ytd-guide-section-renderer:has(a[title="Shopping"]) {
    display: none !important;
  }

  /* More from YouTube section */
  ytd-guide-section-renderer:has(a[title="YouTube Premium"]) {
    display: none !important;
  }

  /* Report history section */
  ytd-guide-section-renderer:has(a[title="Report history"]) {
    display: none !important;
  }

  /* Footer links */
  ytd-guide-renderer #footer {
    display: none !important;
  }
`;

export const cleanSidebarModule: FeatureModule = {
  id: "clean-sidebar",
  name: "Clean Sidebar",
  description: "Strips the sidebar down to essentials",
  group: "minimalist-yt",
  enable() {
    const dispose = injectStyles(SIDEBAR_CSS);
    return () => dispose();
  },
};
