import { JSDOM } from "jsdom";
import { defineGlobals } from "./define-globals.ts";

export function install(): string[] {
  const { window } = new JSDOM("<!doctype html><html><head></head><body></body></html>");
  return defineGlobals(window);
}
