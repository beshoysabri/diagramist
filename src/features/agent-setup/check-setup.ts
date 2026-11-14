// "Diagramist: Check Agent Setup" (design item 120). It runs `diagramist --version` and each agent's
// `--version`, each with a 10 s limit, and reports each agent's skill copy and its version. The MCP
// list check is skipped while D7 leaves the MCP server out.
import * as vscode from "vscode";
import type { AgentId } from "./agents.js";
import { AGENTS } from "./agents.js";
import { displayPath } from "./home.js";
import { runVersion, versionIn } from "./run-command.js";
import type { SetupDeps } from "./setup-deps.js";
import { installedSkill } from "./skill-files.js";

const LIMIT_MS = 10_000;

export interface AgentStatus {
  id: AgentId;
  name: string;
  /** The agent's version, "not installed", or "unknown" when it gave none. */
  version: string;
  skill: { folder: string; version: string | null } | null;
}

export interface SetupStatus {
  checker: string;
  agents: AgentStatus[];
}

export async function collectSetup(): Promise<SetupStatus> {
  const describe = async (command: string) => {
    const outcome = await runVersion(command, LIMIT_MS);
    if (!outcome.ok) return outcome.missing ? "not installed" : "unknown";
    return versionIn(outcome.stdout) ?? "unknown";
  };
  const [checker, ...agents] = await Promise.all([
    describe("diagramist"),
    ...AGENTS.map(async (agent): Promise<AgentStatus> => ({ id: agent.id, name: agent.name, version: await describe(agent.cli), skill: await installedSkill(agent) })),
  ]);
  return { checker: checker as string, agents: agents as AgentStatus[] };
}

/** One line per part, for the dialog and the diagnostic report. */
export function describeSetup(status: SetupStatus, extensionVersion: string, includePaths: boolean): string[] {
  const checker =
    status.checker === "not installed"
      ? "diagramist command: not installed, or not on the PATH"
      : `diagramist command: ${status.checker}${status.checker === extensionVersion ? " (same as the extension)" : `, while the extension is ${extensionVersion}`}`;
  return [
    checker,
    ...status.agents.map((agent) => {
      const skill = agent.skill ? `skill ${agent.skill.version ?? "of unknown version"}${includePaths ? ` in ${displayPath(agent.skill.folder)}` : ""}` : "no Diagramist skill";
      return `${agent.name}: ${agent.version === "not installed" ? "not installed" : agent.version}; ${skill}`;
    }),
  ];
}

export async function checkAgentSetup(deps: SetupDeps, args: { quiet?: boolean } = {}): Promise<SetupStatus> {
  const status = await collectSetup();
  const lines = describeSetup(status, deps.extensionVersion, true);
  deps.log.log("info", `agent setup:\n${lines.join("\n")}`);
  if (!args.quiet) void vscode.window.showInformationMessage("Diagramist: agent setup", { modal: true, detail: lines.join("\n") });
  return status;
}
