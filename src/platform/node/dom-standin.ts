// Gives Mermaid.js the browser objects it needs to parse in Node. P2 chose linkedom as the stand-in
// (docs/designs/packaging-notes.md). Only this file imports linkedom.
import { parseHTML } from "linkedom";

const GLOBAL_NAMES = ["window", "document", "navigator", "Element", "HTMLElement", "SVGElement", "DOMParser", "Node"] as const;

/** Installs the stand-in's objects as globals. Call it once, before `mermaid` is first imported. */
export function installDomStandin(): void {
  const { window } = parseHTML("<!doctype html><html><head></head><body></body></html>");
  const source = window as unknown as Record<string, unknown>;
  for (const name of GLOBAL_NAMES) {
    const value = name === "window" ? window : source[name];
    if (value === undefined) continue;
    // Node 22 defines `navigator` as a getter, so plain assignment would throw.
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
}
