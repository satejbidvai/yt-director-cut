## ADDED Requirements

### Requirement: Manifest V3 packaging

The extension SHALL ship as a Manifest V3 Chrome extension with `manifest_version: 3` and a single content script bundle scoped to desktop YouTube.

#### Scenario: Manifest declares MV3 and required permissions
- **WHEN** the extension is loaded into Chrome
- **THEN** `manifest.json` declares `manifest_version: 3`, `host_permissions: ["*://www.youtube.com/*"]`, and `permissions: ["storage"]`, and declares no other host or API permissions

#### Scenario: Content script runs only on desktop YouTube
- **WHEN** the user navigates to a URL on `www.youtube.com`
- **THEN** the bundled content script is injected with `run_at: "document_idle"` in the `ISOLATED` world
- **AND** the content script is NOT injected on `m.youtube.com`, `music.youtube.com`, or any non-YouTube origin

### Requirement: TypeScript build pipeline

The repository SHALL build with Vite + `@crxjs/vite-plugin` from TypeScript sources under `src/` into a loadable extension under `dist/`.

#### Scenario: Production build emits a loadable extension
- **WHEN** the developer runs `npm run build`
- **THEN** Vite emits `dist/manifest.json`, the bundled content script, the popup HTML/JS, and any static assets
- **AND** loading `dist/` in Chrome via "Load unpacked" produces a working extension

#### Scenario: Development build provides HMR for content scripts
- **WHEN** the developer runs `npm run dev` and edits a `.ts` file under `src/modules/` or `src/framework/`
- **THEN** the content script reloads in the open YouTube tab without requiring the developer to manually reload the extension or the page

### Requirement: Repository layout

The repository SHALL keep framework, modules, and popup code in distinct directories so future modules can be added without touching unrelated code.

#### Scenario: Layout follows the agreed structure
- **WHEN** a contributor inspects the repository root
- **THEN** they find `src/framework/` (registry, navigation dispatcher, storage helpers), `src/modules/<module-id>/` (one directory per feature module, each containing at minimum `index.ts` and `selectors.ts` where applicable), `src/popup/` (popup HTML and TypeScript), `src/content.ts` (entry point that bootstraps the registry), `manifest.json`, `vite.config.ts`, `tsconfig.json`, and `package.json`

### Requirement: Sideload-friendly distribution for v1

The build output SHALL be installable in Chrome via Developer Mode "Load unpacked" with no Web Store submission required.

#### Scenario: Sideload install works end-to-end
- **WHEN** the user enables Chrome Developer Mode and loads the `dist/` directory as an unpacked extension
- **THEN** the extension's toolbar icon appears, the popup opens, and the Watch Later toggle button renders on YouTube watch pages
