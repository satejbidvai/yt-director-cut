# Redline

A Chrome extension that fixes the small things YouTube won't.

<!-- TODO: hero GIF showing the popup + a feature in action -->

## Features

Every feature can be toggled independently from the extension popup.

### Watch Later Toggle

One-click add/remove from the watch page — no menu diving, no playlist panel.

<!-- TODO: GIF -->

### Hide Already-Saved Videos

Videos already in your Watch Later playlist are automatically hidden from the home feed.

<!-- TODO: GIF -->

### Not Interested

A single button on every home feed card to trigger "Not interested" instantly — no right-click, no overflow menu.

<!-- TODO: GIF -->

### Caption Style

Bolder, more readable captions with text shadow and a semi-transparent background. Sized appropriately for feed previews vs. the watch page.

<!-- TODO: GIF -->

## How it works

YouTube is a single-page Polymer app — normal page-load events never fire on navigation. Watch Later has no public API (the Data API returns `playlistOperationUnsupported`). Redline works by listening to YouTube's internal navigation events and automating the native UI where needed.

## Install

Requires [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```sh
git clone https://github.com/user/redline.git
cd redline
pnpm install
pnpm build
```

Then load it into Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the generated `dist/` folder

Open any page on `www.youtube.com` — features are active by default and toggleable from the toolbar popup.

## Architecture

Redline uses a lightweight module system. Each feature is a self-contained `FeatureModule`:

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

`enable()` receives a context and returns a cleanup function. The framework calls cleanup when the feature is toggled off — all teardown is co-located with setup.

```
src/
  content.ts              — entry point, bootstraps all modules
  background.ts           — service worker (MV3 requirement, currently a stub)
  framework/
    types.ts              — FeatureModule, ModuleContext interfaces
    registry.ts           — static module list (asserts unique IDs)
    lifecycle.ts          — bootstrap, per-module context, toggle reactions
    navigation.ts         — single yt-navigate-finish dispatcher
    storage.ts            — chrome.storage.sync read/write/subscribe
    styles.ts             — shared YouTube CSS variable tokens
    style-injection.ts    — managed <style> injection with dispose
  modules/
    watch-later-toggle/   — watch page pill + playlist page remove buttons
    caption-style/        — pure CSS caption restyling
    hide-playlist-feed/   — hides already-saved videos from home feed
    not-interested/       — one-click "Not interested" on feed cards
  shared/                 — cross-module helpers (WL store, overflow menu, etc.)
  popup/                  — toolbar popup UI (one toggle per feature)
```

For deeper context on YouTube's SPA behavior, selector strategy, and module internals, see [CONTEXT.md](./CONTEXT.md).
