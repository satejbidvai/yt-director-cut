## 1. Repository scaffolding

- [x] 1.1 Initialize `package.json` with `npm init -y`; set `"type": "module"` and a sensible name/version
- [x] 1.2 Install dev dependencies: `vite`, `@crxjs/vite-plugin`, `typescript`, `@types/chrome`
- [x] 1.3 Add `tsconfig.json` (target ES2022, `module: "ESNext"`, `moduleResolution: "Bundler"`, `strict: true`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`)
- [x] 1.4 Add `vite.config.ts` wiring `@crxjs/vite-plugin` to read `manifest.json`
- [x] 1.5 Add npm scripts: `"dev": "vite"`, `"build": "vite build"`, `"typecheck": "tsc --noEmit"`
- [x] 1.6 Create the directory skeleton: `src/framework/`, `src/modules/watch-later-toggle/`, `src/popup/`, plus an empty `src/content.ts`
- [x] 1.7 Add `.gitignore` covering `node_modules/`, `dist/`, and editor noise
- [ ] 1.8 Commit the initial scaffold so subsequent work is reviewable

## 2. Manifest and content-script entry

- [x] 2.1 Write `manifest.json` with `manifest_version: 3`, `name`, `version`, `description`, `action.default_popup: "src/popup/index.html"`, and `icons` (placeholder icons OK for v1)
- [x] 2.2 Declare `host_permissions: ["*://www.youtube.com/*"]` and `permissions: ["storage"]`; declare nothing else
- [x] 2.3 Declare a single `content_scripts` entry: `matches: ["*://www.youtube.com/*"]`, `js: ["src/content.ts"]`, `run_at: "document_idle"`, default ISOLATED world
- [ ] 2.4 Verify a stub `src/content.ts` (e.g., a single `console.info`) loads on `www.youtube.com` and not on `m.youtube.com` after `npm run build` and Load Unpacked

## 3. Framework: types and registry

- [x] 3.1 In `src/framework/types.ts`, define `FeatureModule` (`id`, `name`, `description?`, `enable(ctx) → cleanup`) and `ModuleContext` (`onNavigate(handler: (url: URL) => void): void`) per design D1
- [x] 3.2 In `src/framework/registry.ts`, export a static `modules: FeatureModule[]` array imported at build time; assert IDs are unique on import
- [x] 3.3 Wire the Watch Later module's stub export into the registry array (real implementation lands in section 6)

## 4. Framework: storage and toggle state

- [x] 4.1 In `src/framework/storage.ts`, expose typed helpers for reading and writing `featureToggles: Record<string, boolean>` from `chrome.storage.sync`
- [x] 4.2 Implement `getEnabled(moduleId): Promise<boolean>` that returns `true` when the key is missing (default-on per D4 / proposal)
- [x] 4.3 Implement `setEnabled(moduleId, value): Promise<void>` that merges into the existing `featureToggles` map
- [x] 4.4 Expose a subscription helper that wires `chrome.storage.onChanged` and emits `(moduleId, nextEnabled)` events to consumers in the content script

## 5. Framework: navigation dispatcher and lifecycle

- [x] 5.1 In `src/framework/navigation.ts`, attach exactly one `document.addEventListener('yt-navigate-finish', ...)` for the lifetime of the content script; expose `subscribe(handler)` and `unsubscribe(handler)`
- [x] 5.2 In `src/framework/lifecycle.ts`, implement `bootstrap(modules)` that, for each module: reads stored enabled state, and if enabled, calls `enable(ctx)` and stores the returned cleanup keyed by module ID
- [x] 5.3 Build the per-module `ModuleContext` so that `ctx.onNavigate(handler)` registers `handler` with the navigation dispatcher AND immediately invokes `handler(new URL(location.href))` once with the current URL
- [x] 5.4 On `chrome.storage.onChanged` for `featureToggles`, diff old vs new and run the corresponding module's `enable` (collecting cleanup) or run the previously-stored cleanup
- [x] 5.5 Ensure all subscribed navigation handlers registered through a module's context are unsubscribed automatically when that module's cleanup runs (covered by the cleanup function the module returns; document this contract in `lifecycle.ts`)
- [x] 5.6 Wire `src/content.ts` to import the registry and call `bootstrap(modules)`

## 6. Watch Later module: selectors and injection

- [x] 6.1 In `src/modules/watch-later-toggle/selectors.ts`, define typed selector helpers preferring custom-element tag names (e.g., `ytd-watch-flexy`, `ytd-menu-renderer`) and `aria-label` attributes; export a `findOrWarn(key, root, selector)` helper that emits a single `console.warn` per `key` per session
- [x] 6.2 In `src/modules/watch-later-toggle/index.ts`, export the `FeatureModule` with `id: "watch-later-toggle"`, `name: "Watch Later toggle"`, and a short `description`
- [x] 6.3 Implement `enable(ctx)`: register a navigation handler via `ctx.onNavigate` that synchronizes the button presence with the current URL
- [x] 6.4 Inside the navigation handler, remove any previously injected button before deciding whether to inject a new one (idempotent)
- [x] 6.5 If `url.pathname !== '/watch'`, return without injecting
- [x] 6.6 Wait for the action row to be present (single `MutationObserver` scoped to the watch container, with a reasonable timeout) — do not poll
- [x] 6.7 Inject a button into the action row anchored next to the native Save button; reuse YouTube's button class structure so styling matches native pills (open question O1 in design — pick clone-vs-author during implementation)
- [x] 6.8 Set the button's label to a single neutral string (e.g., "Watch Later" with an emoji prefix); no Add/Remove flip
- [x] 6.9 Return a cleanup function that removes the injected button and any DOM listeners attached to it

## 7. Watch Later module: click choreography

- [x] 7.1 Wire the injected button's `click` handler to a `toggleWatchLater()` function in the same module
- [x] 7.2 Implement `toggleWatchLater()`: locate the native Save button via `selectors.ts`; if missing, warn and abort
- [x] 7.3 Apply a `visibility: hidden` mask to the playlist panel container before the sequence; wrap the entire sequence in `try`/`finally` that always restores visibility (covers risk in design)
- [x] 7.4 Programmatically click the native Save button; await the playlist panel becoming present (`MutationObserver`, bounded timeout)
- [x] 7.5 Locate the "Watch later" row inside the panel via `selectors.ts`; if missing, warn and abort (the `finally` block restores visibility)
- [x] 7.6 Programmatically click the "Watch later" row to toggle membership (relies on YouTube's underlying checkbox toggle semantics, per design D3 / D5)
- [x] 7.7 Dismiss the panel (e.g., click the panel's close affordance, or simulate an outside click); confirm panel is gone before exiting the sequence
- [ ] 7.8 Verify on a real watch page that a single button click (a) adds an unsaved video to Watch Later and (b) on a second click removes it, with no visible flicker

## 8. Popup UI

- [x] 8.1 Create `src/popup/index.html` with a minimal shell: a header and a `<ul id="modules">` placeholder
- [x] 8.2 Create `src/popup/popup.ts` that imports the registry and reads `featureToggles` from `chrome.storage.sync`
- [x] 8.3 For each module, render a row containing the module's `name`, optional `description`, and a checkbox bound to its current enabled state (default checked when key is missing)
- [x] 8.4 On checkbox change, write the updated `featureToggles` map to `chrome.storage.sync` (the open YouTube tab's content script reacts via `chrome.storage.onChanged`, per section 5.4)
- [x] 8.5 Add minimal hand-rolled CSS so the popup is legible on light and dark Chrome themes (per design open question O3)

## 9. Manual verification

- [ ] 9.1 Run `npm run build`; load `dist/` as an unpacked extension in Chrome
- [ ] 9.2 Open a YouTube watch page; confirm the Watch Later button appears in the action row, styled to match adjacent pills
- [ ] 9.3 Click the button on a video that is NOT in Watch Later; confirm via YouTube's own Save panel that the video has been added
- [ ] 9.4 Click the button again on the same video; confirm it has been removed
- [ ] 9.5 Navigate to the home feed (no full reload); confirm the button does not appear and no console errors fire
- [ ] 9.6 Navigate from the home feed back into a different watch page; confirm a fresh button is injected (i.e., navigation handler ran)
- [ ] 9.7 Open the popup; uncheck the Watch Later module; confirm the button disappears from the open watch tab without a reload
- [ ] 9.8 Re-check the module in the popup; confirm the button reappears without a reload
- [ ] 9.9 Sign in to a second Chrome profile/instance with sync enabled; confirm the toggle state propagates
- [ ] 9.10 Confirm `m.youtube.com` is unaffected (no content script injected)

## 10. Wrap up

- [x] 10.1 Run `npm run typecheck` and resolve any reported issues
- [x] 10.2 Run `npm run build` cleanly
- [x] 10.3 Add a top-level `README.md` covering: install (Load Unpacked from `dist/`), dev loop (`npm run dev`), and the module-contract sketch from design D1 so future contributors can add a module without reading every file
