// The MCP server (Technical Plan section 5), started by `diagramist mcp` over stdio. It ships in v1
// only if D7's agent evaluation says so; until then `diagramist --help` doesn't list it.
// One tool, `check`, which answers with the CLI's text form. Stdout carries only protocol messages.
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { fileProblemResult } from "../../core/result/build-result.js";
import type { CheckMeta } from "../../core/result/build-result.js";
import { formatText } from "../../core/result/format-text.js";
import type { CheckResult } from "../../core/result/schema.js";
import type { Coordinator } from "../../platform/node/coordinator.js";
import type { Logger } from "../../platform/node/logger.js";
import { DIAGRAMIST_VERSION } from "../../platform/node/versions.js";
import { exitCodeFor } from "./exit-code.js";
import { PATH_DESCRIPTION, TEXT_DESCRIPTION, TOOL_DESCRIPTION } from "./tool-description.js";

export function createMcpServer(coordinator: Coordinator, meta: CheckMeta): McpServer {
  const server = new McpServer({ name: "diagramist", version: DIAGRAMIST_VERSION }, { capabilities: { tools: {} } });
  server.registerTool(
    "check",
    {
      title: "Check Mermaid diagrams",
      description: TOOL_DESCRIPTION,
      inputSchema: z.object({
        path: z.string().optional().describe(PATH_DESCRIPTION),
        text: z.string().optional().describe(TEXT_DESCRIPTION),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ path, text }) => {
      let result: CheckResult | null;
      if ((path === undefined) === (text === undefined)) {
        result = fileProblemResult(meta, null, "bad-input", "Give exactly one of path or text.");
      } else if (path !== undefined) {
        result = await coordinator.checkFile(path);
      } else {
        result = await coordinator.checkText(text!);
      }
      if (!result) result = fileProblemResult(meta, null, "bad-input", "The check was replaced by a newer one.");
      return {
        content: [{ type: "text" as const, text: formatText(result, { displayPath: path ?? "<text>" }) }],
        // Only file and tool problems are errors for the client; a diagram error is a normal answer.
        isError: exitCodeFor(result) === 2,
      };
    },
  );
  return server;
}

/** Serves MCP on stdin and stdout until stdin closes. */
export async function runMcpServer(coordinator: Coordinator, meta: CheckMeta, logger: Logger): Promise<0> {
  const closed = new Promise<void>((done) => {
    process.stdin.once("end", done);
    process.stdin.once("close", done);
  });
  const handle = serveStdio(() => createMcpServer(coordinator, meta), {
    onerror: (error) => logger.log("warn", `MCP: ${error.message}`),
  });
  await closed;
  await handle.close();
  return 0;
}
