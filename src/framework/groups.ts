type ModuleGroup = {
  id: string;
  name: string;
  description: string;
};

export const moduleGroups = [
  {
    id: 'minimalist-yt',
    name: 'Minimalist YouTube',
    description: 'Less clutter in the sidebar, feed, and downloads'
  }
] as const satisfies readonly ModuleGroup[];

export type ModuleGroupId = (typeof moduleGroups)[number]['id'];
