# AI Context — Productive YT

## What this is

A Manifest V3 Chrome extension for **desktop YouTube** (`www.youtube.com` only).
It adds small productivity features via a pluggable module system. Sideload-only
for now (no Chrome Web Store submission).

Current modules:

- **Watch Later toggle** — a one-click pill button in the watch-page action row
  that adds/removes the current video from the user's Watch Later playlist.
- **Caption Style** — opinionated caption styling (bold, text shadow, rounded
  semi-transparent background). Context-aware font sizing: smaller for feed
  hover previews, larger on the watch page. Pure CSS injection, no DOM queries.

## Domain knowledge you need

- **YouTube is a Polymer SPA.** Navigations between pages do not trigger full
  page loads. The only reliable navigation signal is the custom DOM event
  `yt-navigate-finish`. All modules must react to it rather than relying on
  `DOMContentLoaded` or `window.onload`.

- **Watch Later has no public API.** The YouTube Data API returns
  `playlistOperationUnsupported` for Watch Later. The only mechanism is
  **DOM choreography**: programmatically click the native Save button → wait
  for the playlist panel → click the "Watch later" row → dismiss the panel.
  The panel is masked with `visibility: hidden` during this sequence.

- **YouTube ships DOM changes regularly.** Selectors break. All DOM coupling
  is intentionally localised to one `selectors.ts` file per module. Prefer
  custom-element tag names (`ytd-watch-metadata`, `yt-button-view-model`) and
  `aria-label` attributes over class names.

- **YouTube collapses action-row buttons into an overflow menu** on some
  videos or narrower viewports (signed-in users have more buttons). The Save
  button may not be a visible pill — it can live inside the three-dot overflow.
  When collapsed, the Save action is **not** a `<button>` element; it becomes a
  `ytd-menu-service-item-renderer > tp-yt-paper-item` inside
  `ytd-popup-container > tp-yt-iron-dropdown > ytd-menu-popup-renderer`,
  identified by its `yt-formatted-string` text content ("Save"), with no
  `aria-label`. The module handles both paths: pill click and overflow-menu
  choreography (click three-dot → wait for dropdown → click Save item).

- **The Save panel structure changed** (as of early 2026). YouTube replaced
  `ytd-add-to-playlist-renderer` with `yt-sheet-view-model`, and
  `ytd-playlist-add-to-option-renderer` with `yt-list-item-view-model`
  (identified via `aria-label`). If selectors break again, this is where to
  look first.

## Architecture

```
src/
  content.ts                 — Entry point. Imports registry, calls bootstrap().
  framework/
    types.ts                 — FeatureModule and ModuleContext interfaces.
    registry.ts              — Static array of all modules (asserts unique IDs).
    lifecycle.ts             — bootstrap(): enables modules, builds per-module
                               ctx, reacts to toggle changes via storage listener.
    navigation.ts            — Single yt-navigate-finish dispatcher.
    storage.ts               — chrome.storage.sync helpers for featureToggles.
    styles.ts                — YouTube CSS variable tokens (yt.*) and pill sizing.
    style-injection.ts       — injectStyles(css) → dispose fn; one shared <style>.
  modules/
    watch-later-toggle/
      index.ts               — FeatureModule: injection, click choreography.
      selectors.ts           — All YouTube DOM queries for this module.
      dom-utils.ts           — waitFor / waitForGone via MutationObserver.
    caption-style/
      index.ts               — FeatureModule: pure CSS injection for captions.
  popup/
    index.html / popup.ts    — Toolbar popup: one checkbox per module.
```

### Module contract

```ts
type FeatureModule = {
  id: string;
  name: string;
  description?: string;
  enable(ctx: ModuleContext): () => void;  // returns cleanup
};

type ModuleContext = {
  onNavigate(handler: (url: URL) => void): void;
};
```

- `enable()` receives a context and returns a cleanup function (like React's
  `useEffect`). All teardown is co-located with setup.
- `ctx.onNavigate()` fires immediately with the current URL on registration,
  then on every `yt-navigate-finish`. Navigation handlers registered through
  a module's context are auto-unsubscribed when cleanup runs.
- Toggle state lives in `chrome.storage.sync` under `featureToggles`. Missing
  key = enabled (default-on). The popup writes to storage; the content script
  reacts via `chrome.storage.onChanged`.

### Adding a new module

1. Create `src/modules/<name>/index.ts` exporting a `FeatureModule`.
2. Put selectors in `src/modules/<name>/selectors.ts` (skip for CSS-only modules).
3. Register in `src/framework/registry.ts`.

## Build & dev

```sh
pnpm install
pnpm dev          # Vite + CRXJS HMR
pnpm build        # production → dist/
pnpm typecheck    # tsc --noEmit
```

Load `dist/` as an unpacked extension in `chrome://extensions`.

## Key constraints

- **MV3 only.** Content scripts run in ISOLATED world (no page JS access).
- **Permissions:** `storage` + `host_permissions: *://www.youtube.com/*`. No
  `tabs`, `activeTab`, or `scripting`.
- **No `m.youtube.com`** — different DOM, out of scope.
- **No state-aware button label.** The Watch Later button always reads
  "Watch Later" (neutral toggle). YouTube's checkbox is itself a toggle, so
  one click correctly adds or removes regardless of prior state.
- **Selector misses are silent in UI.** On failure, `warnOnceMiss()` logs a
  `console.warn` once per session and the module renders nothing.

## Styling

Two injection patterns, two strategies:

- **Embedded UI** (e.g. buttons inside YouTube's action row): inline styles
  composed from shared tokens in `framework/styles.ts`. Shadow DOM is not used
  here — it would break YouTube's flex layout and look foreign.
- **Standalone UI** (overlays, panels, sidebars): use Shadow DOM for full CSS
  isolation. No helper exists yet — build one when the first module needs it.

Shared infrastructure:

- **`framework/styles.ts`** — single source of YouTube CSS variable references
  (`yt.chipBg`, `yt.textPrimary`, etc.) and pill sizing constants. Modules
  import tokens and compose their own inline styles.
- **`framework/style-injection.ts`** — `injectStyles(css)` appends CSS to a
  shared `<style id="productive-yt-styles">` element and returns a dispose
  function. Use for pseudo-class rules (`:hover`, `:disabled`) that inline
  styles cannot express. The `<style>` element is lazily created and removed
  when the last consumer disposes.
- **Selector convention:** `#productive-yt-*` IDs for unique injected elements.
  No additional prefixing scheme is needed.

## Planned future modules

- One-click "Not Interested" on feed tiles
- Minimalist sidebar
- `document_start` CSS injection for hiding UI before paint
