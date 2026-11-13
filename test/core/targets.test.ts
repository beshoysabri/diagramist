import { describe, expect, it } from "vitest";
import { findBlocks } from "../../src/core/blocks/find-blocks.js";
import { parseTargets, resolveTargets } from "../../src/core/targets/targets.js";

const block = (text: string) => findBlocks(text, "mermaid")[0]!;

describe("parseTargets", () => {
  it("accepts the four documented values in any case and order", () => {
    expect(parseTargets("mermaid")).toEqual(["mermaid"]);
    expect(parseTargets("PELE")).toEqual(["pele"]);
    expect(parseTargets("pele, mermaid")).toEqual(["pele", "mermaid"]);
    expect(parseTargets("mermaid,mermaid")).toEqual(["mermaid"]);
    expect(parseTargets("none")).toEqual([]);
  });

  it("rejects anything else", () => {
    expect(parseTargets("")).toBeNull();
    expect(parseTargets("pel")).toBeNull();
    expect(parseTargets("none,pele")).toBeNull();
  });
});

describe("resolveTargets", () => {
  it("defaults to Mermaid.js", () => {
    expect(resolveTargets(block("flowchart LR\n  A --> B"))).toEqual({ targets: ["mermaid"], from: { source: "default" }, notices: [] });
  });

  it("reads the comment on the first line or directly after the type line", () => {
    expect(resolveTargets(block("%% diagramist: targets=pele\nflowchart LR"))).toMatchObject({ targets: ["pele"], from: { source: "comment", line: 1 } });
    expect(resolveTargets(block("flowchart LR\n%% Diagramist: Targets = mermaid, pele\n  A --> B"))).toMatchObject({ targets: ["mermaid", "pele"], from: { source: "comment", line: 2 } });
  });

  it("ignores the comment anywhere else", () => {
    expect(resolveTargets(block("flowchart LR\n  A --> B\n%% diagramist: targets=pele"))).toMatchObject({ from: { source: "default" } });
  });

  it("finds the type line after Mermaid frontmatter", () => {
    const text = "---\ntitle: X\n---\nflowchart LR\n%% diagramist: targets=none\n  A --> B";
    expect(resolveTargets(block(text))).toMatchObject({ targets: [], from: { source: "comment", line: 5 } });
  });

  it("keeps the default and adds a notice for an unknown value", () => {
    const result = resolveTargets(block("%% diagramist: targets=pel\nflowchart LR"));
    expect(result.targets).toEqual(["mermaid"]);
    expect(result.notices.map((n) => n.code)).toEqual(["bad-targets-comment"]);
  });

  it("handles an empty diagram", () => {
    expect(resolveTargets({ index: 1, firstLine: 2, lastLine: 1, text: "", lines: [], prefixWidths: [] }).from).toEqual({ source: "default" });
  });
});
