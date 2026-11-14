// The diagnostics feature: Problems-panel errors for saved diagram files.
import type * as vscode from "vscode";
import type { Coordinator } from "../../platform/node/coordinator.js";
import type { Counts } from "../../platform/vscode/counts.js";
import type { ExtensionLog } from "../../platform/vscode/log.js";
import { Diagnostics } from "./diagnostics.js";

export function register(context: vscode.ExtensionContext, deps: { coordinator: Coordinator; log: ExtensionLog; counts: Counts }): void {
  context.subscriptions.push(new Diagnostics(deps.coordinator, deps.log, deps.counts));
}
