// Loads test/fixtures/corpus/cases.json and turns each case into the blocks Diagramist would check.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { blockFromText, findBlocks } from "../../src/core/blocks/find-blocks.js";
import type { Block } from "../../src/core/blocks/find-blocks.js";
import type { FilePosition, Notice, RendererId, TargetsFrom } from "../../src/core/result/schema.js";

export interface ExpectedRenderer {
  outcome: "pass" | "fail";
  code?: string;
  class?: string;
  severity?: "error" | "warning";
  retry?: boolean;
  position?: FilePosition | null;
}

export interface ExpectedBlock {
  index: number;
  firstLine: number;
  text: string | null;
  targets: RendererId[];
  targetsFrom: TargetsFrom;
  notices: string[];
  mermaid: ExpectedRenderer;
  pele: ExpectedRenderer;
}

export interface CorpusCase {
  id: string;
  kind: "markdown" | "mermaid" | "text";
  input: string | null;
  generate?: { type: "long-flowchart"; length: number };
  status: "checked" | "no-diagrams";
  blocks: ExpectedBlock[];
}

export const corpus: { renderers: Record<RendererId, string>; cases: CorpusCase[] } = JSON.parse(
  // Resolved from the repository root: in the jsdom environment import.meta.url is not a file URL.
  readFileSync(join(process.cwd(), "test/fixtures/corpus/cases.json"), "utf8"),
);

/** A flowchart of exactly `length` characters, over Pele's 50,000-character limit when length is 50,001. */
export function longFlowchart(length: number): string {
  let text = "flowchart LR\n";
  for (let i = 0; text.length < length; i++) text += `  N${i}[Node ${i}] --> N${i + 1}\n`;
  return text.slice(0, length);
}

export function caseInput(c: CorpusCase): string {
  return c.generate ? longFlowchart(c.generate.length) : (c.input ?? "");
}

export function expectedText(c: CorpusCase, block: ExpectedBlock): string {
  return block.text ?? caseInput(c);
}

export function caseBlocks(c: CorpusCase): { blocks: Block[]; notices: Notice[] } {
  const input = caseInput(c);
  if (c.kind === "text") {
    const { block, notices } = blockFromText(input);
    return { blocks: [block], notices };
  }
  return { blocks: findBlocks(input, c.kind), notices: [] };
}
