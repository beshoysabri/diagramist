// The agent-setup feature. P4 registers the version check (D1); P7 adds Connect, Check and Disconnect
// AI Agent and the diagnostic report. Agent setup is off in Restricted Mode.
import type * as vscode from "vscode";
import type { Counts } from "../../platform/vscode/counts.js";
import type { ExtensionLog } from "../../platform/vscode/log.js";
import { trust } from "../../platform/vscode/trust.js";
import { runVersionCheck } from "./version-check.js";

export function register(context: vscode.ExtensionContext, deps: { extensionVersion: string; log: ExtensionLog; counts: Counts }): void {
  const check = () => void runVersionCheck(context, deps.extensionVersion, deps.log, deps.counts);
  if (trust.isTrusted()) check();
  else context.subscriptions.push(trust.onDidGrant(check));
}
