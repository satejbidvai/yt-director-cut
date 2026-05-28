import type { FeatureModule, ModuleContext } from './types';
import { subscribe, unsubscribe } from './navigation';
import { getAllToggles, subscribeToToggleChanges } from './storage';

function buildContext(): { ctx: ModuleContext; teardown: () => void } {
  const ownedHandlers: ((url: URL) => void)[] = [];
  const ctx: ModuleContext = {
    onNavigate(handler) {
      ownedHandlers.push(handler);
      subscribe(handler);
      // Fire once with the current URL so modules don't need a "first run" path.
      try {
        handler(new URL(location.href));
      } catch (err) {
        console.warn('[ytdc] onNavigate first-run threw:', err);
      }
    }
  };
  const teardown = () => {
    for (const h of ownedHandlers) unsubscribe(h);
  };
  return { ctx, teardown };
}

/**
 * Bootstrap a set of feature modules:
 *  - Reads current toggle state from chrome.storage.sync (default-on per D4).
 *  - Calls each enabled module's `enable(ctx)` and stores the returned cleanup.
 *  - Listens for toggle changes and runs enable / cleanup correspondingly.
 *
 * Cleanup contract: a module's cleanup function is responsible for tearing down
 * everything it set up via `ctx.onNavigate`. Navigation handlers registered via
 * the per-module ModuleContext are auto-unsubscribed when cleanup runs.
 */
export async function bootstrap(modules: FeatureModule[]): Promise<void> {
  const cleanups = new Map<string, () => void>();
  const moduleById = new Map(modules.map((m) => [m.id, m] as const));

  function enableModule(mod: FeatureModule): void {
    if (cleanups.has(mod.id)) return;
    const { ctx, teardown } = buildContext();
    let userCleanup: () => void = () => {};
    try {
      userCleanup = mod.enable(ctx);
    } catch (err) {
      console.warn(`[ytdc] module ${mod.id} enable() threw:`, err);
    }
    cleanups.set(mod.id, () => {
      try {
        userCleanup();
      } catch (err) {
        console.warn(`[ytdc] module ${mod.id} cleanup threw:`, err);
      }
      teardown();
    });
  }

  function disableModule(id: string): void {
    const cleanup = cleanups.get(id);
    if (!cleanup) return;
    cleanups.delete(id);
    cleanup();
  }

  const toggles = await getAllToggles();
  for (const mod of modules) {
    const enabled = toggles[mod.id] !== false;
    if (enabled) enableModule(mod);
  }

  subscribeToToggleChanges((id, nextEnabled) => {
    const mod = moduleById.get(id);
    if (!mod) return;
    if (nextEnabled) enableModule(mod);
    else disableModule(id);
  });
}
