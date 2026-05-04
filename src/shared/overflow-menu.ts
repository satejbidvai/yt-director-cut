/**
 * Shared YouTube overflow-menu choreography.
 *
 * Drives YouTube's three-dot overflow menu programmatically:
 *   1. Close any stale open dropdown.
 *   2. Mask the popup container with visibility:hidden.
 *   3. Click the trigger button.
 *   4. Wait for the dropdown to open (poll aria-hidden on tp-yt-iron-dropdown).
 *   5. Poll findItem() until a match or deadline.
 *   6. Click the matched item.
 *   7. Restore visibility in finally.
 *
 * Silent on failure — returns null so callers can warn with their own tags.
 */

const POPUP_CONTAINER = 'ytd-popup-container';

/**
 * Open a YouTube overflow dropdown, find and click an item.
 *
 * @param trigger   The button element to click to open the dropdown.
 * @param findItem  Called repeatedly with the open dropdown element until it
 *                  returns a non-null clickable element or the deadline expires.
 * @returns         The clicked element, or null on any failure.
 */
export async function clickOverflowMenuItem(
  trigger: HTMLElement,
  findItem: (dropdown: HTMLElement) => HTMLElement | null,
): Promise<HTMLElement | null> {
  const popupContainer = document.querySelector<HTMLElement>(POPUP_CONTAINER);
  if (!popupContainer) return null;

  await closeStaleDropdown(popupContainer);

  const previousVisibility = popupContainer.style.visibility;
  popupContainer.style.visibility = 'hidden';

  try {
    trigger.click();

    const dropdown = await waitForDropdownOpen(popupContainer, 2000);
    if (!dropdown) {
      dismissDropdown();
      return null;
    }

    const item = await pollForItem(dropdown, findItem, 2000);
    if (!item) {
      dismissDropdown();
      return null;
    }

    item.click();
    return item;
  } finally {
    popupContainer.style.visibility = previousVisibility;
  }
}

/**
 * If any dropdown is already open (e.g. from a failed attempt or a stale SPA
 * navigation), dismiss it with Escape. If Escape doesn't work (common after
 * SPA navigations — YouTube tears down event handlers but leaves the element),
 * force-reset aria-hidden so waitForDropdownOpen won't pick up the stale element.
 */
async function closeStaleDropdown(popup: HTMLElement): Promise<void> {
  const open = findOpenDropdown(popup);
  if (!open) return;

  dismissDropdown();

  const closed = await waitForAllDropdownsClosed(popup, 500);
  if (!closed) {
    for (const dd of popup.querySelectorAll<HTMLElement>('tp-yt-iron-dropdown')) {
      if (dd.getAttribute('aria-hidden') !== 'true') {
        dd.setAttribute('aria-hidden', 'true');
      }
    }
  }
}

function findOpenDropdown(popup: HTMLElement): HTMLElement | null {
  for (const dd of popup.querySelectorAll<HTMLElement>('tp-yt-iron-dropdown')) {
    if (dd.getAttribute('aria-hidden') !== 'true') return dd;
  }
  return null;
}

/**
 * Poll until any tp-yt-iron-dropdown inside the popup container transitions
 * to open. Returns the dropdown element, or null on timeout.
 */
function waitForDropdownOpen(
  popup: HTMLElement,
  timeoutMs: number,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      const dd = findOpenDropdown(popup);
      if (dd) return resolve(dd);
      if (Date.now() >= deadline) return resolve(null);
      setTimeout(check, 20);
    };
    check();
  });
}

/**
 * Poll until all dropdowns in the popup container are closed.
 */
function waitForAllDropdownsClosed(
  popup: HTMLElement,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      if (!findOpenDropdown(popup)) return resolve(true);
      if (Date.now() >= deadline) return resolve(false);
      setTimeout(check, 20);
    };
    check();
  });
}

/**
 * Poll findItem against the dropdown until it returns non-null or deadline.
 */
function pollForItem(
  dropdown: HTMLElement,
  findItem: (dropdown: HTMLElement) => HTMLElement | null,
  timeoutMs: number,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      const item = findItem(dropdown);
      if (item) return resolve(item);
      if (Date.now() >= deadline) return resolve(null);
      setTimeout(check, 30);
    };
    check();
  });
}

function dismissDropdown(): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
}
