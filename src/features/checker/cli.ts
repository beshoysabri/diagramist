// The `diagramist` command (Technical Plan section 5). Results go to stdout; usage errors and logs go
// to stderr. Exit codes (section 3): 2 if any file had a tool or input problem, otherwise 1 if any
// diagram had an error, otherwise 0. Warnings and notices never change the exit code.
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { fileKind } from "../../core/blocks/find-blocks.js";
import { RENDERERS } from "../../core/policy/policy.js";
import { formatText } from "../../core/result/format-text.js";
import type { CheckResult } from "../../core/result/schema.js";
import { Coordinator } from "../../platform/node/coordinator.js";
import { createLogger } from "../../platform/node/logger.js";
import type { Logger } from "../../platform/node/logger.js";
import { DIAGRAMIST_VERSION, RENDERER_VERSIONS } from "../../platform/node/versions.js";
import { runSelfTest } from "./self-test.js";

export const USAGE = `Usage:
  diagramist check <files or folders…> [--json] [--verbose]
  diagramist --self-test
  diagramist --version
  diagramist --help

Checks the Mermaid diagrams in .md, .markdown, .mmd and .mermaid files with Mermaid.js and Pele.
In folders it checks those files, skipping node_modules and hidden folders.

  --json      print one JSON result per file
  --verbose   also list the diagrams that pass

Exit codes: 0 no errors, 1 a diagram has an error, 2 a file or tool problem.
`;

export interface CliOptions {
  /** The check worker bundle; defaults to check-worker.mjs next to the running CLI. */
  workerUrl?: URL;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
  logger?: Logger;
  cwd?: string;
}

type ExitCode = 0 | 1 | 2;

export async function runCli(argv: readonly string[], options: CliOptions = {}): Promise<ExitCode> {
  const out = options.stdout ?? ((text: string) => void process.stdout.write(text));
  const err = options.stderr ?? ((text: string) => void process.stderr.write(text));
  let parsed;
  try {
    parsed = parseArgs({
      args: argv.slice(2),
      options: {
        json: { type: "boolean" },
        verbose: { type: "boolean" },
        "self-test": { type: "boolean" },
        version: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    err(`diagramist: ${(error as Error).message}\n\n${USAGE}`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.help) {
    out(USAGE);
    return 0;
  }
  if (values.version) {
    out(`diagramist ${DIAGRAMIST_VERSION} (Mermaid.js ${RENDERER_VERSIONS.mermaid}, Pele ${RENDERER_VERSIONS.pele})\n`);
    return 0;
  }

  const [command, ...paths] = positionals;
  if (!values["self-test"]) {
    if (command === "mcp") {
      err("diagramist: the MCP server isn't part of this version. Use `diagramist check`.\n");
      return 2;
    }
    if (command !== "check") {
      err(`diagramist: ${command ? `unknown command "${command}"` : "no command given"}.\n\n${USAGE}`);
      return 2;
    }
    if (paths.length === 0) {
      err(`diagramist check: name at least one file or folder.\n\n${USAGE}`);
      return 2;
    }
  }

  const coordinator = new Coordinator({
    workerUrl: options.workerUrl ?? new URL("./check-worker.mjs", import.meta.url),
    mode: "fifo",
    meta: { checker: `diagramist ${DIAGRAMIST_VERSION}`, renderers: { ...RENDERER_VERSIONS } },
    logger: options.logger ?? createLogger(),
    cwd: options.cwd,
  });
  try {
    if (values["self-test"]) return await runSelfTest(coordinator, out);
    let code: ExitCode = 0;
    for (const path of paths) {
      const { files, empty, problems } = await expand(path, options.cwd);
      for (const problem of problems) {
        err(`${problem}\n`);
        code = 2;
      }
      // Like a file with no diagrams, an empty folder is not a failure. JSON output stays one result per line.
      if (empty) (values.json ? err : out)(`${path}: no .md, .markdown, .mmd or .mermaid files found\n`);
      for (const file of files) {
        const result = await coordinator.checkFile(file);
        if (!result) continue; // superseded; never happens in fifo mode
        out(values.json ? `${JSON.stringify(result)}\n` : `${formatText(result, { displayPath: file, verbose: values.verbose ?? false })}\n`);
        code = Math.max(code, exitCodeFor(result)) as ExitCode;
      }
    }
    return code;
  } finally {
    await coordinator.close();
  }
}

/** The exit code one file's result calls for. */
export function exitCodeFor(result: CheckResult): ExitCode {
  if (result.status !== "checked" && result.status !== "no-diagrams") return 2;
  let code: ExitCode = 0;
  for (const block of result.blocks) {
    for (const renderer of RENDERERS) {
      for (const problem of block.results[renderer].errors) {
        if (problem.class === "tool") return 2;
        if (problem.severity === "error") code = 1;
      }
    }
  }
  return code;
}

/** A file stays as given; a folder becomes the diagram files inside it, sorted. */
async function expand(path: string, cwd: string | undefined): Promise<{ files: string[]; empty: boolean; problems: string[] }> {
  const isFolder = await stat(cwd ? join(cwd, path) : path).then((info) => info.isDirectory(), () => false);
  if (!isFolder) return { files: [path], empty: false, problems: [] };
  const files: string[] = [];
  const problems: string[] = [];
  await walk(path, cwd, files, problems);
  return { files, empty: files.length === 0 && problems.length === 0, problems };
}

async function walk(folder: string, cwd: string | undefined, files: string[], problems: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(cwd ? join(cwd, folder) : folder, { withFileTypes: true });
  } catch (error) {
    problems.push(`${folder}: cannot read the folder (${(error as NodeJS.ErrnoException).code ?? "error"})`);
    return;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && !entry.name.startsWith(".")) await walk(path, cwd, files, problems);
    } else if ((entry.isFile() || entry.isSymbolicLink()) && fileKind(entry.name)) {
      files.push(path);
    }
  }
}
