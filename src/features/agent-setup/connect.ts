// "Diagramist: Connect AI Agent" (design item 119, CUJ 7). It makes sure the `diagramist` command is
// installed, offering npm's install line in a visible terminal, then copies the skill into the chosen
// agent's own folder, after the user agrees. A newer copy already there is kept. The MCP server isn't
// registered: D7 leaves it out of v1.
import * as vscode from "vscode";
import type { AgentId } from "./agents.js";
import { AGENTS, agentById, compareVersions, skillFolder, skillVersion } from "./agents.js";
import { displayPath, home } from "./home.js";
import { installedSkill, writeSkill } from "./skill-files.js";
import type { SetupDeps } from "./setup-deps.js";
import { AGENT_CONNECTED_KEY, checkInstalledVersion } from "./version-check.js";

export interface ConnectArgs {
  agent?: AgentId;
  /** For tests: agree to everything and don't open terminals. */
  yes?: boolean;
}

export type ConnectOutcome = { agent: AgentId; skill: "copied" | "kept"; folder: string };

export async function connectAgent(deps: SetupDeps, args: ConnectArgs = {}): Promise<ConnectOutcome | undefined> {
  const agent = args.agent ? agentById(args.agent) : await pickAgent("Which agent should check its Mermaid diagrams with Diagramist?");
  if (!agent) return undefined;

  const installed = await checkInstalledVersion(deps.extensionVersion);
  if (installed.status === "missing" && !args.yes) {
    const install = `npm install -g diagramist@${deps.extensionVersion}`;
    const choice = await vscode.window.showInformationMessage(
      `${agent.name} checks diagrams with the diagramist command, which isn't installed. Install it now?`,
      { modal: true, detail: `This runs, in a terminal you can watch:\n${install}` },
      "Install in a terminal",
    );
    if (choice) {
      const terminal = vscode.window.createTerminal({ name: "Diagramist" });
      terminal.show();
      terminal.sendText(install);
    }
  }

  const source = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(deps.extensionUri, "skills", "diagramist", "SKILL.md")));
  const version = skillVersion(source) ?? deps.extensionVersion;
  const existing = await installedSkill(agent);
  let outcome: ConnectOutcome;
  if (existing?.version && compareVersions(existing.version, version) >= 0) {
    outcome = { agent: agent.id, skill: "kept", folder: existing.folder };
  } else {
    const target = displayPath(skillFolder(home(), agent));
    if (!args.yes) {
      const choice = await vscode.window.showInformationMessage(
        `Copy Diagramist's skill for ${agent.name}?`,
        { modal: true, detail: `It tells ${agent.name} when and how to check diagrams, and when to stop and ask you. One file, SKILL.md, goes to ${target}.` },
        "Copy",
      );
      if (choice !== "Copy") return undefined;
    }
    outcome = { agent: agent.id, skill: "copied", folder: await writeSkill(agent, source) };
  }
  await deps.globalState.update(AGENT_CONNECTED_KEY, true);
  deps.log.log("info", `connected ${agent.name}: skill ${outcome.skill} in ${outcome.folder}`);

  if (!args.yes) {
    const copyRule = "Copy permission rule";
    const choice = await vscode.window.showInformationMessage(
      `${agent.name} is connected: its skill is in ${displayPath(outcome.folder)}. To let it run diagramist check without asking, add a rule to ${agent.permission.file}.`,
      copyRule,
    );
    if (choice === copyRule) await vscode.env.clipboard.writeText(agent.permission.rule);
  }
  return outcome;
}

export async function pickAgent(placeHolder: string): Promise<(typeof AGENTS)[number] | undefined> {
  const picked = await vscode.window.showQuickPick(
    AGENTS.map((agent) => ({ label: agent.name, description: `skill in ~/${agent.skillsDir}`, agent })),
    { placeHolder, ignoreFocusOut: true },
  );
  return picked?.agent;
}
