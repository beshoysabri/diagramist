// Fixed render settings and the limits enforced in code.
// See docs/designs/diagramist.md, Technical Plan section 2 and "Risks & Limits".
import type { RendererId } from "../result/schema.js";

export const LIMITS = {
  /** Largest file the checker reads, in bytes. */
  fileBytes: 1024 * 1024,
  /** Largest diagram source, in characters (Pele's default, also applied before Mermaid.js parses). */
  diagramChars: 50_000,
  /** Most edges in a flowchart or agentflow (Pele's default). */
  edges: 5_000,
  /** Time allowed per diagram check, counted from when the worker is ready. */
  blockMs: 2_000,
  /** Time allowed for a worker to load its renderer. */
  workerStartupMs: 20_000,
  /** Queued diagnostics requests per VS Code window. */
  diagnosticsQueue: 8,
  /** Text output per file. */
  textChars: 4_000,
  /** One problem message. */
  messageChars: 200,
  /** One snippet (the line before and the reported line). */
  snippetChars: 200,
} as const;

/** Fixed reference time for Gantt charts, so a check never depends on today's date. */
export const FIXED_NOW = Date.UTC(2000, 0, 1);

/** Options for Pele's `render()` when checking. Diagram authors can't change them. */
export const PELE_CHECK_OPTIONS = {
  images: false,
  autoDirection: false,
  responsive: false,
  now: FIXED_NOW,
  limit: LIMITS.diagramChars,
  maxEdges: LIMITS.edges,
} as const;

/** Configuration for `mermaid.initialize()` when checking. */
export const MERMAID_CHECK_CONFIG = { startOnLoad: false, securityLevel: "strict" } as const;

export const RENDERERS: readonly RendererId[] = ["mermaid", "pele"];
export const RENDERER_NAMES: Readonly<Record<RendererId, string>> = { mermaid: "Mermaid.js", pele: "Pele" };
export const CHECK_DEPTH: Readonly<Record<RendererId, "parse" | "render">> = { mermaid: "parse", pele: "render" };

/** Decision D3: Mermaid.js is the must-pass renderer unless a diagram says otherwise. */
export const DEFAULT_TARGETS: readonly RendererId[] = ["mermaid"];
