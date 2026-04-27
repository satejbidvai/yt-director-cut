## Context

Greenfield Chrome extension targeting desktop YouTube, built and shipped iteratively starting with one feature. Two competing pulls shape the design:

1. **Today's value**: ship a working Watch Later toggle on the watch page in the smallest possible package.
2. **Tomorrow's leverage**: expose a clean module contract so that subsequent features (one-click "Not Interested", minimalist sidebar, etc.) — and contributors — slot in with no framework rewrites.

Constraints relevant to the design:
- YouTube is a Polymer SPA; navigations between videos do not fire normal page loads.
- YouTube ships DOM changes regularly; selectors are inherently a maintenance surface.
- Watch Later cannot be modified via the public YouTube Data API (`playlistOperationUnsupported`); the only viable mechanism is simulated UI interaction.
- Manifest V3 is the only supported extension format for new submissions; content scripts run in an ISOLATED world by default.

## Goals / Non-Goals

**Goals:**
- One feature shipped end-to-end (Watch Later toggle on watch pages) that a real user can install and use.
- A minimal but coherent module framework: one contract function per module, one global navigation listener, one storage location for toggle state.
- All YouTube DOM coupling localized so a future redesign is a one-file patch per module.
- Dev loop fast enough that selector-tuning is pleasant (Vite + CRXJS HMR for content scripts).
- Toggle state syncs across the user's Chrome instances out of the box.

**Non-Goals:**
- Per-tile (feed) DOM machinery. Deferred to the "Not Interested" change.
- State-aware Add/Remove labelling. The v1 button is a single neutral toggle; YouTube's underlying checkbox is itself a toggle, so a single click correctly adds-or-removes regardless of prior state.
- A full options page. The toolbar popup is enough for v1.
- Mobile YouTube (`m.youtube.com`) — different DOM, out of scope.
- Internal-XHR action mechanism (`ytcfg`/InnerTube). Possible future optimization once DOM choreography proves insufficient.
- Chrome Web Store submission. Sideload-only for v1.
- Default-off feature flags. All v1 modules are assumed enabled; revisit when a feature actually needs opt-in.

## Decisions

### D1. Module contract: single `enable(ctx)` returning a cleanup function

**Choice:**
```ts
type FeatureModule = {
  id: string;            // unique key, used in chrome.storage
  name: string;          // shown in popup
  description?: string;  // optional, shown in popup
  enable(ctx: ModuleContext): () => void;  // returns cleanup
};

type ModuleContext = {
  onNavigate(handler: (url: URL) => void): void;
};
```

**Why over `{enable(), disable()}` two-function pattern:**
- All feature state lives in the `enable` closure — no module-level mutable vars to reset, no `this`.
- Cleanup is co-located with the setup that created it, mirroring React's `useEffect` discipline.
- Modules that don't care about navigation simply don't call `ctx.onNavigate` — the framework charges nothing for the optionality.

**Why over module-owned navigation listeners:**
- Every feature will care about `yt-navigate-finish`. Lifting it to the framework eliminates per-module boilerplate and ensures a single attach/detach point.

**Trade-off accepted:** features that need to react to other ambient signals (e.g., theme changes, fullscreen) will eventually want more `ctx` hooks. The contract grows additively when those needs are concrete; we resist speculative hooks now.

### D2. SPA navigation via `yt-navigate-finish`

**Choice:** the framework attaches a single `document.addEventListener('yt-navigate-finish', ...)` and forwards each event (with `new URL(location.href)`) to all registered handlers. It also fires once on initial bootstrap so modules don't need a separate "first run" path.

**Alternatives considered:**
- **`location.href` polling**: bulletproof but wastes CPU, and `yt-navigate-finish` has been stable across redesigns for years.
- **`chrome.webNavigation.onHistoryStateUpdated` from a service worker**: works, but adds a message-passing hop and is overkill when the page itself emits a perfectly good event.

**Risk:** YouTube could rename or remove the event. Mitigation: the listener is encapsulated in `framework/navigation.ts` — one file to swap to a fallback (e.g., URL polling) if it ever happens.

### D3. Click execution via DOM choreography (not internal XHR)

**Choice:** to toggle Watch Later, programmatically click YouTube's native Save button → wait for the playlist panel to render → click the "Watch later" checkbox row → close the panel. Keep the panel container `visibility: hidden` for the duration of the sequence to mask flicker.

**Why over internal XHR replay (`ytcfg` + InnerTube endpoints):**
- DOM breakage is loud (selector returns null → `console.warn` fires immediately in dev). Network-protocol breakage is quiet (200 with a different shape, or a token format change with no surface symptom until users complain).
- The "treat YouTube as a UI" mental model gives us a single maintenance discipline (selectors) rather than two (selectors + protocol).
- A future module that needs faster, no-flicker action can opt into MAIN-world + InnerTube without dragging the framework along.

**Why this is correct for the toggle semantics:** YouTube's "Save → Watch later" checkbox is a toggle in the underlying UI — clicking it adds when unchecked, removes when checked. So executing the action does not require us to know the current state, which is the central reason we don't need state detection (D5).

### D4. Storage: `chrome.storage.sync` for feature toggles

**Choice:** persist the per-module enabled boolean in `chrome.storage.sync` under a single key (e.g., `featureToggles: Record<string, boolean>`).

**Why:** users expect toggles to follow them across machines; the ~100KB sync quota is wildly more than enough for a finite list of booleans. `chrome.storage.local` would be needlessly device-bound.

### D5. No Watch Later state detection in v1

**Choice:** the injected button has a single neutral label (e.g., `📑 Watch Later`). It does not attempt to reflect whether the current video is already in WL.

**Why over best-effort tracking** (record our own actions in `chrome.storage`):
- Drifts the moment the user uses YouTube's native Save button alongside ours. A wrong label is worse than no label.
- The state-aware UI was a nice-to-have, not a hard requirement; a one-click neutral toggle is a clean and honest power-user affordance.

**Why over DOM-probe state detection** (open Save panel offscreen on each load, read checkbox state, close):
- Adds visible flicker on every watch-page load.
- Doubles the surface area of selectors that have to stay aligned with YouTube changes.

**Reopen condition:** if the neutral toggle proves confusing in real use, re-introduce state tracking as a `chrome.storage` layer behind the existing button — purely additive, no rearchitecture.

### D6. Native styling, action-row injection point

**Choice:** the button is appended into YouTube's existing action row (the row containing Like, Dislike, Share, Save), styled to match YouTube's native pill buttons by reusing the same custom-element / class structure as adjacent buttons.

**Why over a floating overlay:**
- One stable injection point per redesign instead of tracking player resize, theater mode, fullscreen, miniplayer.
- Free dark-mode support, free accessibility affordances.
- Mental coherence: the action row is the natural home for video-level actions.

### D7. Build pipeline: TypeScript + Vite + CRXJS

**Choice:** TypeScript source under `src/`, built by Vite with `@crxjs/vite-plugin` to a loadable `dist/`.

**Why:**
- The module contract is exactly the kind of typed-interface scaffolding that pays back immediately.
- CRXJS provides HMR for content scripts — the dev-loop unlock when iterating on YouTube selectors.
- `@types/chrome` catches a class of stupid bugs (wrong `chrome.storage` arg shapes) at edit time.

**Alternatives considered:** vanilla JS (cheaper to read, but loses HMR and type safety on the module contract); raw `tsc` without a bundler (half-measure, gives up HMR).

### D8. Manifest scope and permissions

**Choice:**
- `manifest_version: 3`
- `host_permissions: ["*://www.youtube.com/*"]` — desktop YouTube only.
- `permissions: ["storage"]` — that's it.
- `content_scripts`:
  - `matches: ["*://www.youtube.com/*"]`
  - `run_at: "document_idle"`
  - `world: "ISOLATED"` (default)
- `action.default_popup: "popup.html"`

**Why:**
- `m.youtube.com` has a different DOM not worth chasing in v1.
- No `tabs`, `activeTab`, or `scripting` permissions are needed; the content script accesses YouTube's DOM directly.
- `document_idle` is the right default for a feature that injects into the action row, which renders after initial paint. `document_start` is reserved for future hide-stuff CSS features that need to land before paint.

### D9. Selector discipline

**Choice:** each module owns a `selectors.ts` file. Selectors prefer (in order): YouTube's custom-element tag names (e.g., `ytd-watch-flexy`, `ytd-menu-renderer`, `tp-yt-paper-listbox`), `aria-label` and other semantic attributes, and class names only as a last resort. Every selector lookup that returns null logs a single `console.warn` with the selector key (deduplicated, so we don't spam).

**Why:** classes churn, custom-element tag names and aria attributes are far more stable. Centralization means a YouTube redesign is a one-file patch per module.

### D10. Failure mode: render nothing, log once

**Choice:** if any selector in the Watch Later module's injection sequence misses, the module logs a `console.warn` once per session and renders no button. No user-facing toast, no exception bubbled to the framework.

**Why:** v1's user is the developer; loud-and-silent (warn in console, blank in UI) is the right default. A toast layer can be added to the framework later if shareability demands it.

## Risks / Trade-offs

- **YouTube DOM redesigns** → Selectors break, button disappears. Mitigation: `selectors.ts` discipline (D9), `console.warn` on miss (D10), centralization keeps a fix to one file. Treat as expected maintenance.
- **`yt-navigate-finish` could go away** → Whole framework misses navigation events. Mitigation: encapsulated in `framework/navigation.ts` (D2); fallback to `location.href` polling is a one-file swap. Low likelihood — the event has been stable for years.
- **`visibility: hidden` flicker mask leaks** → If a selector mid-sequence misses, the panel could remain hidden. Mitigation: wrap the choreography in a `try`/`finally` that always restores `visibility`.
- **Future `MAIN` world feature** → Some future module (e.g., InnerTube replay) will want page JS access. Mitigation: MV3 supports per-content-script `world`. Add a second entry to `content_scripts` when needed; do not move the whole extension to MAIN.
- **`chrome.storage.sync` quota** → Hard cap ~100KB total, ~8KB per item. Storing only a `Record<string, boolean>` of toggle state is well below the limit even with dozens of features. Re-evaluate if we ever store substantial per-feature settings.
- **Sideload-only distribution** → Users have to enable Developer Mode and load unpacked. Acceptable for v1; revisit when sharing widens.

## Migration Plan

Greenfield repository, no migration. Deploy = `npm run build` → load `dist/` as an unpacked extension in Chrome. Rollback = unload the extension. No persistent server-side state.

## Open Questions

- **Exact native-styling approach for the injected button**: do we reuse YouTube's existing button web component (e.g., `yt-button-shape` / `yt-button-view-model`) by cloning a sibling and rewriting its label/handler, or do we author a button from scratch with the same class names? To be decided during implementation; cloning is likely cheaper but more brittle to web-component changes.
- **Icon for the Watch Later button**: emoji (`📑` / `🕒`) for v1 simplicity, or an inline SVG matching YouTube's stroke style? Defaulting to emoji unless it looks visibly out of place when implemented.
- **Popup styling baseline**: minimal CSS only, or pull in a tiny utility layer (e.g., a 3KB CSS reset)? Defaulting to hand-rolled minimal CSS in v1 to keep the build artifact small.
