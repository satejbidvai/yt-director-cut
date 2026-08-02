/**
 * Clone a native YouTube button element to inherit its styles.
 *
 * Returns a deep clone with IDs stripped and no event listeners.
 * Returns null if `templateSelector` finds nothing inside `container`.
 */
export function cloneNativeButton(container: Element, templateSelector: string): HTMLElement | null {
  const template = container.querySelector<HTMLElement>(templateSelector);
  if (!template) return null;

  const clone = template.cloneNode(true) as HTMLElement;

  // Strip IDs to avoid duplicates in the document.
  if (clone.id) clone.removeAttribute('id');
  for (const el of clone.querySelectorAll('[id]')) {
    el.removeAttribute('id');
  }

  return clone;
}
