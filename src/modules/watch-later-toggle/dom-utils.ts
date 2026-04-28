/**
 * Wait for a node satisfying `predicate` to appear under `root`. Resolves with
 * the matching node or rejects after `timeoutMs`.
 */
export function waitFor<T extends Element>(
  root: ParentNode,
  predicate: () => T | null,
  timeoutMs = 4000,
): Promise<T> {
  const immediate = predicate();
  if (immediate) return Promise.resolve(immediate);

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const observer = new MutationObserver(() => {
      const found = predicate();
      if (found) {
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(found);
      }
    });

    const observeRoot: Node = (root as unknown as Node) ?? document;
    observer.observe(observeRoot, { childList: true, subtree: true });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      reject(new Error("waitFor: timeout"));
    }, timeoutMs);
  });
}
