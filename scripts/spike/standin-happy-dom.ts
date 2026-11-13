import { Window } from "happy-dom";
import { defineGlobals } from "./define-globals.ts";

export function install(): string[] {
  // A new happy-dom window starts with an empty <html><head></head><body></body></html> document.
  return defineGlobals(new Window());
}
