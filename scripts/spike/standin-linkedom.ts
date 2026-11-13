import { parseHTML } from "linkedom";
import { defineGlobals } from "./define-globals.ts";

export function install(): string[] {
  const { window } = parseHTML("<!doctype html><html><head></head><body></body></html>");
  return defineGlobals(window);
}
