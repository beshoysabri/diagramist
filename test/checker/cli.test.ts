// Design item 67: the built `diagramist` command, run as agents run it. `npm run test:checker`
// builds packages/diagramist first.
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { checkResultJsonSchema } from "../../src/core/result/schema.js";
import { builtCli } from "../helpers/checker-paths.js";

const dir = realpathSync.native(mkdtempSync(join(tmpdir(), "diagramist-cli-")));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const file = (name: string, content: string) => {
  mkdirSync(join(dir, name, ".."), { recursive: true });
  writeFileSync(join(dir, name), content);
  return name;
};
const run = (...args: string[]) => {
  const result = spawnSync(process.execPath, [builtCli, ...args], { cwd: dir, encoding: "utf8", timeout: 60_000 });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
};

const good = file("good.mmd", "flowchart LR\n  A --> B\n");
const bad = file("bad.md", "# Title\n\n```mermaid\nflowchart LR\n  A[Start --> B\n```\n");
// Mermaid.js parses this Gantt chart, but Pele can't draw it: a warning only (corpus: gantt-invalid-date).
const warning = file("warning.mmd", "gantt\n  dateFormat YYYY-MM-DD\n  section S\n  Task :a1, 2026-13-45, 3d\n");

describe("diagramist check", () => {
  it("exits 0 when every diagram passes", () => {
    const { code, stdout } = run("check", good);
    expect(code).toBe(0);
    expect(stdout).toBe("good.mmd: 1 diagram, 0 errors, 0 warnings [Mermaid.js 12.3.0 parse, Pele 1.13.0 render]\n");
  });

  it("exits 1 for a diagram error, and prints it in the text grammar", () => {
    const { code, stdout } = run("check", bad);
    expect(code).toBe(1);
    const lines = stdout.split("\n");
    expect(lines[0]).toBe("bad.md: 1 diagram, 1 error, 1 warning [Mermaid.js 12.3.0 parse, Pele 1.13.0 render]");
    expect(lines[1]).toMatch(/^bad\.md:5:16: error \[Mermaid\.js parse\] Expecting .*, got end of diagram$/);
    expect(lines[2]).toBe("  diagram text (untrusted):");
    expect(lines).toContain("  5 |   A[Start --> B");
    expect(stdout).toMatch(/^bad\.md:5:16: warning \[Pele syntax\] /m);
  });

  it("exits 0 when there are only warnings", () => {
    const { code, stdout } = run("check", warning);
    expect(code).toBe(0);
    expect(stdout).toMatch(/^warning\.mmd: 1 diagram, 0 errors, 1 warning /);
  });

  it("exits 2 for a file problem, which wins over diagram errors", () => {
    const missing = run("check", "missing.md");
    expect(missing.code).toBe(2);
    expect(missing.stdout).toBe("missing.md: cannot check (not-found): No such file.\n");
    expect(run("check", bad, "missing.md").code).toBe(2);
    expect(run("check", file("notes.txt", "x")).stdout).toMatch(/cannot check \(unsupported-file\)/);
  });

  it("prints one schema-valid JSON result per file with --json", () => {
    const { code, stdout } = run("check", good, bad, "missing.md", "--json");
    expect(code).toBe(2);
    const schema = z.fromJSONSchema(checkResultJsonSchema as unknown as Parameters<typeof z.fromJSONSchema>[0]);
    const results = stdout.trim().split("\n").map((line) => JSON.parse(line));
    expect(results.map((r) => r.status)).toEqual(["checked", "checked", "not-found"]);
    for (const result of results) expect(schema.safeParse(result).success).toBe(true);
    expect(results[1].file).toBe(join(dir, "bad.md"));
  });

  it("lists passing diagrams with --verbose", () => {
    expect(run("check", good, "--verbose").stdout).toMatch(/^good\.mmd:1: ok \(flowchart-v2\): Mermaid\.js parses, Pele renders$/m);
  });

  it("checks folders, skipping node_modules and hidden folders", () => {
    file("docs/b.md", "```mermaid\nflowchart LR\n  A --> B\n```\n");
    file("docs/a/c.MMD", "flowchart LR\n  C --> D\n");
    file("docs/notes.txt", "flowchart LR");
    file("docs/node_modules/x.md", "```mermaid\nnot a diagram\n```\n");
    file("docs/.hidden/y.md", "```mermaid\nnot a diagram\n```\n");
    const { code, stdout } = run("check", "docs");
    expect(code).toBe(0);
    expect(stdout.split("\n").filter(Boolean).map((line) => line.split(":")[0])).toEqual([join("docs", "a", "c.MMD"), join("docs", "b.md")]);
  });

  it("exits 2, quietly, when the reader stops before checking is done", async () => {
    for (let i = 0; i < 30; i++) file(`many/d${String(i).padStart(2, "0")}.mmd`, "flowchart LR\n  A --> B\n");
    const child = spawn(process.execPath, [builtCli, "check", "many"], { cwd: dir });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stdout.once("data", () => child.stdout.destroy());
    const [code] = await once(child, "exit");
    expect(code).toBe(2);
    expect(stderr).toBe("");
  });

  it("notes an empty folder without failing", () => {
    mkdirSync(join(dir, "empty"));
    expect(run("check", "empty")).toMatchObject({ code: 0, stdout: "empty: no .md, .markdown, .mmd or .mermaid files found\n" });
  });
});

describe("the package", () => {
  it("ships the agent skill with its own version", () => {
    const pkg = JSON.parse(readFileSync(join(builtCli, "..", "..", "package.json"), "utf8"));
    const skill = readFileSync(join(builtCli, "..", "..", "skills", "diagramist", "SKILL.md"), "utf8");
    expect(skill).toContain(`diagramistVersion: "${pkg.version}"`);
  });
});

describe("diagramist", () => {
  it("passes --self-test", () => {
    const { code, stdout } = run("--self-test");
    expect(code).toBe(0);
    expect(stdout).toMatch(/^Self-test passed: 48 sample diagrams, one per type, checked with Mermaid\.js 12\.3\.0 and Pele 1\.13\.0\.$/m);
  });

  it("prints its version", () => {
    expect(run("--version")).toMatchObject({ code: 0, stdout: expect.stringMatching(/^diagramist \d+\.\d+\.\d+\S* \(Mermaid\.js 12\.3\.0, Pele 1\.13\.0\)\n$/) });
  });

  it("prints usage for --help, and exits 2 with usage on stderr for a bad command line", () => {
    expect(run("--help")).toMatchObject({ code: 0, stdout: expect.stringContaining("Usage:") });
    for (const args of [["--bogus"], [], ["check"], ["frobnicate"], ["mcp", "extra"]]) {
      const { code, stdout, stderr } = run(...args);
      expect(code, args.join(" ")).toBe(2);
      expect(stdout, args.join(" ")).toBe("");
      expect(stderr, args.join(" ")).toMatch(/^diagramist/);
    }
  });
});
