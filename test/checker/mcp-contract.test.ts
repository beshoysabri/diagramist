// Design item 68: `diagramist mcp`, built, driven by the official MCP client over stdio.
import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TOOL_DESCRIPTION } from "../../src/features/checker/tool-description.js";
import { builtCli } from "../helpers/checker-paths.js";
import { caseInput, corpus } from "../helpers/corpus.js";

const dir = realpathSync.native(mkdtempSync(join(tmpdir(), "diagramist-mcp-")));
const files = corpus.cases
  .filter((c) => c.kind !== "text")
  .map((c) => {
    const name = `${c.id}.${c.kind === "markdown" ? "md" : "mmd"}`;
    writeFileSync(join(dir, name), caseInput(c));
    return name;
  });

async function connect(env: Record<string, string> = {}) {
  const client = new Client({ name: "diagramist-contract-test", version: "1.0.0" });
  const stderr: string[] = [];
  const transport = new StdioClientTransport({ command: process.execPath, args: [builtCli, "mcp"], cwd: dir, env: { ...env, PATH: process.env.PATH ?? "" }, stderr: "pipe" });
  transport.stderr?.on("data", (chunk) => stderr.push(String(chunk)));
  await client.connect(transport);
  return { client, stderr };
}

type ToolResult = { content: Array<{ type: string; text?: string }>; isError?: boolean };
const textOf = (result: ToolResult) => result.content.map((part) => part.text ?? "").join("");

let session: Awaited<ReturnType<typeof connect>>;
beforeAll(async () => {
  session = await connect();
});
afterAll(async () => {
  await session.client.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("diagramist mcp", () => {
  it("lists one read-only tool, check, with inputs path and text and a short description", async () => {
    const { tools } = await session.client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(["check"]);
    const [check] = tools;
    expect(check!.annotations).toMatchObject({ readOnlyHint: true, idempotentHint: true, openWorldHint: false });
    expect(Object.keys(check!.inputSchema.properties ?? {}).sort()).toEqual(["path", "text"]);
    expect(check!.description).toBe(TOOL_DESCRIPTION);
    expect(check!.description!.trim().split(/\s+/).length).toBeLessThanOrEqual(80);
  });

  it("answers every corpus file with exactly the CLI's text", async () => {
    for (const file of files) {
      const result = (await session.client.callTool({ name: "check", arguments: { path: file } })) as ToolResult;
      const cli = spawnSync(process.execPath, [builtCli, "check", file], { cwd: dir, encoding: "utf8" });
      expect(textOf(result), file).toBe(cli.stdout.replace(/\n$/, ""));
      expect(result.isError ?? false, file).toBe(cli.status === 2);
    }
  });

  it("checks text input, counting positions from its first line", async () => {
    const result = (await session.client.callTool({ name: "check", arguments: { text: "flowchart LR\n  A[Start --> B" } })) as ToolResult;
    expect(result.isError ?? false).toBe(false);
    expect(textOf(result)).toMatch(/^<text>:2:16: error \[Mermaid\.js parse\]/m);
  });

  it("sets isError for a file problem, and when both or neither input is given", async () => {
    for (const args of [{ path: "missing.md" }, {}, { path: files[0]!, text: "flowchart LR" }]) {
      const result = (await session.client.callTool({ name: "check", arguments: args })) as ToolResult;
      expect(result.isError, JSON.stringify(args)).toBe(true);
      expect(textOf(result)).toMatch(/cannot check \((not-found|bad-input)\)/);
    }
  });

  it("writes nothing but protocol messages to stdout", () => {
    // Any stray output would have broken the client's parsing above; logs go to stderr only.
    expect(session.stderr.join("")).toBe("");
  });

  it("returns a timeout as a tool error when a check takes too long", async () => {
    const slow = await connect({ DIAGRAMIST_TEST_HOOKS: "1", DIAGRAMIST_TEST_SLOW_MS: "3000" });
    const result = (await slow.client.callTool({ name: "check", arguments: { text: "flowchart LR\n  A --> B" } })) as ToolResult;
    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/error \[Mermaid\.js timeout\] The check took longer than 2,000 ms\./);
    await slow.client.close();
  });
});
