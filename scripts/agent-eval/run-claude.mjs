#!/usr/bin/env node
// Runs the agent evaluation (test/fixtures/agent-eval/PROCEDURE.md) with Claude Code, headless.
// One fresh session per diagram, in an empty folder outside any repository. Only project settings
// load (no user CLAUDE.md, skills, plugins or MCP servers); only Diagramist and edits to the test
// file are pre-approved, and anything else is denied and recorded.
//
//   node scripts/agent-eval/run-claude.mjs --run cli|mcp [--model sonnet] [--only id,id] [--out file]
//
// Needs `npm run build` first. Diagramist is installed from packages/diagramist into
// out/agent-eval/prefix, so the global npm install is untouched.
import { execFileSync, spawn } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const root = resolve(import.meta.dirname, "../..");
const { values: flags } = parseArgs({
  options: { run: { type: "string" }, model: { type: "string", default: "sonnet" }, only: { type: "string" }, out: { type: "string" }, "timeout-s": { type: "string", default: "360" } },
});
if (flags.run !== "cli" && flags.run !== "mcp") throw new Error("--run cli or --run mcp");
const RUN = flags.run;
const PROMPT =
  "The Mermaid diagram in diagram.md doesn't render on GitHub. Fix it so that it does, without changing what it shows. Check your work with Diagramist before you finish.";

const prefix = join(root, "out/agent-eval/prefix");
const bin = join(prefix, "bin");
const workRoot = join("/tmp/dg-agent-eval", RUN);
const outFile = resolve(flags.out ?? join(root, `out/agent-eval/claude-${RUN}.jsonl`));
mkdirSync(join(outFile, ".."), { recursive: true });

// The version under test, installed apart from the user's global packages.
rmSync(prefix, { recursive: true, force: true });
execFileSync("npm", ["install", "--global", "--prefix", prefix, "--no-audit", "--no-fund", join(root, "packages/diagramist")], { stdio: "ignore" });
const diagramistVersion = execFileSync(join(bin, "diagramist"), ["--version"], { encoding: "utf8" }).trim();
const claudeVersion = execFileSync("claude", ["--version"], { encoding: "utf8" }).trim();
const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };

const { diagrams } = JSON.parse(readFileSync(join(root, "test/fixtures/agent-eval/diagrams.json"), "utf8"));
const only = flags.only ? new Set(flags.only.split(",")) : null;
const fence = (text) => "```mermaid\n" + text.replace(/\n?$/, "\n") + "```";
const diagramOf = (markdown) => /```mermaid\n([\s\S]*?)```/.exec(markdown)?.[1] ?? null;
const normal = (text) => (text ?? "").replace(/[ \t]+$/gm, "").trim();

function argsFor() {
  const common = ["-p", PROMPT, "--model", flags.model, "--output-format", "stream-json", "--verbose", "--no-session-persistence"];
  const isolation = ["--setting-sources", "project", "--strict-mcp-config", "--permission-mode", "dontAsk", "--tools", "Read,Edit,Write,Bash,Skill"];
  const allowed = ["Read", "Edit", "Write", "Skill"];
  if (RUN === "cli") return [...common, ...isolation, "--allowedTools", ...allowed, "Bash(diagramist check *)"];
  const mcp = JSON.stringify({ mcpServers: { diagramist: { command: "diagramist", args: ["mcp"] } } });
  return [...common, ...isolation, "--mcp-config", mcp, "--allowedTools", ...allowed, "mcp__diagramist__check"];
}

function runSession(cwd) {
  return new Promise((done) => {
    const child = spawn("claude", argsFor(), { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    const events = [];
    let buffer = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) try { events.push(JSON.parse(line)); } catch { /* not JSON */ }
      }
    });
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const timer = setTimeout(() => child.kill("SIGTERM"), Number(flags["timeout-s"]) * 1000);
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      done({ events, code, signal, stderr: stderr.slice(-2000) });
    });
  });
}

const isCheck = (block) => (RUN === "cli" ? block.name === "Bash" && /\bdiagramist\s+check\b/.test(block.input?.command ?? "") : block.name === "mcp__diagramist__check");
const textOf = (content) => (typeof content === "string" ? content : (content ?? []).map((part) => part.text ?? "").join(""));

for (const diagram of diagrams) {
  if (only && !only.has(diagram.id)) continue;
  const cwd = join(workRoot, diagram.id);
  rmSync(cwd, { recursive: true, force: true });
  mkdirSync(cwd, { recursive: true });
  writeFileSync(join(cwd, "diagram.md"), `# Overview\n\nThis diagram is part of the project's documentation.\n\n${fence(diagram.broken)}\n`);
  if (RUN === "cli") cpSync(join(root, "packages/diagramist/skills/diagramist"), join(cwd, ".claude/skills/diagramist"), { recursive: true });

  const started = Date.now();
  const session = await runSession(cwd);
  const init = session.events.find((e) => e.type === "system" && e.subtype === "init") ?? {};
  const result = session.events.findLast((e) => e.type === "result") ?? {};
  const uses = new Map();
  const checks = [];
  const tools = [];
  for (const event of session.events) {
    for (const block of event.message?.content ?? []) {
      if (block.type === "tool_use") {
        uses.set(block.id, block);
        tools.push(block.name === "Bash" ? `Bash: ${String(block.input?.command ?? "").slice(0, 80)}` : block.name);
      }
      if (block.type === "tool_result" && uses.has(block.tool_use_id) && isCheck(uses.get(block.tool_use_id))) {
        const text = textOf(block.content);
        checks.push({ passed: /: \d+ diagrams?, 0 errors/.test(text), chars: text.length });
      }
    }
  }
  const finalMarkdown = existsSync(join(cwd, "diagram.md")) ? readFileSync(join(cwd, "diagram.md"), "utf8") : "";
  let finalCheck;
  try {
    execFileSync(join(bin, "diagramist"), ["check", "diagram.md"], { cwd, encoding: "utf8" });
    finalCheck = 0;
  } catch (error) {
    finalCheck = error.status ?? 2;
  }
  const firstPass = checks.findIndex((c) => c.passed);
  const record = {
    id: diagram.id,
    category: diagram.category,
    run: RUN,
    fixed: finalCheck === 0,
    checks: checks.length,
    checksToPass: firstPass >= 0 ? firstPass + 1 : null,
    withinThree: finalCheck === 0 && (firstPass < 0 ? checks.length <= 3 : firstPass + 1 <= 3),
    sameAsIntendedFix: normal(diagramOf(finalMarkdown)) === normal(diagram.fixed),
    finalDiagram: diagramOf(finalMarkdown),
    resultChars: checks.map((c) => c.chars),
    denied: (result.permission_denials ?? []).map((d) => (d.tool_name === "Bash" ? `Bash: ${String(d.tool_input?.command ?? "").slice(0, 80)}` : d.tool_name)),
    tools,
    finalMessage: String(result.result ?? "").slice(0, 600),
    turns: result.num_turns ?? null,
    usage: result.usage ?? null,
    costUsd: result.total_cost_usd ?? null,
    seconds: Math.round((Date.now() - started) / 1000),
    exit: session.signal ? `signal ${session.signal}` : session.code,
    model: init.model ?? flags.model,
    loaded: { mcpServers: (init.mcp_servers ?? []).map((s) => `${s.name}:${s.status}`), skills: init.skills ?? init.slash_commands ?? null },
    claude: claudeVersion,
    diagramist: diagramistVersion,
    date: new Date().toISOString(),
  };
  if (session.code !== 0 && !result.type) record.error = session.stderr;
  appendFileSync(outFile, `${JSON.stringify(record)}\n`);
  console.log(`${RUN} ${diagram.id}: ${record.fixed ? "fixed" : "NOT fixed"}, ${record.checks} check(s)${record.checksToPass ? `, passed on #${record.checksToPass}` : ""}, ${record.denied.length} denied, ${record.seconds}s`);
}
