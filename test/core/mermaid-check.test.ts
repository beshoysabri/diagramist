// Runs in a jsdom environment (vitest.config.ts): Mermaid.js needs browser-like globals in Node.
import { describe, expect, it } from "vitest";
import { toFilePosition } from "../../src/core/positions/map-position.js";
import { checkWithMermaid, mapMermaidError } from "../../src/core/renderers/mermaid/check.js";
import { SAMPLES } from "../../src/core/samples/samples.js";
import { caseBlocks, corpus } from "../helpers/corpus.js";

describe("checkWithMermaid on the corpus", () => {
  for (const c of corpus.cases) {
    if (c.blocks.length === 0) continue;
    it(`${c.id}: matches the expected Mermaid.js result`, async () => {
      const { blocks } = caseBlocks(c);
      for (const [i, block] of blocks.entries()) {
        const expected = c.blocks[i]!.mermaid;
        const verdict = await checkWithMermaid(block.text);
        expect(verdict.outcome).toBe(expected.outcome);
        if (expected.outcome === "fail") {
          expect(verdict.code).toBe(expected.code);
          expect(verdict.position ? toFilePosition(block, verdict.position) : null).toEqual(expected.position);
          expect(verdict.message).not.toMatch(/\n/);
        }
      }
    });
  }
});

describe("checkWithMermaid", () => {
  it("parses every sample and reports its diagram type", async () => {
    for (const sample of SAMPLES) {
      const verdict = await checkWithMermaid(sample.text);
      expect(verdict.outcome, sample.keyword).toBe("pass");
      expect(verdict.type, sample.keyword).toBe(sample.mermaidType);
    }
  });

  it("never echoes the diagram in an unknown-type message", async () => {
    const verdict = await checkWithMermaid("secret token here\nmore secret");
    expect(verdict.code).toBe("unknown-type");
    expect(verdict.message).toBe("No diagram type detected.");
  });
});

describe("mapMermaidError", () => {
  const text = "flowchart LR\n  A --> B\n  C";
  it("maps jison errors, whose columns count from 0", () => {
    const error = { message: "Parse error on line 2:\n...\n---^\nExpecting 'SQE', 'PE', got 'NEWLINE'", hash: { loc: { last_line: 2, last_column: 6 } } };
    expect(mapMermaidError(error, text)).toEqual({ outcome: "fail", code: "parse", message: 'Expecting "]", ")", got end of line', position: { line: 2, column: 7 } });
  });

  it("moves end-of-diagram errors to just after the last character", () => {
    const error = { message: "Parse error", hash: { loc: { last_line: 9, last_column: 0 } } };
    expect(mapMermaidError(error, text).position).toEqual({ line: 3, column: 4 });
  });

  it("maps Langium lexer and parser errors, taking the earliest", () => {
    const error = {
      message: "Parsing failed: …",
      result: {
        lexerErrors: [{ line: 2, column: 8, message: "unexpected character: ->x<- at offset: 11, skipped 1 characters." }],
        parserErrors: [{ message: "Expecting token of type 'NUMBER_PIE' but found `\n`.", token: { startLine: 2, startColumn: 9 } }],
      },
    };
    expect(mapMermaidError(error, text)).toEqual({ outcome: "fail", code: "parse", message: 'Unexpected character "x"', position: { line: 2, column: 8 } });
    const parserOnly = { message: "Parsing failed", result: { parserErrors: [{ message: "Expecting token of type 'EOF' but found `bogus`.", token: { startLine: 3, startColumn: 3 } }] } };
    expect(mapMermaidError(parserOnly, text)).toMatchObject({ message: "Expecting end of diagram, got \"bogus\"", position: { line: 3, column: 3 } });
  });

  it("keeps Langium errors that have no position", () => {
    const error = { message: "Parsing failed", result: { parserErrors: [{ message: "Expecting token of type 'X' but found ``.", token: {} }] } };
    expect(mapMermaidError(error, text)).toMatchObject({ code: "parse", position: null, message: "Expecting 'X', got end of diagram" });
  });

  it("classifies any other exception as 'other'", () => {
    expect(mapMermaidError(new Error("Something odd\nwith detail"), text)).toEqual({ outcome: "fail", code: "other", message: "Something odd", position: null });
  });
});
