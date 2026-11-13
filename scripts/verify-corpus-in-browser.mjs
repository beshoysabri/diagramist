#!/usr/bin/env node
// Independent check of the corpus's Mermaid.js expectations: runs every corpus diagram through
// mermaid.parse() from mermaid@12.3.0 in headless Chromium, applies the documented position rules
// (docs/designs/diagramist.md, Technical Plan section 4), and compares with test/fixtures/corpus/cases.json.
// Uses the Chromium at DIAGRAMIST_CHROMIUM when set (on bshome: /snap/bin/chromium), otherwise
// Playwright's managed Chromium (`npx playwright install chromium`).
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const mermaidDist = join(root, "node_modules/mermaid/dist");
const corpus = JSON.parse(await readFile(join(root, "test/fixtures/corpus/cases.json"), "utf8"));

const page = `<!doctype html><meta charset="utf-8"><body><script type="module">
import mermaid from "/mermaid/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
window.parseRaw = async (text) => {
  try { const r = await mermaid.parse(text); return { outcome: "pass", type: r ? r.diagramType : null }; }
  catch (e) {
    return { outcome: "fail", name: e && e.name, message: String(e && e.message),
      loc: e && e.hash && e.hash.loc ? { last_line: e.hash.loc.last_line, last_column: e.hash.loc.last_column } : null,
      lexer: e && e.result && e.result.lexerErrors ? e.result.lexerErrors.map((x) => ({ line: x.line, column: x.column })) : null,
      parser: e && e.result && e.result.parserErrors ? e.result.parserErrors.map((x) => ({ line: x.token && x.token.startLine, column: x.token && x.token.startColumn })) : null };
  }
};
window.ready = true;
</script>`;

const types = { ".mjs": "text/javascript", ".js": "text/javascript", ".map": "application/json" };
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/") return res.writeHead(200, { "content-type": "text/html" }).end(page);
  if (url.pathname.startsWith("/mermaid/")) {
    const file = normalize(join(mermaidDist, url.pathname.slice("/mermaid/".length)));
    if (!file.startsWith(mermaidDist)) return res.writeHead(403).end();
    try { return res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(await readFile(file)); }
    catch { return res.writeHead(404).end(); }
  }
  res.writeHead(404).end();
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const { port } = server.address();

const browser = await chromium.launch({ executablePath: process.env.DIAGRAMIST_CHROMIUM || undefined, args: ["--no-sandbox"] });
const tab = await browser.newPage();
await tab.goto(`http://127.0.0.1:${port}/`);
await tab.waitForFunction(() => window.ready === true);

/** The documented rules, written out again here so the check doesn't reuse Diagramist's code. */
function mapRaw(raw, text) {
  if (raw.outcome === "pass") return { outcome: "pass" };
  const lines = text.split("\n");
  const clamp = (line, column) => line > lines.length ? { line: lines.length, column: lines[lines.length - 1].length + 1 } : { line, column };
  if (raw.loc) return { outcome: "fail", code: "parse", diagram: clamp(raw.loc.last_line, raw.loc.last_column + 1) };
  if (raw.lexer || raw.parser) {
    const all = [...(raw.lexer ?? []), ...(raw.parser ?? [])].filter((p) => Number.isFinite(p.line) && Number.isFinite(p.column)).sort((a, b) => a.line - b.line || a.column - b.column);
    return { outcome: "fail", code: "parse", diagram: all[0] ? clamp(all[0].line, all[0].column) : null };
  }
  if (raw.name === "UnknownDiagramError" || /No diagram type detected/.test(raw.message)) return { outcome: "fail", code: "unknown-type", diagram: null };
  return { outcome: "fail", code: "other", diagram: null };
}

let checked = 0;
const failures = [];
for (const c of corpus.cases) {
  for (const block of c.blocks) {
    const expected = block.mermaid;
    if (expected.code === "limit") continue; // Diagramist's own size limit, applied before Mermaid.js runs.
    const text = block.text;
    const actual = mapRaw(await tab.evaluate((t) => window.parseRaw(t), text), text);
    const want = expected.outcome === "pass" ? { outcome: "pass" } : {
      outcome: "fail", code: expected.code,
      diagram: expected.position ? { line: expected.position.diagramLine, column: expected.position.diagramColumn } : null,
    };
    checked++;
    if (JSON.stringify(actual) !== JSON.stringify(want)) failures.push(`${c.id} block ${block.index}: browser ${JSON.stringify(actual)}, corpus ${JSON.stringify(want)}`);
  }
}
await browser.close();
server.close();
console.log(`Checked ${checked} corpus diagrams with Mermaid.js in ${process.env.DIAGRAMIST_CHROMIUM ? process.env.DIAGRAMIST_CHROMIUM : "Playwright's Chromium"}.`);
if (failures.length) {
  console.error(`${failures.length} difference(s):\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("All Mermaid.js expectations match the browser.");
