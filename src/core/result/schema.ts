// Result format, version 1. The normative definition is docs/designs/diagramist.md, Technical Plan section 4.
// Within version 1, fields are only ever added.

export type RendererId = "mermaid" | "pele";
export type ProblemClass = "invalid" | "unsupported" | "too-large" | "tool";
export type FileStatus =
  | "checked"
  | "no-diagrams"
  | "not-found"
  | "not-a-file"
  | "unsupported-file"
  | "too-large"
  | "not-text"
  | "bad-input";
export type NoticeCode = "beta-type" | "newer-type" | "bad-targets-comment" | "fences-stripped";

export interface FilePosition {
  line: number;
  column: number;
  diagramLine: number;
  diagramColumn: number;
}

export interface Problem {
  severity: "error" | "warning";
  class: ProblemClass;
  code: string;
  message: string;
  position: FilePosition | null;
  anchorLine: number;
  snippet: string | null;
  hint: string | null;
  retry: boolean;
}

export interface RendererResult {
  outcome: "pass" | "fail" | "tool-error";
  depth: "parse" | "render";
  errors: Problem[];
}

export interface Notice {
  code: NoticeCode;
  message: string;
}

export type TargetsFrom = { source: "default" } | { source: "comment"; line: number };

export interface BlockResult {
  index: number;
  firstLine: number;
  lastLine: number;
  type: string | null;
  targets: RendererId[];
  targetsFrom: TargetsFrom;
  results: Record<RendererId, RendererResult>;
  notices: Notice[];
}

export interface CheckSummary {
  blocks: number;
  errors: number;
  warnings: number;
  notices: number;
}

export interface CheckResult {
  schemaVersion: 1;
  checker: string;
  renderers: Record<RendererId, string>;
  file: string | null;
  status: FileStatus;
  message: string | null;
  blocks: BlockResult[];
  summary: CheckSummary;
}

const position = {
  type: ["object", "null"],
  required: ["line", "column", "diagramLine", "diagramColumn"],
  properties: {
    line: { type: "integer", minimum: 1 },
    column: { type: "integer", minimum: 1 },
    diagramLine: { type: "integer", minimum: 1 },
    diagramColumn: { type: "integer", minimum: 1 },
  },
  additionalProperties: false,
} as const;

const problem = {
  type: "object",
  required: ["severity", "class", "code", "message", "position", "anchorLine", "snippet", "hint", "retry"],
  properties: {
    severity: { enum: ["error", "warning"] },
    class: { enum: ["invalid", "unsupported", "too-large", "tool"] },
    code: { type: "string" },
    message: { type: "string", maxLength: 200 },
    position,
    anchorLine: { type: "integer", minimum: 1 },
    snippet: { type: ["string", "null"], maxLength: 200 },
    hint: { type: ["string", "null"] },
    retry: { type: "boolean" },
  },
} as const;

const rendererResult = {
  type: "object",
  required: ["outcome", "depth", "errors"],
  properties: {
    outcome: { enum: ["pass", "fail", "tool-error"] },
    depth: { enum: ["parse", "render"] },
    errors: { type: "array", maxItems: 1, items: problem },
  },
} as const;

/** JSON Schema for one `CheckResult`, used by tests to validate `diagramist check --json` output. */
export const checkResultJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Diagramist CheckResult v1",
  type: "object",
  required: ["schemaVersion", "checker", "renderers", "file", "status", "message", "blocks", "summary"],
  properties: {
    schemaVersion: { const: 1 },
    checker: { type: "string" },
    renderers: {
      type: "object",
      required: ["mermaid", "pele"],
      properties: { mermaid: { type: "string" }, pele: { type: "string" } },
    },
    file: { type: ["string", "null"] },
    status: {
      enum: ["checked", "no-diagrams", "not-found", "not-a-file", "unsupported-file", "too-large", "not-text", "bad-input"],
    },
    message: { type: ["string", "null"] },
    blocks: {
      type: "array",
      items: {
        type: "object",
        required: ["index", "firstLine", "lastLine", "type", "targets", "targetsFrom", "results", "notices"],
        properties: {
          index: { type: "integer", minimum: 1 },
          firstLine: { type: "integer", minimum: 1 },
          lastLine: { type: "integer", minimum: 0 },
          type: { type: ["string", "null"] },
          targets: { type: "array", items: { enum: ["mermaid", "pele"] } },
          targetsFrom: { type: "object", required: ["source"] },
          results: {
            type: "object",
            required: ["mermaid", "pele"],
            properties: { mermaid: rendererResult, pele: rendererResult },
          },
          notices: {
            type: "array",
            items: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { enum: ["beta-type", "newer-type", "bad-targets-comment", "fences-stripped"] },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
    summary: {
      type: "object",
      required: ["blocks", "errors", "warnings", "notices"],
      properties: {
        blocks: { type: "integer", minimum: 0 },
        errors: { type: "integer", minimum: 0 },
        warnings: { type: "integer", minimum: 0 },
        notices: { type: "integer", minimum: 0 },
      },
    },
  },
} as const;
