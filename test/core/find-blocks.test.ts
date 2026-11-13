import { describe, expect, it } from "vitest";
import { blockFromText, fileKind, findBlocks, normalizeText } from "../../src/core/blocks/find-blocks.js";
import { caseBlocks, corpus, expectedText } from "../helpers/corpus.js";

describe("findBlocks on the corpus", () => {
  for (const c of corpus.cases) {
    it(`${c.id}: finds the expected diagrams`, () => {
      const { blocks } = caseBlocks(c);
      expect(blocks.map((b) => b.firstLine)).toEqual(c.blocks.map((b) => b.firstLine));
      blocks.forEach((block, i) => {
        const expected = c.blocks[i]!;
        expect(block.index).toBe(expected.index);
        expect(block.text).toBe(expectedText(c, expected));
        expect(block.lastLine).toBe(block.firstLine + block.lines.length - 1);
      });
    });
  }
});

describe("findBlocks details", () => {
  it("records the container prefix stripped from each line", () => {
    const [list] = findBlocks("- item\n\n  ```mermaid\n  flowchart LR\n    A --> B\n  ```\n", "markdown");
    expect(list?.prefixWidths).toEqual([2, 2]);
    const [quote] = findBlocks("> ```mermaid\n> flowchart LR\n>   A --> B\n> ```\n", "markdown");
    expect(quote?.prefixWidths).toEqual([2, 2]);
  });

  it("falls back to leading whitespace when tabs inside a container were expanded", () => {
    const [block] = findBlocks("- item\n\n\t```mermaid\n\tflowchart LR\n\t\tA --> B\n\t```\n", "markdown");
    expect(block?.lines[0]).toBe("flowchart LR");
    expect(block?.prefixWidths.every((w) => w >= 1)).toBe(true);
  });

  it("ignores fences in other languages and accepts any case for the info string", () => {
    const blocks = findBlocks("```js\nconst a = 1;\n```\n\n```MERMAID\npie\n  \"a\": 1\n```\n", "markdown");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.firstLine).toBe(6);
  });

  it("treats a .mmd file as one diagram and an empty one as none", () => {
    expect(findBlocks("flowchart LR\n  A --> B\n", "mermaid")).toHaveLength(1);
    expect(findBlocks("\n  \n", "mermaid")).toHaveLength(0);
  });

  it("normalizes byte-order marks and line endings", () => {
    expect(normalizeText("﻿a\r\nb\rc")).toBe("a\nb\nc");
  });

  it("maps file extensions to kinds", () => {
    expect(fileKind("README.md")).toBe("markdown");
    expect(fileKind("notes.MARKDOWN")).toBe("markdown");
    expect(fileKind("flow.mmd")).toBe("mermaid");
    expect(fileKind("flow.Mermaid")).toBe("mermaid");
    expect(fileKind("photo.png")).toBeNull();
    expect(fileKind("Makefile")).toBeNull();
  });
});

describe("blockFromText", () => {
  it("keeps plain text as one diagram", () => {
    const { block, notices } = blockFromText("flowchart LR\n  A --> B\n");
    expect(block.text).toBe("flowchart LR\n  A --> B");
    expect(block.firstLine).toBe(1);
    expect(notices).toEqual([]);
  });

  it("removes pasted fence lines and says so", () => {
    const { block, notices } = blockFromText("~~~mermaid\nflowchart LR\n  A --> B\n~~~");
    expect(block.text).toBe("flowchart LR\n  A --> B");
    expect(notices.map((n) => n.code)).toEqual(["fences-stripped"]);
  });

  it("leaves an unmatched opening fence alone", () => {
    const { block, notices } = blockFromText("```mermaid\nflowchart LR");
    expect(block.lines).toHaveLength(2);
    expect(notices).toEqual([]);
  });
});
