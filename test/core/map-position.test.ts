import { describe, expect, it } from "vitest";
import { findBlocks } from "../../src/core/blocks/find-blocks.js";
import { toFilePosition } from "../../src/core/positions/map-position.js";

describe("toFilePosition", () => {
  it("adds the diagram's first line and the container prefix", () => {
    const [block] = findBlocks("- item\n\n  ```mermaid\n  flowchart LR\n    A --> B[x\n  ```\n", "markdown");
    expect(toFilePosition(block!, { line: 2, column: 12 })).toEqual({ line: 5, column: 14, diagramLine: 2, diagramColumn: 12 });
  });

  it("counts columns in UTF-16 code units", () => {
    const [block] = findBlocks('flowchart LR\n  A["😀😀 x"] --> B[End', "mermaid");
    // "  A[\"" is 5 units and each emoji is 2, so the end of the line is column 24.
    expect(toFilePosition(block!, { line: 2, column: 24 })).toMatchObject({ line: 2, column: 24 });
  });

  it("keeps positions inside the diagram", () => {
    const [block] = findBlocks("flowchart LR\n  A --> B", "mermaid");
    expect(toFilePosition(block!, { line: 9, column: 0 })).toEqual({ line: 2, column: 1, diagramLine: 2, diagramColumn: 1 });
    expect(toFilePosition(block!, { line: 0, column: 3 })).toMatchObject({ line: 1, diagramLine: 1 });
  });
});
