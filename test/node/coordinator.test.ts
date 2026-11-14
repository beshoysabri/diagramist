// Design item 66: every corpus case through the coordinator and the real check worker.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { RendererId } from "../../src/core/result/schema.js";
import { Coordinator } from "../../src/platform/node/coordinator.js";
import { DIAGRAMIST_VERSION, RENDERER_VERSIONS } from "../../src/platform/node/versions.js";
import { testWorkerUrl } from "../helpers/checker-paths.js";
import { caseInput, corpus } from "../helpers/corpus.js";

const dir = mkdtempSync(join(tmpdir(), "diagramist-coordinator-"));
const coordinator = new Coordinator({
  workerUrl: testWorkerUrl,
  meta: { checker: `diagramist ${DIAGRAMIST_VERSION}`, renderers: { ...RENDERER_VERSIONS } },
});
afterAll(async () => {
  await coordinator.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("Coordinator on the corpus", () => {
  it("reports the renderer versions the corpus was recorded with", () => {
    expect(RENDERER_VERSIONS).toEqual(corpus.renderers);
  });

  for (const c of corpus.cases) {
    it(`${c.id}: gives the expected result`, async () => {
      let result;
      if (c.kind === "text") {
        result = await coordinator.checkText(caseInput(c));
      } else {
        const path = join(dir, `${c.id}.${c.kind === "markdown" ? "md" : "mmd"}`);
        writeFileSync(path, caseInput(c));
        result = await coordinator.checkFile(path);
      }
      expect(result).not.toBeNull();
      expect(result!.status).toBe(c.status);
      expect(result!.blocks).toHaveLength(c.blocks.length);
      result!.blocks.forEach((block, i) => {
        const expected = c.blocks[i]!;
        expect(block.index).toBe(expected.index);
        expect(block.firstLine).toBe(expected.firstLine);
        expect(block.targets).toEqual(expected.targets);
        expect(block.targetsFrom).toEqual(expected.targetsFrom);
        expect(block.notices.map((n) => n.code).sort()).toEqual([...expected.notices].sort());
        for (const renderer of ["mermaid", "pele"] as RendererId[]) {
          const e = expected[renderer];
          const r = block.results[renderer];
          expect(r.outcome, renderer).toBe(e.outcome);
          if (e.outcome === "pass") continue;
          expect(r.errors[0], renderer).toMatchObject({ code: e.code, class: e.class, severity: e.severity, retry: e.retry, position: e.position });
        }
      });
    });
  }
});

describe("Coordinator", () => {
  it("gives a file problem without starting a check", async () => {
    const result = await coordinator.checkFile(join(dir, "nope.md"));
    expect(result).toMatchObject({ status: "not-found", blocks: [], summary: { blocks: 0, errors: 0, warnings: 0, notices: 0 } });
  });

  it("drops an older check of the same file in latest-wins mode", async () => {
    const latest = new Coordinator({ workerUrl: testWorkerUrl, mode: "latest-wins", meta: { checker: "diagramist test", renderers: { ...RENDERER_VERSIONS } } });
    const path = join(dir, "twice.md");
    writeFileSync(path, "```mermaid\nflowchart LR\n  A --> B\n```\n\n```mermaid\nflowchart LR\n  C --> D\n```\n");
    const older = latest.checkFile(path, { key: path });
    const newer = latest.checkFile(path, { key: path });
    expect(await older).toBeNull();
    expect((await newer)?.summary.blocks).toBe(2);
    await latest.close();
  });
});
