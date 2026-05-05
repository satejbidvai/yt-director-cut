export type ModuleContext = {
  onNavigate(handler: (url: URL) => void): void;
};

import type { ModuleGroupId } from "./groups";

export type FeatureModule = {
  id: string;
  name: string;
  description?: string;
  group?: ModuleGroupId;
  enable(ctx: ModuleContext): () => void;
};
