## ADDED Requirements

### Requirement: Feature module contract

A feature module SHALL be a value matching the type `{ id: string; name: string; description?: string; enable(ctx: ModuleContext): () => void }`. The `enable` function performs setup and returns a cleanup function that fully tears down everything `enable` created.

#### Scenario: Cleanup undoes all setup
- **WHEN** a module's `enable(ctx)` runs and registers DOM elements, event listeners, navigation handlers, or any other side effects
- **AND** the cleanup function returned by `enable` is later invoked
- **THEN** every DOM element the module injected is removed
- **AND** every event listener and navigation handler the module registered is detached
- **AND** no further behavior from this module fires until `enable` is invoked again

#### Scenario: Module without navigation needs makes no nav registration
- **WHEN** a module's `enable(ctx)` runs and never calls `ctx.onNavigate`
- **THEN** the framework dispatches no navigation events to that module
- **AND** the absence of a navigation handler is not treated as an error

### Requirement: Module registry

The framework SHALL maintain a static registry of all known feature modules, imported at build time. There SHALL be no dynamic module loading in v1.

#### Scenario: Registry exposes all modules
- **WHEN** the content script bootstraps
- **THEN** the registry exposes the full list of `FeatureModule` instances known to the build
- **AND** module IDs are unique across the registry

### Requirement: Storage-backed enable/disable lifecycle

The framework SHALL persist a per-module enabled boolean in `chrome.storage.sync` under a single key (e.g., `featureToggles`) and SHALL invoke each module's `enable(ctx)` or its returned cleanup function in response to that state.

#### Scenario: Initial bootstrap enables stored-true modules
- **WHEN** the content script bootstraps on a YouTube page
- **THEN** for each module whose stored toggle is `true` (or whose toggle is absent — modules default to enabled in v1), the framework calls `enable(ctx)` exactly once and retains the returned cleanup function
- **AND** modules whose stored toggle is explicitly `false` have neither `enable` nor any handler invoked

#### Scenario: Toggling on at runtime enables a module
- **WHEN** the user flips a module's checkbox from off to on in the popup
- **AND** the popup writes the updated `featureToggles` map to `chrome.storage.sync`
- **THEN** the content script's `chrome.storage.onChanged` handler invokes `enable(ctx)` for that module, retains its cleanup, and the module's behavior takes effect on the active YouTube tab without requiring a page reload

#### Scenario: Toggling off at runtime disables a module
- **WHEN** the user flips a module's checkbox from on to off in the popup
- **AND** the popup writes the updated map to `chrome.storage.sync`
- **THEN** the content script invokes the cleanup function previously returned by that module's `enable`
- **AND** the module's injected DOM, listeners, and navigation handlers are gone from the active YouTube tab

### Requirement: Navigation dispatcher

The framework SHALL attach exactly one `document.addEventListener('yt-navigate-finish', ...)` listener for the lifetime of the content script and SHALL fan out each event to every navigation handler registered via `ctx.onNavigate`.

#### Scenario: Navigation handlers fire on SPA navigation
- **WHEN** an enabled module has registered a handler via `ctx.onNavigate`
- **AND** the user navigates from one YouTube page to another without a full page reload (i.e., a `yt-navigate-finish` event fires)
- **THEN** the framework invokes that handler exactly once with `new URL(location.href)`

#### Scenario: Navigation handlers fire once on initial bootstrap
- **WHEN** an enabled module registers a handler via `ctx.onNavigate` during its `enable`
- **THEN** the framework invokes that handler exactly once immediately after registration with the current URL, so modules do not need a separate first-run path

#### Scenario: Disabled modules receive no navigation events
- **WHEN** a module has been disabled (its cleanup has run)
- **AND** a `yt-navigate-finish` event fires
- **THEN** no handler previously registered by that module is invoked
