export type ModuleContext = {
  onNavigate(handler: (url: URL) => void): void;
};

export type FeatureModule = {
  id: string;
  name: string;
  description?: string;
  enable(ctx: ModuleContext): () => void;
};
