## Learned User Preferences

- Prefer a principal-engineer bar: lean, easy-to-reason-about code; avoid unnecessary fallbacks, loose `unknown`/`as` casting, and “just in case” branches—one clear fallback is enough when it is truly needed.
- Use **pnpm** for package installs and script invocations in this repository.
- Open to better approaches than the first idea suggested in chat; searching the web or proposing alternatives is welcome when it improves the outcome.
- User-visible strings (popup module titles/descriptions and similar) should stay short and benefit-oriented for everyday users, not technical explanations of implementation.
- Prefer the simplest workable approach for hover, layout, and visibility (CSS-first or small DOM/CSS changes) over JS that fires routinely on pointer movement when the goal can be met without it.
- For YouTube feed/card UI or selectors, confirm structure against the live page (Chrome DevTools or a connected browser MCP) rather than guessing class names or DOM shape.
- Shared YouTube/DOM helpers should not emit generic internal logs on failure where the caller’s module/feature context would blur; return errors or `null` and let the feature module log with its own tag so diagnostics show which feature failed.

## Learned Workspace Facts

- **Redline** is a Manifest V3 Chrome extension scoped to desktop **www.youtube.com**, built with Vite and a static module registry under `src/framework/` with feature modules under `src/modules/`.
- The product direction includes **many additional plugins** (on the order of several to ~10+); structure and styling should stay extensible for that growth.
- **CONTEXT.md** is the canonical document for human and AI context: product purpose, YouTube SPA behavior (`yt-navigate-finish`), Watch Later constraints, selector strategy, and architecture layout.
- YouTube-facing code is **selector- and DOM-structure sensitive**; coupling stays localized (e.g. per-module `selectors.ts`), and features must behave correctly when toggled off and on repeatedly.
- Development uses Vite watch builds; after code changes, reload the unpacked extension in Chrome—expect **reload/rebuild**, not full hot reload of injected extension code like a normal web app.
- **Icons:** SVG sources live in `icons/`; after changes, re-rasterize PNGs with **sharp** via `pnpx`.
- **`not-interested`** (`src/modules/not-interested/`) adds a home-feed control that invokes YouTube **Not interested** through the overflow menu; **`watch-later-toggle`** is the reference pattern for comparable menu automation.
