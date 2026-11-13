#!/usr/bin/env node
// P2 packaging test (docs/designs/diagramist.md, item 41). Builds the Mermaid.js worker bundle with
// each browser stand-in (jsdom, happy-dom, linkedom), runs every Mermaid.js corpus case and sample
// through it in a fresh Node process, and records the verdicts, resident memory and bundle size.
// It also tries the one-worker layout: Pele render() in the same worker, with and without an
// explicit text measurer (width = characters × font size × 0.6).
//
//   node scripts/spike/bundle-mermaid-worker.mjs [--runs 3] [--only jsdom] [--json out/spike/results.json]
//
// P2 chose linkedom (docs/designs/packaging-notes.md). To run this again, first install the other
// candidates: `npm install --no-save jsdom@31.0.0 happy-dom@21.0.4`.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "../..");
const spikeDir = join(root, "scripts/spike");
const outDir = join(root, "out/spike");
const { values: flags } = parseArgs({ options: { runs: { type: "string", default: "3" }, only: { type: "string" }, json: { type: "string" } } });
const RUNS = Number(flags.runs);
const STANDINS = ["jsdom", "happy-dom", "linkedom"].filter((name) => !flags.only || name === flags.only);
const version = (name) => JSON.parse(readFileSync(join(root, "node_modules", name, "package.json"), "utf8")).version;

// CommonJS packages bundled into an ES module still call require() and read __dirname.
const banner = [
  'import { createRequire as __diagramistRequire } from "node:module";',
  'import { fileURLToPath as __diagramistPath } from "node:url";',
  "const require = __diagramistRequire(import.meta.url);",
  "const __filename = __diagramistPath(import.meta.url);",
  'const __dirname = __filename.slice(0, Math.max(__filename.lastIndexOf("/"), __filename.lastIndexOf("\\\\")));',
].join("\n");

/** The worker body: section 3's messages, with `renderer` added so one worker can host both renderers. */
function workerSource(standin, renderers) {
  return [
    'import { parentPort, workerData } from "node:worker_threads";',
    standin === "none" ? "const install = () => [];" : `import { install } from "./standin-${standin}.ts";`,
    "const missing = install();",
    "const checks = {};",
    renderers.includes("mermaid")
      ? 'const mermaidCheck = await import("../../src/core/renderers/mermaid/check.ts"); checks.mermaid = (text) => mermaidCheck.checkWithMermaid(text);'
      : "",
    renderers.includes("pele")
      ? [
          'const peleCheck = await import("../../src/core/renderers/pele/check.ts");',
          "const measurer = workerData?.measurer ? { width: (text, size) => text.length * size * 0.6 } : undefined;",
          "checks.pele = (text) => peleCheck.checkWithPele(text, measurer);",
        ].join("\n")
      : "",
    "parentPort.on('message', async ({ id, renderer, text }) => {",
    "  let verdict;",
    "  try { verdict = await checks[renderer](text); }",
    "  catch (error) { verdict = { outcome: 'tool-error', code: 'crash', message: String(error?.message ?? error).split('\\n')[0] }; }",
    "  parentPort.postMessage({ type: 'result', id, verdict });",
    "});",
    "parentPort.postMessage({ type: 'ready', renderers: Object.keys(checks), missing });",
  ].join("\n");
}

// jsdom resolves its synchronous-XMLHttpRequest helper file when it loads, which fails once bundled.
// Diagramist never makes requests, so the bundle drops that file instead of shipping it.
const jsdomSyncXhrPatch = {
  name: "jsdom-sync-xhr",
  setup(build) {
    build.onLoad({ filter: /[\\/]jsdom[\\/]lib[\\/]jsdom[\\/]living[\\/]xhr[\\/]XMLHttpRequest-impl\.js$/ }, ({ path }) => {
      const source = readFileSync(path, "utf8");
      const patched = source.replace('require.resolve("./xhr-sync-worker.js")', "null");
      if (patched === source) throw new Error("jsdom-sync-xhr: the expected require.resolve call is gone");
      return { contents: patched, loader: "js" };
    });
  },
};

async function bundle(name, contents, { minify = true } = {}) {
  const outfile = join(outDir, `${name}.mjs`);
  try {
    const result = await build({
      stdin: { contents, resolveDir: spikeDir, sourcefile: `entry-${name}.ts`, loader: "ts" },
      absWorkingDir: root,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22.12",
      minify,
      legalComments: "none",
      banner: { js: banner },
      external: ["canvas", "bufferutil", "utf-8-validate"],
      plugins: [jsdomSyncXhrPatch],
      outfile,
      metafile: true,
      logLevel: "silent",
    });
    const bytes = statSync(outfile).size;
    return { ok: true, path: outfile, bytes, gzipBytes: gzipSync(readFileSync(outfile), { level: 9 }).length, warnings: result.warnings.map((w) => w.text).slice(0, 5), metafile: result.metafile };
  } catch (error) {
    return { ok: false, path: outfile, error: (error.errors ?? [error]).map((e) => e.text ?? String(e)).slice(0, 3).join("; ") };
  }
}

/** Bytes in the bundle per npm package, from esbuild's metafile. */
function bytesByPackage(built) {
  const totals = {};
  for (const [path, { bytesInOutput }] of Object.entries(built.metafile.outputs[relative(root, built.path).replaceAll("\\", "/")]?.inputs ?? {})) {
    const at = path.lastIndexOf("node_modules/");
    const parts = at < 0 ? ["(diagramist)"] : path.slice(at + 13).split("/");
    const name = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
    totals[name] = (totals[name] ?? 0) + bytesInOutput;
  }
  return totals;
}

function runHarness(harness, specs) {
  try {
    const stdout = execFileSync(process.execPath, [harness, JSON.stringify(specs)], { cwd: root, encoding: "utf8", timeout: 300_000, maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    return JSON.parse(stdout.trim().split("\n").at(-1));
  } catch (error) {
    return { ok: false, error: String(error.stderr || error.message).split("\n").slice(0, 6).join("\n") };
  }
}

/** Runs one layout RUNS times, each in a fresh process; keeps the first run's verdicts and the median memory. */
function measure(harness, specs) {
  const runs = Array.from({ length: RUNS }, () => runHarness(harness, specs));
  const good = runs.filter((run) => run.ok);
  if (good.length === 0) return runs[0];
  const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const first = good[0];
  const consistent = good.every((run) => JSON.stringify(run.results) === JSON.stringify(first.results));
  return {
    ...first,
    consistent,
    runs: good.length,
    rssMb: Object.fromEntries(["base", "ready", "corpus", "after"].map((key) => [key, median(good.map((r) => r.rssMb[key]))])),
    readyMs: good.map((r) => r.workers.map((w) => w.readyMs)),
    checksMs: median(good.map((r) => r.checksMs)),
  };
}

mkdirSync(outDir, { recursive: true });
const report = { date: new Date().toISOString(), node: process.version, platform: `${process.platform}-${process.arch}`, runs: RUNS, versions: {}, bundles: {}, layouts: {} };
for (const name of ["mermaid", "pele", "esbuild", "jsdom", "happy-dom", "linkedom"]) report.versions[name] = version(name);

const harnessSource = 'import "./harness.ts";';
const harness = await bundle("harness", harnessSource, { minify: false });
if (!harness.ok) throw new Error(`harness build failed: ${harness.error}`);

console.error(`Building worker bundles in ${relative(root, outDir)} …`);
const builds = { "pele-worker": await bundle("pele-worker", workerSource("none", ["pele"])), "mermaid-worker.none": await bundle("mermaid-worker.none", workerSource("none", ["mermaid"])) };
for (const standin of STANDINS) {
  builds[`mermaid-worker.${standin}`] = await bundle(`mermaid-worker.${standin}`, workerSource(standin, ["mermaid"]));
  builds[`combined-worker.${standin}`] = await bundle(`combined-worker.${standin}`, workerSource(standin, ["mermaid", "pele"]));
}
for (const [name, built] of Object.entries(builds)) {
  report.bundles[name] = built.ok
    ? { bytes: built.bytes, gzipBytes: built.gzipBytes, warnings: built.warnings, topPackages: Object.entries(bytesByPackage(built)).sort((a, b) => b[1] - a[1]).slice(0, 12) }
    : { error: built.error };
  console.error(`  ${name}: ${built.ok ? `${(built.bytes / 1e6).toFixed(2)} MB (${(built.gzipBytes / 1e6).toFixed(2)} MB gzipped)` : `build failed: ${built.error}`}`);
}

const spec = (name, renderers, measurer = false) => ({ path: builds[name].path, renderers, measurer });
const layouts = { "no workers (baseline)": [], "Pele worker only": [spec("pele-worker", ["pele"])], "Mermaid.js worker, no stand-in": [spec("mermaid-worker.none", ["mermaid"])] };
for (const standin of STANDINS) {
  if (builds[`mermaid-worker.${standin}`].ok) {
    layouts[`${standin}: Mermaid.js worker`] = [spec(`mermaid-worker.${standin}`, ["mermaid"])];
    layouts[`${standin}: two workers`] = [spec("pele-worker", ["pele"]), spec(`mermaid-worker.${standin}`, ["mermaid"])];
  }
  if (builds[`combined-worker.${standin}`].ok) {
    layouts[`${standin}: one worker, measurer`] = [spec(`combined-worker.${standin}`, ["mermaid", "pele"], true)];
    layouts[`${standin}: one worker, no measurer`] = [spec(`combined-worker.${standin}`, ["mermaid", "pele"], false)];
  }
}
for (const [name, specs] of Object.entries(layouts)) {
  console.error(`Running ${name} (${RUNS} fresh processes) …`);
  report.layouts[name] = measure(harness.path, specs);
}

const jsonPath = flags.json ? resolve(flags.json) : join(outDir, "results.json");
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

// A summary table for docs/designs/packaging-notes.md.
const cell = (entry, renderer, set) => {
  const r = entry.results?.[renderer]?.[set];
  return r ? `${r.total - r.failed.length}/${r.total}` : "–";
};
console.log(`\nNode ${report.node}, ${report.platform}; median of ${RUNS} fresh processes; resident memory of the whole process after all checks.\n`);
console.log("| Layout | Mermaid.js corpus | Mermaid.js samples | Pele corpus | Pele samples | Ready (ms) | RSS ready / corpus / samples (MB) | Checks (ms) | Requests | Output lines |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const [name, entry] of Object.entries(report.layouts)) {
  if (!entry.ok) {
    console.log(`| ${name} | failed: ${String(entry.error).split("\n")[0].slice(0, 120)} | | | | | | | | |`);
    continue;
  }
  const ready = entry.workers.map((w) => w.readyMs).join(" + ") || "–";
  const output = entry.workers.map((w) => w.outputLines).join(" + ") || "0";
  const rss = `${entry.rssMb.ready} / ${entry.rssMb.corpus} / ${entry.rssMb.after}`;
  console.log(`| ${name} | ${cell(entry, "mermaid", "corpus")} | ${cell(entry, "mermaid", "samples")} | ${cell(entry, "pele", "corpus")} | ${cell(entry, "pele", "samples")} | ${ready} | ${rss} | ${entry.checksMs} | ${entry.network?.requests ?? "–"} | ${output} |`);
}
const probes = new Map();
for (const [name, entry] of Object.entries(report.layouts)) {
  const verdicts = entry.ok && entry.results?.mermaid?.probe?.verdicts;
  if (verdicts && !name.startsWith("Mermaid.js worker, no stand-in")) probes.set(name, verdicts.join("; "));
}
const distinct = new Set(probes.values());
console.log(`\nMermaid.js verdicts on the resource-probe diagrams: ${distinct.size === 1 ? `the same with every stand-in (${[...distinct][0]})` : "they differ:"}`);
if (distinct.size > 1) for (const [name, verdicts] of probes) console.log(`  ${name}: ${verdicts}`);
console.log(`\nResults: ${relative(root, jsonPath)}`);
