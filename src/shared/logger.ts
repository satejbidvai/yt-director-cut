/**
 * Create a module-scoped warn-once logger. Each returned function warns at
 * most once per `key` per session, preventing console spam when a selector
 * misses repeatedly (e.g. on every card in the feed).
 */
export function createWarnOnceMiss(tag: string) {
  const warned = new Set<string>();
  return (key: string, detail: string): void => {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(tag, `selector miss key="${key}"`, detail);
  };
}
