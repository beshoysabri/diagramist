// Design item 123: commands per agent and per operating system; the skill copied and removed only in
// the chosen agent's folder; and the report leaving out paths unless the user includes them. Runs
// against a temporary home folder.
import * as assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import * as vscode from "vscode";
import { AGENTS, agentById, commandLine, skillFolder } from "../../../src/features/agent-setup/agents.js";
import { activate } from "../helpers.js";
import type { TestApi } from "../helpers.js";

suite("Agent setup", () => {
  let api: TestApi;
  let home: string;
  const folder = (id: string) => skillFolder(home, agentById(id)!);
  const skillFile = (id: string) => join(folder(id), "SKILL.md");

  suiteSetup(async () => {
    api = await activate();
    home = realpathSync.native(mkdtempSync(join(tmpdir(), "diagramist-home-")));
    api.setAgentHomeForTests(home);
  });
  suiteTeardown(() => {
    api.setAgentHomeForTests();
    rmSync(home, { recursive: true, force: true });
  });

  test("builds each agent's commands, with cmd /c on Windows", () => {
    const claude = agentById("claude")!;
    assert.equal(commandLine(claude.mcp.add!, "linux"), "claude mcp add --scope user --transport stdio diagramist -- diagramist mcp");
    assert.equal(commandLine(claude.mcp.add!, "win32"), "cmd /c claude mcp add --scope user --transport stdio diagramist -- diagramist mcp");
    assert.equal(commandLine(agentById("codex")!.mcp.remove!, "darwin"), "codex mcp remove diagramist");
    assert.equal(commandLine(["npm", "install", "-g", "diagramist@0.1.1"], "win32"), "cmd /c npm install -g diagramist@0.1.1");
    assert.equal(commandLine(["echo", "it's here"], "linux"), "echo 'it'\\''s here'");
    assert.deepEqual(AGENTS.map((agent) => agent.skillsDir), [".claude/skills", ".gemini/skills", ".gemini/config/skills", ".agents/skills"]);
  });

  test("copies the skill only into the chosen agent's folder", async () => {
    const outcome = await vscode.commands.executeCommand<{ skill: string }>("diagramist.connectAgent", { agent: "codex", yes: true });
    assert.equal(outcome?.skill, "copied");
    assert.match(readFileSync(skillFile("codex"), "utf8"), /^name: diagramist$/m);
    for (const other of ["claude", "gemini", "antigravity"]) assert.ok(!existsSync(folder(other)), `${other} untouched`);
  });

  test("keeps a newer copy that is already there", async () => {
    mkdirSync(folder("gemini"), { recursive: true });
    const newer = '---\nname: diagramist\ndescription: "x"\nmetadata:\n  diagramistVersion: "99.0.0"\n---\nnewer\n';
    writeFileSync(skillFile("gemini"), newer);
    const outcome = await vscode.commands.executeCommand<{ skill: string }>("diagramist.connectAgent", { agent: "gemini", yes: true });
    assert.equal(outcome?.skill, "kept");
    assert.equal(readFileSync(skillFile("gemini"), "utf8"), newer);
  });

  test("removes only that agent's skill folder", async () => {
    await vscode.commands.executeCommand("diagramist.connectAgent", { agent: "claude", yes: true });
    const removed = await vscode.commands.executeCommand<{ removed: string }>("diagramist.disconnectAgent", { agent: "codex", yes: true });
    assert.equal(removed?.removed, folder("codex"));
    assert.ok(!existsSync(folder("codex")));
    assert.ok(existsSync(skillFile("claude")), "Claude Code keeps its copy");
    assert.ok(existsSync(join(home, ".agents", "skills")), "the agent's skills folder itself stays");
  });

  test("never deletes a folder that doesn't hold Diagramist's skill", async () => {
    mkdirSync(folder("antigravity"), { recursive: true });
    writeFileSync(skillFile("antigravity"), "---\nname: something-else\n---\n");
    const outcome = await vscode.commands.executeCommand("diagramist.disconnectAgent", { agent: "antigravity", yes: true });
    assert.equal(outcome, undefined);
    assert.ok(existsSync(skillFile("antigravity")));
  });

  test("leaves file paths out of the report unless they are asked for", async () => {
    const without = await vscode.commands.executeCommand<string>("diagramist.copyDiagnosticReport", { includePaths: false });
    for (const section of ["## Versions", "## Environment", "## Settings", "## Agent setup", "## This window"]) assert.ok(without?.includes(section), section);
    assert.ok(!without!.includes(home) && !without!.includes(`~${sep}`), "no paths");
    assert.match(without!, /Claude Code: [^;]+; skill \S+$/m);
    const withPaths = await vscode.commands.executeCommand<string>("diagramist.copyDiagnosticReport", { includePaths: true });
    // Paths are shown the platform's way, with the home folder as ~.
    assert.ok(withPaths!.includes(`in ${join("~", ".claude", "skills", "diagramist")}`), withPaths);
    assert.equal(await vscode.env.clipboard.readText(), withPaths);
  });
});
