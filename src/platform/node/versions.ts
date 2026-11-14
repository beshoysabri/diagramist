// Version strings. The build injects them (scripts/build.mjs); tests get them from vitest.config.ts.
import type { RendererId } from "../../core/result/schema.js";

declare const __DIAGRAMIST_VERSION__: string | undefined;
declare const __MERMAID_VERSION__: string | undefined;
declare const __PELE_VERSION__: string | undefined;

export const DIAGRAMIST_VERSION: string = typeof __DIAGRAMIST_VERSION__ === "string" ? __DIAGRAMIST_VERSION__ : "0.0.0-dev";

export const RENDERER_VERSIONS: Readonly<Record<RendererId, string>> = {
  mermaid: typeof __MERMAID_VERSION__ === "string" ? __MERMAID_VERSION__ : "unknown",
  pele: typeof __PELE_VERSION__ === "string" ? __PELE_VERSION__ : "unknown",
};
