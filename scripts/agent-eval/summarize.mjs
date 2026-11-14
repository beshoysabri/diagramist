#!/usr/bin/env node
// Turns the evaluation records (out/agent-eval/<agent>-<run>.jsonl) into the per-run tables and the
// summary for test/fixtures/agent-eval/results-v<version>.md (design item 72). Prints Markdown.
//
//   node scripts/agent-eval/summarize.mjs out/agent-eval/claude-cli.jsonl out/agent-eval/claude-mcp.jsonl
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const runs = process.argv.slice(2).map((file) => ({
  name: basename(file, ".jsonl"),
  records: readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)),
}));

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : "–");
const median = (values) => {
  const sorted = values.filter((v) => v !== null && v !== undefined).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : "–";
};
const sum = (values) => values.reduce((a, b) => a + (b ?? 0), 0);

console.log("| Run | Fixed | Fixed within three checks | Median checks | Same as intended fix | Denied tool uses | Median result size | Cost (USD) |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- |");
for (const { name, records } of runs) {
  const n = records.length;
  console.log(
    `| ${name} | ${records.filter((r) => r.fixed).length}/${n} | ${records.filter((r) => r.withinThree).length}/${n} (${pct(records.filter((r) => r.withinThree).length, n)}) | ${median(records.map((r) => r.checks))} | ${records.filter((r) => r.sameAsIntendedFix).length}/${n} | ${sum(records.map((r) => r.denied.length))} | ${median(records.flatMap((r) => r.resultChars))} characters | ${sum(records.map((r) => r.costUsd)).toFixed(2)} |`,
  );
}

for (const { name, records } of runs) {
  const first = records[0] ?? {};
  console.log(`\n### ${name}\n\n${first.claude ?? ""}, model \`${first.model ?? ""}\`, ${first.diagramist ?? ""}.\n`);
  console.log("| Diagram | Fixed | Checks | First pass | Same as intended fix | Denied |");
  console.log("| --- | --- | --- | --- | --- | --- |");
  for (const r of records) {
    console.log(`| \`${r.id}\` | ${r.fixed ? "yes" : "**no**"} | ${r.checks} | ${r.checksToPass ?? "–"} | ${r.sameAsIntendedFix ? "yes" : "no"} | ${r.denied.length ? r.denied.join("; ") : "–"} |`);
  }
}
