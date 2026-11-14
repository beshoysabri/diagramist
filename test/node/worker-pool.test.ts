// Design item 64: start-up budget, time limit, restarts and the two queue modes. Most tests use a
// scripted stand-in worker; the slow-hook test uses the real check worker.
import { describe, expect, it } from "vitest";
import { WorkerPool } from "../../src/platform/node/worker-pool.js";
import type { PoolOutcome } from "../../src/platform/node/worker-pool.js";
import { fakeWorkerUrl, testWorkerUrl } from "../helpers/checker-paths.js";

const verdictsOf = (outcome: PoolOutcome) => {
  if (outcome.status !== "done") throw new Error(`expected a result, got ${outcome.status}`);
  return outcome.verdicts;
};

describe("WorkerPool", () => {
  it("gives every renderer tool / start-timeout when the worker misses its start-up budget", async () => {
    const pool = new WorkerPool({ workerUrl: fakeWorkerUrl("never-ready"), startupMs: 300 });
    const verdicts = verdictsOf(await pool.check("flowchart LR"));
    expect(verdicts.mermaid).toMatchObject({ outcome: "tool-error", code: "start-timeout" });
    expect(verdicts.pele).toMatchObject({ outcome: "tool-error", code: "start-timeout" });
    await pool.close();
  });

  it("gives tool / crash when the worker fails while loading", async () => {
    const pool = new WorkerPool({ workerUrl: fakeWorkerUrl("fails-to-load") });
    expect(verdictsOf(await pool.check("x")).mermaid).toMatchObject({ outcome: "tool-error", code: "crash" });
    await pool.close();
  });

  it("keeps a renderer's verdict and times out the other, then starts a fresh worker", async () => {
    const pool = new WorkerPool({ workerUrl: fakeWorkerUrl("scripted"), blockMs: 300 });
    const verdicts = verdictsOf(await pool.check("half"));
    expect(verdicts.pele).toEqual({ outcome: "pass", type: "half" });
    expect(verdicts.mermaid).toMatchObject({ outcome: "tool-error", code: "timeout", message: "The check took longer than 300 ms." });
    expect(verdictsOf(await pool.check("after")).mermaid).toEqual({ outcome: "pass", type: "after" });
    await pool.close();
  });

  it("restarts after a crash", async () => {
    const pool = new WorkerPool({ workerUrl: fakeWorkerUrl("scripted") });
    const crashed = verdictsOf(await pool.check("crash"));
    expect(crashed.pele).toMatchObject({ outcome: "tool-error", code: "crash" });
    expect(crashed.mermaid).toMatchObject({ outcome: "tool-error", code: "crash" });
    expect(verdictsOf(await pool.check("next")).pele).toEqual({ outcome: "pass", type: "next" });
    await pool.close();
  });

  it("never drops a request in fifo mode, and answers in order", async () => {
    const pool = new WorkerPool({ workerUrl: fakeWorkerUrl("scripted"), mode: "fifo" });
    const texts = Array.from({ length: 30 }, (_, i) => `d${i}`);
    const outcomes = await Promise.all(texts.map((text) => pool.check(text)));
    expect(outcomes.map((outcome) => verdictsOf(outcome).mermaid.type)).toEqual(texts);
    await pool.close();
  });

  it("supersedes an older queued request for the same key in latest-wins mode", async () => {
    const pool = new WorkerPool({ workerUrl: fakeWorkerUrl("scripted"), mode: "latest-wins" });
    const busy = pool.check("sleep:200");
    const older = pool.check("old", { key: "a.md", generation: 1 });
    const other = pool.check("other", { key: "b.md", generation: 1 });
    const newer = pool.check("new", { key: "a.md", generation: 2 });
    expect(await older).toEqual({ status: "superseded" });
    expect(verdictsOf(await newer).mermaid.type).toBe("new");
    expect(verdictsOf(await other).mermaid.type).toBe("other");
    expect(verdictsOf(await busy).mermaid.type).toBe("sleep:200");
    await pool.close();
  });

  it("keeps at most `slots` queued requests in latest-wins mode, dropping the oldest", async () => {
    const pool = new WorkerPool({ workerUrl: fakeWorkerUrl("scripted"), mode: "latest-wins", slots: 2 });
    const busy = pool.check("sleep:200");
    const first = pool.check("first", { key: "1.md", generation: 1 });
    const second = pool.check("second", { key: "2.md", generation: 1 });
    const third = pool.check("third", { key: "3.md", generation: 1 });
    expect(await first).toEqual({ status: "superseded" });
    expect(verdictsOf(await second).mermaid.type).toBe("second");
    expect(verdictsOf(await third).mermaid.type).toBe("third");
    await busy;
    await pool.close();
  });

  it("ends queued requests as superseded when closed", async () => {
    const pool = new WorkerPool({ workerUrl: fakeWorkerUrl("scripted") });
    const running = pool.check("sleep:200");
    const queued = pool.check("queued");
    await pool.close();
    expect(await queued).toEqual({ status: "superseded" });
    expect(verdictsOf(await running).mermaid).toMatchObject({ outcome: "tool-error", code: "crash" });
  });

  it("times out the real check worker with the slow test hook", async () => {
    const pool = new WorkerPool({
      workerUrl: testWorkerUrl,
      blockMs: 500,
      env: { ...process.env, DIAGRAMIST_TEST_HOOKS: "1", DIAGRAMIST_TEST_SLOW_MS: "1500" },
    });
    const verdicts = verdictsOf(await pool.check("flowchart LR\n  A --> B"));
    expect(verdicts.pele).toMatchObject({ outcome: "tool-error", code: "timeout" });
    expect(verdicts.mermaid).toMatchObject({ outcome: "tool-error", code: "timeout" });
    await pool.close();
  });
});
