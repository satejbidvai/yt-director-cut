## ADDED Requirements

### Requirement: Toolbar popup lists registered modules

The extension SHALL render a popup at `action.default_popup` that lists every module in the registry with its `name`, optional `description`, and a checkbox bound to the module's enabled state.

#### Scenario: Popup displays one row per module
- **WHEN** the user clicks the extension's toolbar icon
- **THEN** the popup opens and displays one row per registered `FeatureModule`
- **AND** each row shows the module's `name`, its `description` if present, and a checkbox

#### Scenario: Checkbox reflects stored state
- **WHEN** the popup opens
- **THEN** each module's checkbox reflects the value at `chrome.storage.sync.featureToggles[module.id]`
- **AND** modules with no stored value display as checked (default-enabled in v1)

### Requirement: Toggling a checkbox persists to storage

The popup SHALL update `chrome.storage.sync` whenever the user flips a checkbox, so the change propagates to running content scripts.

#### Scenario: Flipping a checkbox updates storage
- **WHEN** the user clicks a module's checkbox in the popup
- **THEN** the popup writes the updated `featureToggles` map to `chrome.storage.sync` before the popup closes
- **AND** any open YouTube tab's content script receives the change via `chrome.storage.onChanged` and runs the corresponding `enable` or cleanup

### Requirement: Popup remains usable with zero or many modules

The popup SHALL render correctly when only one module is registered (v1) and SHALL not require structural changes to support additional modules in future changes.

#### Scenario: Single-module popup
- **WHEN** the registry contains only the Watch Later toggle module
- **THEN** the popup renders one row and no extra placeholder text or empty-state UI

#### Scenario: Multi-module popup
- **WHEN** the registry contains multiple modules
- **THEN** the popup renders one row per module in registry order, each independently toggleable
