// One-line hints for problems. Exact wording is reviewed in the P1 pull request.
import type { Block } from "../blocks/find-blocks.js";
import { RENDERER_NAMES } from "../policy/policy.js";
import type { ProblemClass, RendererId } from "../result/schema.js";

export interface HintInput {
  renderer: RendererId;
  cls: ProblemClass;
  code: string;
  severity: "error" | "warning";
  keyword: string | null;
  suggestion: string | null;
  newerType: boolean;
  block: Block;
  /** The reported diagram line, when the renderer gave a position. */
  diagramLine: number | null;
}

export function hintFor(input: HintInput): string | null {
  const name = RENDERER_NAMES[input.renderer];
  if (input.cls === "tool") return "Diagramist failed here, not the diagram; don't edit the diagram because of this.";
  if (input.cls === "too-large") return "The diagram is over the size limit; split it into smaller diagrams.";
  if (input.cls === "unsupported") {
    if (input.newerType) return "Pele doesn't support this diagram type yet; change the diagram only if you'll export it with Pele.";
    const what = input.keyword ? `"${input.keyword}" diagrams` : "this diagram type";
    return `${name} doesn't support ${what}; don't rewrite the diagram because of this.`;
  }
  if (input.code === "unknown-type" || input.code === "unsupported-diagram") {
    return input.suggestion
      ? `The first line must name a diagram type; did you mean "${input.suggestion}"?`
      : 'The first line must name a diagram type, such as "flowchart LR" or "sequenceDiagram".';
  }
  if (input.severity === "warning") {
    return input.renderer === "pele"
      ? "Pele can't draw this; change the diagram only if you'll export it with Pele."
      : "Mermaid.js can't parse this, so GitHub and similar sites won't draw it; fix it unless the diagram is only for Pele.";
  }
  if (input.code === "semantic") return "A value in the diagram is invalid, for example a date or a number.";
  return input.diagramLine === null ? null : lineLateHint(input.block, input.diagramLine);
}

/** Errors are often reported on the line after an unclosed bracket or quote. */
export function lineLateHint(block: Block, diagramLine: number): string | null {
  const previous = block.lines[diagramLine - 2];
  if (previous === undefined) return null;
  const fileLine = block.firstLine + diagramLine - 2;
  for (const [open, close] of [["[", "]"], ["(", ")"], ["{", "}"]] as const) {
    if (count(previous, open) > count(previous, close)) {
      return `The "${open}" opened on line ${fileLine} is not closed; errors are often reported one line late.`;
    }
  }
  if (count(previous, '"') % 2 === 1) return `A quote opened on line ${fileLine} is not closed; errors are often reported one line late.`;
  return null;
}

function count(text: string, character: string): number {
  return text.split(character).length - 1;
}
