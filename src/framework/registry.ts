import type { FeatureModule } from "./types";
import { watchLaterToggleModule } from "../modules/watch-later-toggle";
import { captionStyleModule } from "../modules/caption-style";
import { hidePlaylistFeedModule } from "../modules/hide-playlist-feed";
import { notInterestedModule } from "../modules/not-interested";

export const modules: FeatureModule[] = [
  watchLaterToggleModule,
  captionStyleModule,
  hidePlaylistFeedModule,
  notInterestedModule,
];

const seen = new Set<string>();
for (const m of modules) {
  if (seen.has(m.id)) {
    throw new Error(`[redline] duplicate module id: ${m.id}`);
  }
  seen.add(m.id);
}
