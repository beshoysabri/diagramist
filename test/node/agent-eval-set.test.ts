// Keeps the agent evaluation set (design item 70) honest across renderer upgrades: every planted
// error must be a Mermaid.js error, and every intended fix must pass both renderers.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Coordinator } from "../../src/platform/node/coordinator.js";
import { RENDERER_VERSIONS } from "../../src/platform/node/versions.js";
import { testWorkerUrl } from "../helpers/checker-paths.js";

interface EvalDiagram {
  id: string;
  category: string;
  error: string;
  fix: string;
  broken: string;
  fixed: string;
}
const { diagrams } = JSON.parse(readFileSync(join(process.cwd(), "test/fixtures/agent-eval/diagrams.json"), "utf8")) as { diagrams: EvalDiagram[] };
const coordinator = new Coordinator({ workerUrl: testWorkerUrl, meta: { checker: "diagramist test", renderers: { ...RENDERER_VERSIONS } } });
afterAll(() => coordinator.close());

describe("the agent evaluation set", () => {
  it("has the 30 diagrams in the categories the design asks for", () => {
    const count = (category: string) => diagrams.filter((d) => d.category === category).length;
    expect(diagrams).toHaveLength(30);
    expect(new Set(diagrams.map((d) => d.id)).size).toBe(30);
    expect([count("flowchart"), count("sequence"), count("class, state or ER"), count("Gantt, timeline or mindmap"), count("beta or newer type")]).toEqual([10, 5, 5, 5, 5]);
  });

  for (const diagram of diagrams) {
    it(`${diagram.id}: the planted error fails Mermaid.js, and the fix passes both renderers`, async () => {
      const broken = (await coordinator.checkText(diagram.broken))!.blocks[0]!;
      expect(broken.results.mermaid.errors[0]).toMatchObject({ severity: "error", class: "invalid" });
      const fixed = (await coordinator.checkText(diagram.fixed))!.blocks[0]!;
      expect(fixed.results.mermaid.outcome).toBe("pass");
      expect(fixed.results.pele.outcome).toBe("pass");
    });
  }
});
