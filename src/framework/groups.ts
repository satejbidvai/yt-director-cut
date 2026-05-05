export type ModuleGroup = {
  id: string;
  name: string;
  description: string;
};

export const moduleGroups = [
  {
    id: "minimalist-yt",
    name: "Minimalist YouTube",
    description: "Strip away distractions from your feed",
  },
] as const satisfies readonly ModuleGroup[];

export type ModuleGroupId = (typeof moduleGroups)[number]["id"];
