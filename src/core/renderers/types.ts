// What each renderer's check returns before Diagramist classifies it.

export interface RawPosition {
  /** 1-based line within the diagram text. */
  line: number;
  /** 1-based column, in UTF-16 code units. */
  column: number;
}

export interface RawVerdict {
  outcome: "pass" | "fail" | "tool-error";
  /** Pele's own code, or a Diagramist code for Mermaid.js and tool problems. */
  code?: string;
  /** One line, already cleaned of diagram context lines. */
  message?: string;
  position?: RawPosition | null;
  /** Diagram type reported by the renderer, if any. */
  type?: string | null;
}
