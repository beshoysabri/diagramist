// D1's version check. When the extension activates, it runs `diagramist --version` once, with a 5 s
// limit. A different version gets a non-blocking notice with a "Copy update command" button. A
// missing command is mentioned only once an agent has been connected in this profile (P7 sets that).
import { execFile } from "node:child_process";
import * as vscode from "vscode";
import type { Counts } from "../../platform/vscode/counts.js";
import type { ExtensionLog } from "../../platform/vscode/log.js";

export const AGENT_CONNECTED_KEY = "diagramist.agentConnected";

export type VersionCheck = { status: "same" | "different"; found: string } | { status: "missing" | "unreadable"; found: null };

export type RunVersion = () => Promise<{ ok: true; stdout: string } | { ok: false; missing: boolean }>;

const runInstalledVersion: RunVersion = () =>
  new Promise((done) => {
    // npm's command on Windows is a .cmd file, which needs a shell.
    execFile("diagramist", ["--version"], { timeout: 5_000, shell: process.platform === "win32", windowsHide: true }, (error, stdout, stderr) => {
      if (!error) return done({ ok: true, stdout });
      // ENOENT without a shell; through cmd.exe, a missing command prints "is not recognized".
      const missing = (error as NodeJS.ErrnoException).code === "ENOENT" || /not recognized|not found/i.test(String(stderr));
      done({ ok: false, missing });
    });
  });

export async function checkInstalledVersion(extensionVersion: string, run: RunVersion = runInstalledVersion): Promise<VersionCheck> {
  const outcome = await run();
  if (!outcome.ok) return { status: outcome.missing ? "missing" : "unreadable", found: null };
  const found = /^diagramist (\S+)/.exec(outcome.stdout.trim())?.[1];
  if (!found) return { status: "unreadable", found: null };
  return { status: found === extensionVersion ? "same" : "different", found };
}

export async function runVersionCheck(context: vscode.ExtensionContext, extensionVersion: string, log: ExtensionLog, counts: Counts, run?: RunVersion): Promise<VersionCheck> {
  counts.add("versionChecks");
  const check = await checkInstalledVersion(extensionVersion, run);
  log.log("info", `diagramist command: ${check.status}${check.found ? ` (${check.found})` : ""}`);
  const command = `npm install -g diagramist@${extensionVersion}`;
  let message: string | null = null;
  if (check.status === "different") {
    message = `The diagramist command your agents run is version ${check.found}, and this extension is ${extensionVersion}. Until they match, agents and the Problems panel may disagree.`;
  } else if (check.status === "missing" && context.globalState.get<boolean>(AGENT_CONNECTED_KEY)) {
    message = "Your AI agents check diagrams with the diagramist command, which isn't installed or isn't on the PATH.";
  }
  if (message) {
    void vscode.window.showInformationMessage(message, "Copy update command").then(async (choice) => {
      if (choice) await vscode.env.clipboard.writeText(command);
    });
  }
  return check;
}
