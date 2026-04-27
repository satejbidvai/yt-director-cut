## ADDED Requirements

### Requirement: Module registration

A `FeatureModule` with `id: "watch-later-toggle"` SHALL be exported from `src/modules/watch-later-toggle/index.ts` and registered in the framework registry.

#### Scenario: Module is present in the registry
- **WHEN** the content script bootstraps
- **THEN** the registry contains a module with `id: "watch-later-toggle"` and a human-readable `name`
- **AND** that module appears as a row in the popup

### Requirement: Button injection on watch pages only

When enabled, the module SHALL inject a button into YouTube's native action row (the row containing Like, Dislike, Share, Save) on watch pages, and SHALL NOT inject the button on any other YouTube page.

#### Scenario: Watch page renders the button
- **WHEN** the module is enabled
- **AND** the user is on a URL matching `https://www.youtube.com/watch*`
- **AND** YouTube has rendered the action row
- **THEN** a single button is present in the action row, anchored adjacent to the native Save button
- **AND** the button is styled to match adjacent native YouTube pill buttons (matching height, shape, and dark/light theme)

#### Scenario: Non-watch pages render no button
- **WHEN** the module is enabled
- **AND** the user is on a YouTube page whose URL pathname is not `/watch` (e.g., the home feed, a channel page, search results, the Shorts player)
- **THEN** no Watch Later toggle button is present anywhere on the page

#### Scenario: SPA navigation re-injects the button
- **WHEN** the module is enabled
- **AND** the user navigates from a non-watch page to a watch page (or between two watch pages) without a full page reload
- **THEN** any prior injected button is removed
- **AND** a fresh button is injected into the new page's action row once it has rendered

### Requirement: Single neutral toggle label

The button SHALL display a single neutral label (e.g., "Watch Later") without attempting to reflect whether the current video is already in the user's Watch Later playlist. The button SHALL NOT alternate between "Add" and "Remove" states in v1.

#### Scenario: Label is constant
- **WHEN** the button is rendered on any watch page, regardless of whether the current video is already in the user's Watch Later playlist
- **THEN** the button's label is the same neutral text in all cases

### Requirement: Click executes a Save → Watch later toggle via DOM

When the user clicks the injected button, the module SHALL programmatically click YouTube's native Save button, click the "Watch later" checkbox row in the resulting playlist panel, and dismiss the panel. The visual flicker of the panel opening and closing SHALL be masked.

#### Scenario: Click toggles Watch Later membership
- **WHEN** the user clicks the injected button while the current video is NOT in the user's Watch Later playlist
- **THEN** after the click sequence completes, the current video has been added to Watch Later
- **AND** the playlist panel is closed
- **AND** the user does not see the panel open and close (no visible flicker)

#### Scenario: Click on already-saved video removes it
- **WHEN** the user clicks the injected button while the current video IS already in the user's Watch Later playlist
- **THEN** after the click sequence completes, the current video has been removed from Watch Later
- **AND** the playlist panel is closed

#### Scenario: Mid-sequence selector miss recovers cleanly
- **WHEN** any required selector during the click sequence (Save button, panel container, "Watch later" row, dismiss target) returns null
- **THEN** the module aborts the sequence safely
- **AND** any visibility-mask applied to the panel is restored so the page is not left in a broken visual state
- **AND** a single `console.warn` is emitted identifying the missed selector

### Requirement: Centralized selectors and warn-on-miss

All YouTube DOM selectors used by this module SHALL live in `src/modules/watch-later-toggle/selectors.ts`. Each selector lookup that returns null SHALL emit a `console.warn` once per session, not per call.

#### Scenario: Selectors are localized
- **WHEN** a contributor searches the module directory for hard-coded YouTube class names, custom-element tag names, or `aria-label` strings
- **THEN** all such strings appear only in `selectors.ts`
- **AND** `index.ts` references them via named exports

#### Scenario: Repeated misses do not spam the console
- **WHEN** a selector returns null on a navigation event
- **AND** subsequent navigation events occur on the same session where the same selector continues to return null
- **THEN** `console.warn` for that selector is emitted at most once for the lifetime of the content script

### Requirement: Cleanup on disable

When the module's cleanup function runs, the injected button and all listeners attached to it SHALL be removed; no DOM nodes from this module SHALL remain.

#### Scenario: Disable removes all DOM
- **WHEN** the user flips the Watch Later toggle module to off in the popup while a watch page is open
- **THEN** the injected button is removed from the action row immediately
- **AND** no click handlers, navigation handlers, or other listeners installed by this module remain registered
