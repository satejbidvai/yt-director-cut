import type { FeatureModule } from "./types";
import { watchLaterToggleModule } from "../modules/watch-later-toggle";

export const modules: FeatureModule[] = [watchLaterToggleModule];

const seen = new Set<string>();
for (const m of modules) {
  if (seen.has(m.id)) {
    throw new Error(`[productive-yt] duplicate module id: ${m.id}`);
  }
  seen.add(m.id);
}
