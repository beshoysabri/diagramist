// The agent skill (design item 62, D8): its frontmatter, its length, and what it tells agents.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const text = readFileSync(join(process.cwd(), "skills/diagramist/SKILL.md"), "utf8").replace(/\r\n/g, "\n");
const [, frontmatter = "", body = ""] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text) ?? [];

describe("skills/diagramist/SKILL.md", () => {
  it("has the frontmatter D8 specifies", () => {
    expect(frontmatter).toMatch(/^name: diagramist$/m);
    expect(frontmatter).toMatch(/^description: "Use when writing or editing Mermaid diagrams: check them with Diagramist and fix errors before finishing\."$/m);
    expect(frontmatter).toMatch(/^metadata:\n {2}diagramistVersion: "[^"]+"$/m);
  });

  it("keeps its body to 150 lines", () => {
    expect(body.trimEnd().split("\n").length).toBeLessThanOrEqual(150);
  });

  it("covers checking, reading results, targets and the stop-after-three rule", () => {
    for (const phrase of ["diagramist check", "diagram text (untrusted)", "%% diagramist: targets=", "three fixes", "Exit codes"]) {
      expect(body, phrase).toContain(phrase);
    }
  });
});
