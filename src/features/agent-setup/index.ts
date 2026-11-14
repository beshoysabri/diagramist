// The agent-setup feature: D1's version check, "Connect AI Agent", "Check Agent Setup", "Disconnect AI
// Agent" (design items 119-121) and "Copy Diagnostic Report" (122). Agent setup is off in Restricted
// Mode; the report still works there, without running anything.
import * as vscode from "vscode";
import type { Counts } from "../../platform/vscode/counts.js";
import type { ExtensionLog } from "../../platform/vscode/log.js";
import { trust } from "../../platform/vscode/trust.js";
import { checkAgentSetup } from "./check-setup.js";
import { connectAgent } from "./connect.js";
import type { ConnectArgs } from "./connect.js";
import { disconnectAgent } from "./disconnect.js";
import type { DisconnectArgs } from "./disconnect.js";
import { copyDiagnosticReport } from "./report.js";
import type { ReportArgs } from "./report.js";
import type { SetupDeps } from "./setup-deps.js";
import { runVersionCheck } from "./version-check.js";

export { setHomeForTests } from "./home.js";

export function register(
  context: Pick<vscode.ExtensionContext, "subscriptions" | "globalState"> & Partial<Pick<vscode.ExtensionContext, "extensionUri">>,
  deps: { extensionVersion: string; log: ExtensionLog; counts: Counts },
): void {
  const check = () => void runVersionCheck(context as vscode.ExtensionContext, deps.extensionVersion, deps.log, deps.counts);
  if (trust.isTrusted()) check();
  else context.subscriptions.push(trust.onDidGrant(check));
  if (!context.extensionUri) return; // the trust test registers only the version check

  const setup: SetupDeps = { extensionUri: context.extensionUri, extensionVersion: deps.extensionVersion, log: deps.log, counts: deps.counts, globalState: context.globalState };
  const trusted = <A, R>(run: (args: A) => Promise<R>) => async (args: A) => {
    if (trust.isTrusted()) return run(args);
    void vscode.window.showInformationMessage("Diagramist: agent setup is off in Restricted Mode. Trust this folder to use it.");
    return undefined;
  };
  context.subscriptions.push(
    vscode.commands.registerCommand("diagramist.connectAgent", trusted((args?: ConnectArgs) => connectAgent(setup, args))),
    vscode.commands.registerCommand("diagramist.checkAgentSetup", trusted((args?: { quiet?: boolean }) => checkAgentSetup(setup, args))),
    vscode.commands.registerCommand("diagramist.disconnectAgent", trusted((args?: DisconnectArgs) => disconnectAgent(setup, args))),
    vscode.commands.registerCommand("diagramist.copyDiagnosticReport", (args?: ReportArgs) => copyDiagnosticReport(setup, args)),
  );
}
