## Learned User Preferences

- Prefer a principal-engineer bar: lean, easy-to-reason-about code; avoid unnecessary fallbacks, loose `unknown`/`as` casting, and "just in case" branches—one clear fallback is enough when it is truly needed.
- Use **pnpm** for package installs and script invocations in this repository.
- Open to better approaches than the first idea suggested in chat; searching the web or proposing alternatives is welcome when it improves the outcome.
- User-visible strings (popup module titles/descriptions and similar) should stay short and benefit-oriented for everyday users, not technical explanations of implementation.
- Prefer the simplest workable approach for hover, layout, and visibility (CSS-first or small DOM/CSS changes) over JS that fires routinely on pointer movement when the goal can be met without it.
- For YouTube UI changes, confirm DOM structure and behavior on the live page (Chrome DevTools or Chrome MCP)—verify in the browser before claiming something works, rather than guessing selectors or declaring fixes done from code alone.
- Shared YouTube/DOM helpers should not emit generic internal logs on failure where the caller's module/feature context would blur; return errors or `null` and let the feature module log with its own tag so diagnostics show which feature failed.
- When something surfaces during a chat that should be done later, ask the user and append it to `todos.md` in the workspace root.
- Avoid cringe or AI-flavored marketing language in user-facing copy; prefer short, plain phrasing (e.g. dislikes words like "tame" and generic "minimal, opinionated" pitch lines).
- "Look native" means match **every** visible YouTube detail (gradients, rim lights, transitions)—never suggest removing a visual match as unnecessary cosmetic; the product goal is pixel-perfect native appearance.

## Learned Workspace Facts

- **YouTube: Director's Cut** is a Manifest V3 Chrome extension scoped to desktop **www.youtube.com**, built with Vite and a static module registry under `src/framework/` with feature modules under `src/modules/`.
- The product direction includes **many additional plugins** (on the order of several to ~10+); structure and styling should stay extensible for that growth.
- **Styling philosophy: inherit, don't replicate.** Embedded UI (e.g. action-row buttons) clones a native sibling via `shared/clone-button.ts` and replaces icon/label by content (find SVG, find text node by known value). No hand-rolled CSS tokens for native-looking elements. If the clone template can't be found, don't inject — log and wait for a code update.
- **CONTEXT.md** is the canonical document for human and AI context: product purpose, YouTube SPA behavior (`yt-navigate-finish`), Watch Later constraints, selector strategy, and architecture layout.
- YouTube-facing code is **selector- and DOM-structure sensitive**; coupling stays localized (e.g. per-module `selectors.ts`), and features must behave correctly when toggled off and on repeatedly.
- Development uses **`pnpm dev`** (Vite watch mode → `dist/`); after code changes, reload the unpacked extension in Chrome—expect **reload/rebuild**, not hot reload. **`pnpm build:prod`** outputs to **`dist-prod/`** for the final production artifact—never use it just to test changes.
- **Icons:** SVG sources live in `icons/`; after changes, run **`pnpm icons`** to re-rasterize all PNGs (uses `icons/rasterize.mjs` with **sharp**).
- **Module patterns:** `not-interested` and `watch-later-toggle` inject home-feed buttons and share **`isAdCard()`** from `src/shared/dom-utils.ts`; `clean-sidebar` and `quiet-downloads` are pure **CSS-hide** modules in the **Minimalist YouTube** group.
- Popup **module groups** live in **`src/framework/groups.ts`** (`moduleGroups` with id/name/description plus typed **`ModuleGroupId`**); modules opt in with **`FeatureModule.group`** matching a registry id (not ad hoc strings).
- Default MV3 content scripts run in an **isolated world**: page JS globals like **`ytcfg` are not available** to the extension; derive InnerTube/bootstrap values from **DOM-visible inline scripts** (e.g. `ytcfg.set` payloads), not `ytcfg.get()` from the content script.
- When **`yt-navigate-finish`** fires before the needed subtree exists, **`waitFor`** in **`src/shared/dom-utils.ts`** is the standard bounded wait (avoid a single synchronous `querySelector` miss on home feed, WL playlist, etc.).
