## Why

I want a personal YouTube productivity Chrome extension that I can grow over time and eventually share with others, starting with a small but real first feature. Building the framework + the first feature in one change establishes the plug-in architecture that every future feature (one-click "Not Interested", minimalist sidebar, etc.) will rely on, while shipping immediate user value.

## What Changes

- Scaffold a Manifest V3 Chrome extension (TypeScript + Vite + CRXJS) with HMR for content scripts.
- Introduce a small feature-module framework: each feature exports `{id, name, description?, enable(ctx) → cleanup}`; framework owns the global `yt-navigate-finish` listener and dispatches navigation events to modules via `ctx.onNavigate(handler)`.
- Persist per-feature on/off state in `chrome.storage.sync` so toggles follow the user across machines. All modules are assumed enabled by default in v1.
- Render a small popup (`action.default_popup`) listing each registered module with a checkbox; toggling runs the module's `enable`/cleanup at runtime.
- Centralize all YouTube DOM selectors in a single file per module, preferring custom-element tag names (e.g., `ytd-watch-flexy`) and `aria-label` attributes over class names. Log a `console.warn` once on any selector miss; render nothing rather than a user-facing error.
- Implement the first feature module: a **Watch Later toggle** button, anchored to the watch page's native action row (next to "Save"), styled as a native YouTube pill, with a single neutral label (no `Add` ↔ `Remove` flip in v1). Clicking it executes via DOM choreography — programmatically click native Save → click "Watch later" checkbox → close panel — with the panel briefly hidden via `visibility: hidden` to mask flicker. YouTube's Save → Watch later checkbox is itself a toggle, so a single click correctly adds-or-removes regardless of prior state.

## Capabilities

### New Capabilities
- `extension-shell`: Manifest V3 packaging, build pipeline (Vite + CRXJS + TypeScript), content-script bootstrap, host permissions, and asset layout.
- `feature-framework`: The module contract (`FeatureModule`, `ModuleContext`), the registry, the global `yt-navigate-finish` dispatcher, and the storage-backed enable/disable lifecycle.
- `popup-ui`: The toolbar popup that lists registered modules and binds checkboxes to `chrome.storage.sync`-backed toggle state.
- `watch-later-toggle`: The first feature module — a watch-page-anchored button that toggles the current video's membership in the user's Watch Later playlist via simulated UI interaction.

### Modified Capabilities
<!-- None — this is a greenfield change. -->

## Impact

- **New code only**: greenfield repository; no existing modules to refactor.
- **New tooling dependency**: Node + npm, Vite, `@crxjs/vite-plugin`, TypeScript, `@types/chrome`. Adds a `package.json`, `vite.config.ts`, `tsconfig.json`, and a build step that emits a loadable extension into `dist/`.
- **Browser permissions** (declared in `manifest.json`):
  - `host_permissions`: `*://www.youtube.com/*` (desktop only — mobile YouTube uses a different DOM and is out of scope).
  - `permissions`: `storage` (for `chrome.storage.sync`).
  - No `tabs`, `activeTab`, or `scripting` permissions in v1.
- **Distribution**: Sideload via Chrome's "Load unpacked" for v1. Chrome Web Store submission deferred.
- **Maintenance posture**: YouTube ships DOM changes regularly; centralized selectors and the once-per-miss warning are the load-bearing strategy. Treat selector breakage as expected, not exceptional.
- **Explicitly deferred** (not in this change): one-click "Not Interested", minimalist sidebar, per-tile DOM machinery, internal-XHR action mechanism, state-aware Add/Remove label, `defaultEnabled` per module, `onEnter`/`onLeave` lifecycle hooks, full options page, `document_start` CSS injection, `world: "MAIN"` modules.
