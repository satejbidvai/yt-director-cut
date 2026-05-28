import type { FeatureModule } from "./types";
import { watchLaterToggleModule } from "../modules/watch-later-toggle";
import { captionStyleModule } from "../modules/caption-style";
import { hidePlaylistFeedModule } from "../modules/hide-playlist-feed";
import { notInterestedModule } from "../modules/not-interested";
import { hideMixesModule } from "../modules/hide-mixes";
import { cleanSidebarModule } from "../modules/clean-sidebar";

export const modules: FeatureModule[] = [
  watchLaterToggleModule,
  captionStyleModule,
  hidePlaylistFeedModule,
  notInterestedModule,
  hideMixesModule,
  cleanSidebarModule,
];

const seen = new Set<string>();
for (const m of modules) {
  if (seen.has(m.id)) {
    throw new Error(`[ytdc] duplicate module id: ${m.id}`);
  }
  seen.add(m.id);
}
