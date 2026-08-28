# YouTube: Director's Cut

A Chrome extension for the small fixes YouTube keeps skipping.

<!-- TODO: hero GIF showing the popup + a feature in action -->

## Features

Every feature toggles on or off from the extension popup.

### Watch Later Toggle

Add or remove from Watch Later on the watch page in one click. No overflow menu, no playlist panel.

<!-- TODO: GIF -->

### Hide Already-Saved Videos

Videos already in Watch Later stay off your home feed.

<!-- TODO: GIF -->

### Not Interested

One button on every home feed card. No right-click, no three-dot menu.

<!-- TODO: GIF -->

### Caption Style

Bolder captions with text shadow and a semi-transparent background. Smaller on feed previews, larger on the watch page.

<!-- TODO: GIF -->

## How it works

YouTube is a single-page Polymer app. Normal page loads do not run when you navigate between pages. Watch Later has no public API (the Data API returns `playlistOperationUnsupported`). Director's Cut listens for YouTube's internal navigation events and drives the native UI where it has to.

## Install

Requires [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```sh
git clone https://github.com/satejbidvai/yt-director-cut.git
cd yt-director-cut
pnpm install
pnpm build:prod
```

Then load it into Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the generated `dist-prod/` folder

Open any page on `www.youtube.com`. Features are on by default. Toggle them from the toolbar popup.

## Architecture

Director's Cut uses a lightweight module system. Each feature is a self-contained `FeatureModule`:

```ts
type FeatureModule = {
  id: string;
  name: string;
  description?: string;
  enable(ctx: ModuleContext): () => void; // returns cleanup
};

type ModuleContext = {
  onNavigate(handler: (url: URL) => void): void;
};
```

`enable()` receives a context and returns a cleanup function. The framework calls cleanup when you turn a feature off, so setup and teardown stay together.

```
src/
  content.ts              entry point, bootstraps all modules
  background.ts           service worker (MV3 requirement, currently a stub)
  framework/
    types.ts              FeatureModule, ModuleContext interfaces
    registry.ts           static module list (asserts unique IDs)
    lifecycle.ts          bootstrap, per-module context, toggle reactions
    navigation.ts         single yt-navigate-finish dispatcher
    storage.ts            chrome.storage.sync read/write/subscribe
    styles.ts             shared YouTube CSS variable tokens
    style-injection.ts    managed <style> injection with dispose
  modules/
    watch-later-toggle/   watch page pill + playlist page remove buttons
    caption-style/        pure CSS caption restyling
    hide-playlist-feed/   hides already-saved videos from home feed
    not-interested/       one-click "Not interested" on feed cards
  shared/                 cross-module helpers (WL store, overflow menu, etc.)
  popup/                  toolbar popup UI (one toggle per feature)
```

For YouTube SPA behavior, selector strategy, and module internals, see [CONTEXT.md](./CONTEXT.md).
