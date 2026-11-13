import { describe, expect, it } from "vitest";
import { findKeyword, firstKeyword, isBetaKeyword, KEYWORDS, suggestKeyword } from "../../src/core/compat/keywords.js";
import { betaNotice, newerTypeNotice } from "../../src/core/compat/notices.js";
import { SAMPLES } from "../../src/core/samples/samples.js";

describe("keywords", () => {
  it("has exactly one sample for every built-in keyword", () => {
    const builtIn = KEYWORDS.filter((k) => !k.external).map((k) => k.keyword).sort();
    expect(SAMPLES.map((s) => s.keyword).sort()).toEqual(builtIn);
    for (const sample of SAMPLES) expect(firstKeyword(sample.text), sample.keyword).toBe(sample.keyword);
  });

  it("marks ZenUML as external", () => {
    expect(findKeyword("zenuml")?.external).toBe(true);
    expect(findKeyword("Flowchart")?.keyword).toBe("flowchart");
    expect(findKeyword("nonsense")).toBeUndefined();
  });

  it("finds the type line past blank lines, comments, directives and frontmatter", () => {
    expect(firstKeyword("\n%% a comment\n%%{init: {}}%%\nflowchart LR")).toBe("flowchart");
    expect(firstKeyword("---\ntitle: x\nconfig: {}\n---\npie title Pets")).toBe("pie");
    expect(firstKeyword("   \n")).toBeNull();
  });

  it("suggests the closest keyword within two edits", () => {
    expect(suggestKeyword("flowchar")).toBe("flowchart");
    expect(suggestKeyword("sequencediagram")).toBe("sequenceDiagram");
    expect(suggestKeyword("Gant")).toBe("gantt");
    expect(suggestKeyword("completely-different")).toBeNull();
    expect(suggestKeyword("zenum")).toBeNull();
  });

  it("recognises beta keywords and words their notices", () => {
    expect(isBetaKeyword("venn-beta")).toBe(true);
    expect(isBetaKeyword("venn")).toBe(false);
    expect(betaNotice("venn-beta").message).toContain('"venn-beta"');
    expect(newerTypeNotice(null).message).toMatch(/^This diagram type/);
    expect(newerTypeNotice("x-beta").message).toMatch(/^"x-beta"/);
  });
});
