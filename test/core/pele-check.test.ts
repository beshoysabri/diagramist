import { describe, expect, it } from "vitest";
import { toFilePosition } from "../../src/core/positions/map-position.js";
import { checkWithPele } from "../../src/core/renderers/pele/check.js";
import { SAMPLES } from "../../src/core/samples/samples.js";
import { caseBlocks, corpus } from "../helpers/corpus.js";

describe("checkWithPele on the corpus", () => {
  for (const c of corpus.cases) {
    if (c.blocks.length === 0) continue;
    it(`${c.id}: matches the expected Pele result`, async () => {
      const { blocks } = caseBlocks(c);
      for (const [i, block] of blocks.entries()) {
        const expected = c.blocks[i]!.pele;
        const verdict = await checkWithPele(block.text);
        expect(verdict.outcome).toBe(expected.outcome);
        if (expected.outcome === "fail") {
          expect(verdict.code).toBe(expected.code);
          expect(verdict.position ? toFilePosition(block, verdict.position) : null).toEqual(expected.position);
          expect(verdict.message).not.toMatch(/\n/);
          expect(verdict.message!.length).toBeLessThanOrEqual(200);
        }
      }
    });
  }
});

describe("checkWithPele", () => {
  it("draws every sample", async () => {
    for (const sample of SAMPLES) {
      const verdict = await checkWithPele(sample.text);
      expect(verdict.outcome, sample.keyword).toBe("pass");
    }
  });

  it("turns a parse error into one readable line", async () => {
    const verdict = await checkWithPele("flowchart LR\n  A[one --> B\n  C[two --> D");
    expect(verdict.message).toMatch(/^Expecting .*got "\["$/);
  });

  it("reports Gantt dates against a fixed reference time", async () => {
    const verdict = await checkWithPele("gantt\n  dateFormat YYYY-MM-DD\n  section S\n  Task :a1, 2026-01-01, 3d");
    expect(verdict.outcome).toBe("pass");
  });
});
