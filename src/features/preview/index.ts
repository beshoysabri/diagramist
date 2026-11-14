// The preview feature (design items 103 and 114): the open, lock and export commands, and the
// serializer that brings the panel back after a window reload.
import * as vscode from "vscode";
import { fileKind } from "../../core/blocks/find-blocks.js";
import type { PreviewState } from "../../platform/messages.js";
import type { ExtensionLog } from "../../platform/vscode/log.js";
import { exportDiagram } from "./host/export-command.js";
import type { ExportArgs } from "./host/export-command.js";
import { PreviewPanel, VIEW_TYPE } from "./host/panel.js";

export function register(context: vscode.ExtensionContext, deps: { log: ExtensionLog }): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("diagramist.openPreviewToSide", (uri?: vscode.Uri) => openPreview(context, deps.log, uri)),
    vscode.commands.registerCommand("diagramist.togglePreviewLock", () => {
      if (PreviewPanel.active) PreviewPanel.active.toggleLock();
      else void vscode.window.showInformationMessage("Diagramist: open a preview first.");
    }),
    vscode.commands.registerCommand("diagramist.exportDiagram", (args?: ExportArgs | vscode.Uri) =>
      exportDiagram(context.extensionUri, deps.log, args instanceof vscode.Uri ? { uri: args.toString() } : args),
    ),
    vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, {
      deserializeWebviewPanel: (panel, state) => PreviewPanel.restore(panel, context.extensionUri, deps.log, state as PreviewState | undefined),
    }),
    { dispose: () => PreviewPanel.active?.dispose() },
  );
}

async function openPreview(context: vscode.ExtensionContext, log: ExtensionLog, uri?: vscode.Uri): Promise<void> {
  // From the editor title button VS Code passes the file; from the Command Palette, use the active editor.
  const document = uri ? await vscode.workspace.openTextDocument(uri) : vscode.window.activeTextEditor?.document;
  if (!document || !fileKind(document.uri.path)) {
    void vscode.window.showInformationMessage("Diagramist: open a .md, .markdown, .mmd or .mermaid file to preview its diagrams.");
    return;
  }
  PreviewPanel.show(context.extensionUri, log, document);
}

/** For the extension tests: what the serializer does after a window reload, on a fresh panel. */
export async function restoreForTests(context: vscode.ExtensionContext, log: ExtensionLog, state: PreviewState): Promise<void> {
  const panel = vscode.window.createWebviewPanel(VIEW_TYPE, "Diagram preview", { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true });
  await PreviewPanel.restore(panel, context.extensionUri, log, state);
}
