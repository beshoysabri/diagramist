import { describe, expect, it } from "vitest";
import type { Block } from "../../src/core/blocks/find-blocks.js";
import type { RawVerdict } from "../../src/core/renderers/types.js";
import { buildBlockResult, buildCheckResult, fileProblemResult } from "../../src/core/result/build-result.js";
import type { CheckMeta } from "../../src/core/result/build-result.js";
import { checkResultJsonSchema } from "../../src/core/result/schema.js";
import type { RendererId } from "../../src/core/result/schema.js";
import { resolveTargets } from "../../src/core/targets/targets.js";
import { caseBlocks, corpus } from "../helpers/corpus.js";
import type { ExpectedRenderer } from "../helpers/corpus.js";

const meta: CheckMeta = { checker: "diagramist 0.0.0-test", renderers: corpus.renderers };

function rawFrom(expected: ExpectedRenderer): RawVerdict {
  if (expected.outcome === "pass") return { outcome: "pass", type: "flowchart-v2" };
  const p = expected.position;
  return { outcome: "fail", code: expected.code!, message: "message", position: p ? { line: p.diagramLine, column: p.diagramColumn } : null };
}

describe("buildBlockResult on the corpus", () => {
  for (const c of corpus.cases) {
    it(`${c.id}: classifies, targets and annotates as expected`, () => {
      const { blocks, notices } = caseBlocks(c);
      const results = blocks.map((block, i) => {
        const expected = c.blocks[i]!;
        const verdicts = { mermaid: rawFrom(expected.mermaid), pele: rawFrom(expected.pele) };
        return buildBlockResult(block, resolveTargets(block), verdicts, notices);
      });
      results.forEach((result, i) => {
        const expected = c.blocks[i]!;
        expect(result.targets).toEqual(expected.targets);
        expect(result.targetsFrom).toEqual(expected.targetsFrom);
        expect(result.notices.map((n) => n.code).sort()).toEqual([...expected.notices].sort());
        for (const renderer of ["mermaid", "pele"] as RendererId[]) {
          const e = expected[renderer];
          const r = result.results[renderer];
          expect(r.outcome, renderer).toBe(e.outcome);
          expect(r.depth).toBe(renderer === "mermaid" ? "parse" : "render");
          if (e.outcome === "pass") {
            expect(r.errors).toEqual([]);
            continue;
          }
          const problem = r.errors[0]!;
          expect(problem.class, renderer).toBe(e.class);
          expect(problem.severity, renderer).toBe(e.severity);
          expect(problem.retry, renderer).toBe(e.retry);
          expect(problem.position, renderer).toEqual(e.position);
          expect(problem.anchorLine).toBe(expected.firstLine);
          if (problem.position) expect(problem.snippet).toMatch(new RegExp(`^(\\d+ \\| .*\\n)?${problem.position.line} \\| `));
          else expect(problem.snippet).toBeNull();
        }
      });
      const checked = buildCheckResult(meta, "/repo/file", results);
      expect(checked.status).toBe(c.status);
    });
  }
});

describe("classification details", () => {
  const block: Block = { index: 1, firstLine: 3, lastLine: 4, text: "futurechart-beta\n  a --> b", lines: ["futurechart-beta", "  a --> b"], prefixWidths: [0, 0] };
  const targets = { targets: ["mermaid"] as RendererId[], from: { source: "default" as const }, notices: [] };

  it("marks a type that Mermaid.js parses and Pele lacks as newer", () => {
    const result = buildBlockResult(block, targets, {
      mermaid: { outcome: "pass", type: "futurechart" },
      pele: { outcome: "fail", code: "unsupported-diagram", message: "No diagram type detected for the given text.", position: null },
    });
    expect(result.type).toBe("futurechart");
    expect(result.results.pele.errors[0]).toMatchObject({ class: "unsupported", severity: "warning", retry: false });
    expect(result.notices.map((n) => n.code).sort()).toEqual(["beta-type", "newer-type"]);
  });

  it("reports tool failures as errors that must not be retried", () => {
    const result = buildBlockResult(block, targets, {
      mermaid: { outcome: "pass" },
      pele: { outcome: "tool-error", code: "timeout", message: "Check took longer than 2,000 ms.", position: null },
    });
    expect(result.results.pele).toMatchObject({ outcome: "tool-error", errors: [{ class: "tool", code: "timeout", severity: "error", retry: false }] });
  });

  it("suggests a keyword for a typo and fills in missing codes", () => {
    const typo: Block = { ...block, text: "Flowchart LR", lines: ["Flowchart LR"] };
    const result = buildBlockResult(typo, targets, {
      mermaid: { outcome: "fail", code: "unknown-type", message: "No diagram type detected.", position: null },
      pele: { outcome: "fail", position: null },
    });
    expect(result.results.mermaid.errors[0]?.hint).toContain('did you mean "flowchart"');
    expect(result.results.pele.errors[0]).toMatchObject({ code: "other", class: "invalid", message: "" });
    expect(result.type).toBeNull();
  });

  it("cuts long snippets to 200 characters", () => {
    const long = "x".repeat(300);
    const wide: Block = { ...block, text: `flowchart LR\n${long}\n${long}`, lines: ["flowchart LR", long, long], lastLine: 5, prefixWidths: [0, 0, 0] };
    const result = buildBlockResult(wide, targets, {
      mermaid: { outcome: "fail", code: "parse", message: "m", position: { line: 3, column: 1 } },
      pele: { outcome: "pass" },
    });
    expect(result.results.mermaid.errors[0]!.snippet!.length).toBeLessThanOrEqual(200);
  });
});

describe("check results", () => {
  it("summarizes errors, warnings and notices", () => {
    const c = corpus.cases.find((x) => x.id === "sankey-abc")!;
    const { blocks } = caseBlocks(c);
    const block = buildBlockResult(blocks[0]!, resolveTargets(blocks[0]!), { mermaid: rawFrom(c.blocks[0]!.mermaid), pele: rawFrom(c.blocks[0]!.pele) });
    expect(buildCheckResult(meta, null, [block]).summary).toEqual({ blocks: 1, errors: 0, warnings: 1, notices: 1 });
  });

  it("describes files that can't be checked", () => {
    const result = fileProblemResult(meta, "/repo/photo.png", "unsupported-file", "Only .md, .markdown, .mmd and .mermaid files can be checked.");
    expect(result).toMatchObject({ schemaVersion: 1, status: "unsupported-file", blocks: [], summary: { blocks: 0, errors: 0, warnings: 0, notices: 0 } });
  });

  it("publishes a JSON Schema for version 1", () => {
    expect(checkResultJsonSchema.properties.schemaVersion).toEqual({ const: 1 });
    expect(checkResultJsonSchema.required).toContain("summary");
  });
});
