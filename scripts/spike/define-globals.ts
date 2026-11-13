// Shared by the stand-in installers of the P2 packaging test (scripts/spike/bundle-mermaid-worker.mjs).

/** The browser objects that design item 50 makes global before the Mermaid.js worker imports `mermaid`. */
export const GLOBAL_NAMES = ["window", "document", "navigator", "Element", "HTMLElement", "SVGElement", "DOMParser", "Node"] as const;

/** Installs a stand-in's browser objects as globals, and returns the names it doesn't provide. */
export function defineGlobals(window: object): string[] {
  const source = window as Record<string, unknown>;
  const missing: string[] = [];
  for (const name of GLOBAL_NAMES) {
    const value = name === "window" ? window : source[name];
    if (value === undefined) {
      missing.push(name);
      continue;
    }
    // Node 22 defines `navigator` as a getter, so plain assignment would throw.
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
  return missing;
}
