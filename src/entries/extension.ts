// The VS Code extension (design item 86). `activate` sets up the log, then registers diagnostics (on
// the shared coordinator), the preview and agent setup; `deactivate` stops the check worker.
import { pathToFileURL } from "node:url";
import * as vscode from "vscode";
import * as agentSetup from "../features/agent-setup/index.js";
import * as diagnostics from "../features/diagnostics/index.js";
import * as preview from "../features/preview/index.js";
import type { PreviewState } from "../platform/messages.js";
import { Coordinator } from "../platform/node/coordinator.js";
import { DIAGRAMIST_VERSION, RENDERER_VERSIONS } from "../platform/node/versions.js";
import { Counts } from "../platform/vscode/counts.js";
import { createLog } from "../platform/vscode/log.js";
import { replaceTrustForTests } from "../platform/vscode/trust.js";

let coordinator: Coordinator | undefined;

export function activate(context: vscode.ExtensionContext) {
  const log = createLog({ extension: DIAGRAMIST_VERSION, ...RENDERER_VERSIONS });
  const counts = new Counts();
  context.subscriptions.push(log.channel);
  coordinator = new Coordinator({
    workerUrl: pathToFileURL(vscode.Uri.joinPath(context.extensionUri, "dist", "check-worker.mjs").fsPath),
    mode: "latest-wins",
    meta: { checker: `diagramist ${DIAGRAMIST_VERSION}`, renderers: { ...RENDERER_VERSIONS } },
    logger: log,
  });
  diagnostics.register(context, { coordinator, log, counts });
  preview.register(context, { log });
  agentSetup.register(context, { extensionVersion: DIAGRAMIST_VERSION, log, counts });
  // For the extension tests, which run in the same host but load their own copy of the modules.
  return {
    counts,
    replaceTrustForTests,
    registerAgentSetupForTests: (testContext: Pick<vscode.ExtensionContext, "subscriptions" | "globalState">) =>
      agentSetup.register(testContext, { extensionVersion: DIAGRAMIST_VERSION, log, counts }),
    setAgentHomeForTests: agentSetup.setHomeForTests,
    restorePreviewForTests: (state: PreviewState) => preview.restoreForTests(context, log, state),
  };
}

export async function deactivate(): Promise<void> {
  await coordinator?.close();
  coordinator = undefined;
}
