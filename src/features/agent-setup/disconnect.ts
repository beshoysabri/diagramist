// "Diagramist: Disconnect AI Agent" (design item 121). After the user agrees it deletes only that
// agent's Diagramist skill folder, and says that the global `diagramist` install stays. The MCP remove
// step is skipped while D7 leaves the MCP server out.
import * as vscode from "vscode";
import type { AgentId } from "./agents.js";
import { AGENTS, agentById } from "./agents.js";
import { pickAgent } from "./connect.js";
import { displayPath } from "./home.js";
import type { SetupDeps } from "./setup-deps.js";
import { installedSkill, removeSkill } from "./skill-files.js";

export interface DisconnectArgs {
  agent?: AgentId;
  /** For tests: agree without asking. */
  yes?: boolean;
}

export async function disconnectAgent(deps: SetupDeps, args: DisconnectArgs = {}): Promise<{ agent: AgentId; removed: string } | undefined> {
  const agent = args.agent ? agentById(args.agent) : await pickAgent("Which agent should stop using Diagramist's skill?");
  if (!agent) return undefined;
  const skill = await installedSkill(agent);
  if (!skill) {
    void vscode.window.showInformationMessage(`Diagramist: ${agent.name} has no Diagramist skill to remove.`);
    return undefined;
  }
  if (!skill.version) {
    // Not a SKILL.md that Diagramist wrote; leave it alone.
    void vscode.window.showWarningMessage(`Diagramist: ${displayPath(skill.folder)} doesn't hold Diagramist's skill, so it wasn't deleted.`);
    return undefined;
  }
  // Agents that read this folder too lose the skill as well, unless they have their own copy.
  const sharing = AGENTS.filter((other) => other.alsoReads.includes(agent.id)).map((other) => other.name);
  const detail = [
    `This deletes ${displayPath(skill.folder)}.`,
    sharing.length ? `${sharing.join(" and ")} also read${sharing.length === 1 ? "s" : ""} this folder.` : "",
    "The diagramist command stays installed; `npm uninstall -g diagramist` removes it.",
  ]
    .filter(Boolean)
    .join(" ");
  if (!args.yes) {
    const choice = await vscode.window.showWarningMessage(`Remove Diagramist's skill from ${agent.name}?`, { modal: true, detail }, "Remove");
    if (choice !== "Remove") return undefined;
  }
  const removed = await removeSkill(agent);
  deps.log.log("info", `disconnected ${agent.name}: removed ${removed}`);
  if (!args.yes) void vscode.window.showInformationMessage(`Diagramist: removed the skill from ${agent.name}. The diagramist command is still installed.`);
  return { agent: agent.id, removed };
}
