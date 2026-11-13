// Runs in a fresh Node process for scripts/spike/bundle-mermaid-worker.mjs. Starts the worker bundles
// named in argv[2], checks every corpus diagram and every sample with each worker's renderers, and
// prints one JSON line: verdict mismatches, timings, worker output, requests to a local server from
// diagrams that reference it, and the process's resident memory.
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Worker } from "node:worker_threads";
import { toFilePosition } from "../../src/core/positions/map-position.ts";
import type { Block } from "../../src/core/blocks/find-blocks.ts";
import type { RendererId } from "../../src/core/result/schema.ts";
import type { RawVerdict } from "../../src/core/renderers/types.ts";
import { SAMPLES } from "../../src/core/samples/samples.ts";
import { caseBlocks, corpus, type ExpectedRenderer } from "../../test/helpers/corpus.ts";

interface Spec {
  path: string;
  renderers: RendererId[];
  measurer: boolean;
}

interface Job {
  set: "corpus" | "samples" | "probe";
  id: string;
  renderer: RendererId;
  text: string;
  block?: Block;
  expected?: ExpectedRenderer;
  expectedType?: string;
}

interface Running {
  spec: Spec;
  worker: Worker;
  readyMs: number;
  missing: string[];
  output: string[];
  pending: Map<number, (verdict: RawVerdict) => void>;
  died: string | null;
}

const START_BUDGET_MS = 20_000;
const CHECK_TIMEOUT_MS = 10_000;
const specs: Spec[] = JSON.parse(process.argv[2] ?? "[]");
const mb = (bytes: number) => Math.round((bytes / 1_048_576) * 10) / 10;

function startWorker(spec: Spec): Promise<Running> {
  const started = performance.now();
  const worker = new Worker(spec.path, { workerData: { measurer: spec.measurer }, stdout: true, stderr: true });
  const output: string[] = [];
  const keep = (chunk: Buffer) => output.push(...chunk.toString("utf8").split("\n").filter((line) => line.trim()));
  worker.stdout.on("data", keep);
  worker.stderr.on("data", keep);
  const pending = new Map<number, (verdict: RawVerdict) => void>();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no "ready" within ${START_BUDGET_MS} ms`)), START_BUDGET_MS);
    worker.on("error", (error) => reject(error));
    worker.on("exit", (code) => reject(new Error(`worker exited with code ${code} before "ready"`)));
    worker.on("message", (message: { type: string; id?: number; verdict?: RawVerdict; missing?: string[] }) => {
      if (message.type === "ready") {
        clearTimeout(timer);
        const running: Running = { spec, worker, readyMs: Math.round(performance.now() - started), missing: message.missing ?? [], output, pending, died: null };
        const fail = (why: string) => {
          running.died ??= why;
          for (const settle of pending.values()) settle({ outcome: "tool-error", code: "crash", message: why });
          pending.clear();
        };
        worker.on("error", (error) => fail(String(error)));
        worker.on("exit", (code) => fail(`exit ${code}`));
        resolve(running);
      } else if (message.type === "result") {
        pending.get(message.id!)?.(message.verdict!);
        pending.delete(message.id!);
      }
    });
  });
}

let nextId = 1;
function check(running: Running, renderer: RendererId, text: string): Promise<RawVerdict> {
  if (running.died) return Promise.resolve({ outcome: "tool-error", code: "crash", message: running.died });
  const id = nextId++;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      running.pending.delete(id);
      resolve({ outcome: "tool-error", code: "timeout", message: `no result within ${CHECK_TIMEOUT_MS} ms` });
    }, CHECK_TIMEOUT_MS);
    running.pending.set(id, (verdict) => {
      clearTimeout(timer);
      resolve(verdict);
    });
    running.worker.postMessage({ type: "check", id, renderer, text });
  });
}

function sorted(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));
}

/** Returns why the verdict differs from the expectation, or null; same rules as test/core/*-check.test.ts. */
function mismatch(job: Job, verdict: RawVerdict): string | null {
  const got = `${verdict.outcome}${verdict.code ? ` ${verdict.code}` : ""}${verdict.message ? `: ${verdict.message}` : ""}`;
  if (job.set === "samples") {
    if (verdict.outcome !== "pass") return `got ${got}`;
    if (job.expectedType !== undefined && verdict.type !== job.expectedType) return `type ${verdict.type}, expected ${job.expectedType}`;
    return null;
  }
  const expected = job.expected!;
  if (verdict.outcome !== expected.outcome) return `got ${got}, expected ${expected.outcome}`;
  if (expected.outcome === "pass") return null;
  if (verdict.code !== expected.code) return `got ${got}, expected code ${expected.code}`;
  const position = verdict.position ? toFilePosition(job.block!, verdict.position) : null;
  if (sorted(position) !== sorted(expected.position ?? null)) return `position ${sorted(position)}, expected ${sorted(expected.position ?? null)}`;
  if (verdict.message && /\n/.test(verdict.message)) return "message has a line break";
  return null;
}

function jobsFor(renderers: RendererId[], set: Job["set"]): Job[] {
  const jobs: Job[] = [];
  for (const renderer of renderers) {
    if (set === "corpus") {
      for (const c of corpus.cases) {
        if (c.blocks.length === 0) continue;
        const { blocks } = caseBlocks(c);
        blocks.forEach((block, i) => {
          jobs.push({ set, id: blocks.length > 1 ? `${c.id}#${i + 1}` : c.id, renderer, text: block.text, block, expected: c.blocks[i]![renderer] });
        });
      }
    } else if (set === "samples") {
      for (const sample of SAMPLES) {
        jobs.push({ set, id: sample.keyword, renderer, text: sample.text, expectedType: renderer === "mermaid" ? sample.mermaidType : undefined });
      }
    } else {
      probeTexts().forEach((text, i) => jobs.push({ set, id: `probe-${i + 1}`, renderer, text }));
    }
  }
  return jobs;
}

/** Diagrams whose labels ask for resources from a local server; a stand-in that fetches them breaks the no-network rule. */
let probeBase = "";
function probeTexts(): string[] {
  const url = (name: string) => `${probeBase}/${name}`;
  return [
    [
      "flowchart LR",
      `  A["<img src='${url("img")}'>"] --> B["<iframe src='${url("iframe")}'></iframe>"]`,
      `  B --> C["<link rel='stylesheet' href='${url("link")}'>"]`,
      `  C --> D["<script src='${url("script")}'></script>"]`,
      `  D --> E["<object data='${url("object")}'></object>"]`,
      `  E --> F["<style>@import url('${url("import")}');</style>"]`,
      `  F --> G["<svg><image href='${url("svg-image")}'/></svg>"]`,
      `  G --> H["<video poster='${url("poster")}'></video>"]`,
      `  click A href "${url("click")}"`,
    ].join("\n"),
    ["sequenceDiagram", `  Alice->>Bob: <img src='${url("sequence-img")}'>`, `  Note over Bob: <iframe src='${url("sequence-iframe")}'></iframe>`].join("\n"),
    [`%%{init: {"fontFamily": "url(${url("font")})", "themeCSS": "@import url(${url("theme-css")});"}}%%`, "classDiagram", `  class A["<img src='${url("class-img")}'>"]`].join("\n"),
  ];
}

type Tally = { total: number; failed: string[]; verdicts?: string[] };
type RendererTally = { corpus: Tally; samples: Tally; probe: Tally; maxCheckMs: number; firstCheckMs: number };

async function runPhase(workers: Running[], set: Job["set"], results: Record<string, RendererTally>): Promise<void> {
  await Promise.all(
    workers.map(async (running) => {
      for (const job of jobsFor(running.spec.renderers, set)) {
        const entry = (results[job.renderer] ??= { corpus: { total: 0, failed: [] }, samples: { total: 0, failed: [] }, probe: { total: 0, failed: [] }, maxCheckMs: 0, firstCheckMs: -1 });
        const t = performance.now();
        const verdict = await check(running, job.renderer, job.text);
        const ms = performance.now() - t;
        if (entry.firstCheckMs < 0) entry.firstCheckMs = Math.round(ms);
        entry.maxCheckMs = Math.max(entry.maxCheckMs, Math.round(ms));
        entry[job.set].total++;
        if (job.set === "probe") (entry.probe.verdicts ??= []).push(`${job.id}: ${verdict.outcome}${verdict.code ? ` ${verdict.code}` : ""}${verdict.type ? ` (${verdict.type})` : ""}`);
        const why = job.set === "probe" ? (verdict.outcome === "tool-error" ? `got ${verdict.code}: ${verdict.message}` : null) : mismatch(job, verdict);
        if (why) entry[job.set].failed.push(`${job.id}: ${why}`.slice(0, 300));
      }
    }),
  );
}

const rssBase = process.memoryUsage().rss;
const report: Record<string, unknown> = { node: process.version, platform: `${process.platform}-${process.arch}` };
const requests: string[] = [];
const server = createServer((req, res) => {
  requests.push(`${req.method} ${req.url}`);
  res.writeHead(404).end();
});
try {
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  probeBase = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const workers = await Promise.all(specs.map(startWorker));
  const rssReady = process.memoryUsage().rss;
  const results: Record<string, RendererTally> = {};
  const started = performance.now();
  await runPhase(workers, "corpus", results);
  const rssCorpus = process.memoryUsage().rss;
  await runPhase(workers, "samples", results);
  const checksMs = Math.round(performance.now() - started);
  const rssAfter = process.memoryUsage().rss;
  await runPhase(workers, "probe", results);
  await new Promise((ok) => setTimeout(ok, 1_000)); // time for any late resource request to arrive
  const heaps = await Promise.all(
    workers.map(async (running) => {
      const stats = await (running.worker as Worker & { getHeapStatistics?: () => Promise<{ used_heap_size: number }> }).getHeapStatistics?.();
      return stats ? mb(stats.used_heap_size) : null;
    }),
  );
  Object.assign(report, {
    ok: true,
    workers: workers.map((running, i) => ({
      path: running.spec.path,
      renderers: running.spec.renderers,
      measurer: running.spec.measurer,
      readyMs: running.readyMs,
      missingGlobals: running.missing,
      heapMb: heaps[i],
      outputLines: running.output.length,
      output: running.output.slice(0, 5).map((line) => line.slice(0, 200)),
    })),
    results,
    checksMs,
    network: { requests: requests.length, paths: requests.slice(0, 20) },
    rssMb: { base: mb(rssBase), ready: mb(rssReady), corpus: mb(rssCorpus), after: mb(rssAfter) },
  });
  for (const running of workers) running.died = "terminated";
  await Promise.all(workers.map((running) => running.worker.terminate()));
} catch (error) {
  Object.assign(report, { ok: false, error: String((error as Error)?.stack ?? error).split("\n").slice(0, 6).join("\n") });
}
server.close();
process.stdout.write(`${JSON.stringify(report)}\n`);
process.exit(0);
