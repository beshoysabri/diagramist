// What the agent-setup commands need from the extension.
import type * as vscode from "vscode";
import type { Counts } from "../../platform/vscode/counts.js";
import type { ExtensionLog } from "../../platform/vscode/log.js";

export interface SetupDeps {
  extensionUri: vscode.Uri;
  extensionVersion: string;
  log: ExtensionLog;
  counts: Counts;
  globalState: vscode.Memento;
}
