import { describe, expect, it } from "vitest";
import type { Block } from "../../src/core/blocks/find-blocks.js";
import { hintFor, lineLateHint } from "../../src/core/hints/hints.js";
import type { HintInput } from "../../src/core/hints/hints.js";

const block: Block = {
  index: 1, firstLine: 10, lastLine: 13, text: "", prefixWidths: [0, 0, 0, 0],
  lines: ["flowchart LR", '  A --> "B label', "  C(round --> D", "  E --> F"],
};
const base: HintInput = { renderer: "mermaid", cls: "invalid", code: "parse", severity: "error", keyword: "flowchart", suggestion: null, newerType: false, block, diagramLine: null };

describe("hintFor", () => {
  it("tells agents not to edit for tool, size and support problems", () => {
    expect(hintFor({ ...base, cls: "tool" })).toMatch(/not the diagram/);
    expect(hintFor({ ...base, cls: "too-large" })).toMatch(/split it/);
    expect(hintFor({ ...base, renderer: "pele", cls: "unsupported", newerType: true })).toMatch(/only if you'll export it with Pele/);
    expect(hintFor({ ...base, cls: "unsupported", keyword: "zenuml" })).toBe('Mermaid.js doesn\'t support "zenuml" diagrams; don\'t rewrite the diagram because of this.');
    expect(hintFor({ ...base, cls: "unsupported", keyword: null })).toMatch(/this diagram type/);
  });

  it("helps with the type line", () => {
    expect(hintFor({ ...base, code: "unknown-type", suggestion: "flowchart" })).toMatch(/did you mean "flowchart"\?/);
    expect(hintFor({ ...base, code: "unsupported-diagram" })).toMatch(/such as "flowchart LR"/);
  });

  it("explains warnings from renderers that aren't targets", () => {
    expect(hintFor({ ...base, renderer: "pele", severity: "warning" })).toMatch(/export it with Pele/);
    expect(hintFor({ ...base, severity: "warning" })).toMatch(/GitHub and similar sites/);
  });

  it("explains invalid values", () => {
    expect(hintFor({ ...base, renderer: "pele", code: "semantic" })).toMatch(/date or a number/);
  });

  it("points at an unclosed bracket or quote on the previous line", () => {
    expect(hintFor({ ...base, diagramLine: 3 })).toBe('A quote opened on line 11 is not closed; errors are often reported one line late.');
    expect(lineLateHint(block, 4)).toBe('The "(" opened on line 12 is not closed; errors are often reported one line late.');
    expect(lineLateHint(block, 1)).toBeNull();
    expect(lineLateHint(block, 2)).toBeNull();
    expect(hintFor(base)).toBeNull();
  });
});
