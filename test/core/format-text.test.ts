import { describe, expect, it } from "vitest";
import { findBlocks } from "../../src/core/blocks/find-blocks.js";
import type { RawVerdict } from "../../src/core/renderers/types.js";
import { buildBlockResult, buildCheckResult, fileProblemResult } from "../../src/core/result/build-result.js";
import { formatText } from "../../src/core/result/format-text.js";
import { resolveTargets } from "../../src/core/targets/targets.js";

const meta = { checker: "diagramist 0.1.0", renderers: { mermaid: "12.3.0", pele: "1.13.0" } };

function check(text: string, verdicts: { mermaid: RawVerdict; pele: RawVerdict }[], kind: "markdown" | "mermaid" = "mermaid") {
  const blocks = findBlocks(text, kind).map((block, i) => buildBlockResult(block, resolveTargets(block), verdicts[i]!));
  return buildCheckResult(meta, "/repo/docs/flow.mmd", blocks);
}

const pass: RawVerdict = { outcome: "pass", type: "flowchart-v2" };

describe("formatText", () => {
  it("prints one short line for a passing file", () => {
    const text = formatText(check("flowchart LR\n  A --> B", [{ mermaid: pass, pele: pass }]), { displayPath: "docs/flow.mmd" });
    expect(text).toBe("docs/flow.mmd: 1 diagram, 0 errors, 0 warnings [Mermaid.js 12.3.0 parse, Pele 1.13.0 render]");
    expect(text.length).toBeLessThan(200);
  });

  it("prints errors with the untrusted snippet and hint, then warnings", () => {
    const result = check("flowchart LR\n  A[one --> B\n  C[two --> D", [{
      mermaid: { outcome: "fail", code: "parse", message: 'Expecting "]", got "["', position: { line: 3, column: 4 } },
      pele: { outcome: "fail", code: "syntax", message: 'Expecting "]", got "["', position: { line: 3, column: 4 } },
    }]);
    expect(formatText(result, { displayPath: "flow.mmd" })).toBe([
      "flow.mmd: 1 diagram, 1 error, 1 warning [Mermaid.js 12.3.0 parse, Pele 1.13.0 render]",
      'flow.mmd:3:4: error [Mermaid.js parse] Expecting "]", got "["',
      "  diagram text (untrusted):",
      "  2 |   A[one --> B",
      "  3 |   C[two --> D",
      '  hint: The "[" opened on line 2 is not closed; errors are often reported one line late.',
      'flow.mmd:3:4: warning [Pele syntax] Expecting "]", got "["',
      "  diagram text (untrusted):",
      "  2 |   A[one --> B",
      "  3 |   C[two --> D",
      "  hint: Pele can't draw this; change the diagram only if you'll export it with Pele.",
    ].join("\n"));
  });

  it("marks errors without a position and prints notices", () => {
    const result = check("sankey-beta\nA,B,1", [{
      mermaid: pass,
      pele: { outcome: "fail", code: "semantic", message: "Invalid value", position: null },
    }]);
    const lines = formatText(result).split("\n");
    expect(lines[1]).toBe("/repo/docs/flow.mmd:1: warning [Pele semantic] Invalid value (no position; the diagram starts here)");
    expect(lines.at(-1)).toMatch(/^\/repo\/docs\/flow\.mmd:1: notice \[beta-type\] "sankey-beta" is a beta diagram type/);
  });

  it("lists passing diagrams only when verbose", () => {
    const result = check("```mermaid\nflowchart LR\n  A --> B\n```\n", [{ mermaid: pass, pele: pass }], "markdown");
    expect(formatText(result, { displayPath: "README.md", verbose: true }).split("\n")[1]).toBe(
      "README.md:2: ok (flowchart-v2): Mermaid.js parses, Pele renders",
    );
  });

  it("caps the output at 4,000 characters, errors first", () => {
    const many = Array.from({ length: 80 }, (_, i) => `\`\`\`mermaid\nflowchart LR\n  A${i}[x --> B\n\`\`\`\n`).join("\n");
    const fail: RawVerdict = { outcome: "fail", code: "parse", message: 'Expecting "]", got end of line', position: { line: 2, column: 12 } };
    const result = check(many, Array.from({ length: 80 }, () => ({ mermaid: fail, pele: { ...fail, code: "syntax" } })), "markdown");
    const text = formatText(result, { displayPath: "README.md" });
    expect(text.length).toBeLessThanOrEqual(4000);
    expect(text).toMatch(/\n… \d+ more problem\(s\) or notice\(s\) not shown \(output capped at 4,000 characters\)$/);
    expect(text.split("\n")[1]).toContain(" error [Mermaid.js parse]");
  });

  it("names files with no diagrams and files that can't be checked", () => {
    expect(formatText(buildCheckResult(meta, "/repo/a.md", []), { displayPath: "a.md" })).toBe("a.md: no Mermaid diagrams found");
    expect(formatText(fileProblemResult(meta, null, "bad-input", "Pass either path or text."))).toBe("<text>: cannot check (bad-input): Pass either path or text.");
  });
});
