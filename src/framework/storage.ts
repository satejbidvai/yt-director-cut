export const FEATURE_TOGGLES_KEY = "featureToggles";

export type FeatureToggles = Record<string, boolean>;

async function readToggles(): Promise<FeatureToggles> {
  const result = await chrome.storage.sync.get(FEATURE_TOGGLES_KEY);
  const value = result[FEATURE_TOGGLES_KEY];
  return value && typeof value === "object" ? (value as FeatureToggles) : {};
}

export async function getAllToggles(): Promise<FeatureToggles> {
  return readToggles();
}

export async function getEnabled(moduleId: string): Promise<boolean> {
  const toggles = await readToggles();
  // Default-on: missing key means enabled.
  return toggles[moduleId] !== false;
}

export async function setEnabled(moduleId: string, value: boolean): Promise<void> {
  const toggles = await readToggles();
  toggles[moduleId] = value;
  await chrome.storage.sync.set({ [FEATURE_TOGGLES_KEY]: toggles });
}

export type ToggleChangeHandler = (moduleId: string, nextEnabled: boolean) => void;

export function subscribeToToggleChanges(handler: ToggleChangeHandler): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName !== "sync") return;
    const change = changes[FEATURE_TOGGLES_KEY];
    if (!change) return;
    const oldVal = (change.oldValue ?? {}) as FeatureToggles;
    const newVal = (change.newValue ?? {}) as FeatureToggles;
    const ids = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
    for (const id of ids) {
      const oldEnabled = oldVal[id] !== false;
      const newEnabled = newVal[id] !== false;
      if (oldEnabled !== newEnabled) handler(id, newEnabled);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
