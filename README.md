# Redline

A personal Chrome extension for desktop YouTube. Designed as a small, growable
collection of feature modules. The first shipping feature is a **Watch Later
toggle** — a one-click button anchored next to the native Save button on every
watch page.

## Install (sideload)

1. `pnpm install`
2. `pnpm build`
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**,
   and pick the generated `dist/` directory.
4. Open a watch page on `www.youtube.com` — a **Watch Later** pill should appear
   in the action row.

## Dev loop

```sh
pnpm dev        # Vite + CRXJS with HMR for content scripts
pnpm typecheck  # tsc --noEmit
pnpm build      # production build into dist/
```

For HMR to update the running extension, load `dist/` once after the first
build; subsequent edits are pushed via the Vite dev server.

## Architecture in one screen

Every feature is a `FeatureModule`:

```ts
type FeatureModule = {
  id: string;            // unique key, used in chrome.storage.sync
  name: string;          // shown in the popup
  description?: string;  // optional, shown in the popup
  enable(ctx: ModuleContext): () => void;  // returns cleanup
};

type ModuleContext = {
  onNavigate(handler: (url: URL) => void): void;
};
```

The framework owns:

- A single `yt-navigate-finish` listener that fans out to every module's
  navigation handlers (and fires once on bootstrap with the current URL).
- `chrome.storage.sync`-backed feature toggles under the `featureToggles` key
  (default-on: a missing entry means enabled).
- A lifecycle that calls `enable(ctx)` when a module is on and the cleanup
  function it returned when it's flipped off.

To add a feature:

1. Create `src/modules/<your-feature>/index.ts` exporting a `FeatureModule`.
2. Co-locate selectors in `src/modules/<your-feature>/selectors.ts` and prefer
   custom-element tag names and `aria-label` attributes over class names.
3. Register your module in `src/framework/registry.ts`.

## Layout

```
src/
  content.ts                          # entry: imports registry, calls bootstrap
  framework/
    types.ts                          # FeatureModule, ModuleContext
    registry.ts                       # static modules array (asserts unique ids)
    storage.ts                        # featureToggles read/write/subscribe
    navigation.ts                     # one yt-navigate-finish dispatcher
    lifecycle.ts                      # bootstrap(modules), per-module ctx, toggle reaction
  modules/
    watch-later-toggle/
      index.ts                        # FeatureModule + click choreography
      selectors.ts                    # all DOM selectors, findOrWarn helper
      dom-utils.ts                    # waitFor / waitForGone via MutationObserver
  popup/
    index.html
    popup.ts                          # renders one checkbox per module
    popup.css
manifest.json                         # MV3, host_permissions: www.youtube.com
vite.config.ts                        # @crxjs/vite-plugin
```

## Permissions

- `host_permissions`: `*://www.youtube.com/*` (desktop only — `m.youtube.com`
  has a different DOM and is out of scope).
- `permissions`: `storage`. No `tabs`, `activeTab`, or `scripting`.

## Caveats

YouTube ships DOM changes regularly. Selectors are the load-bearing maintenance
surface; expect the occasional one-file patch under `src/modules/<feature>/selectors.ts`.
On a selector miss the module logs a single `console.warn` per session and
renders nothing — there is no user-facing error toast in v1.
