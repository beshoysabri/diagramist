// The preview feature (design item 103): the open and lock commands, and the serializer that brings
// the panel back after a window reload.
import * as vscode from "vscode";
import { fileKind } from "../../core/blocks/find-blocks.js";
import type { PreviewState } from "../../platform/messages.js";
import type { ExtensionLog } from "../../platform/vscode/log.js";
import { PreviewPanel, VIEW_TYPE } from "./host/panel.js";

export function register(context: vscode.ExtensionContext, deps: { log: ExtensionLog }): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("diagramist.openPreviewToSide", (uri?: vscode.Uri) => openPreview(context, deps.log, uri)),
    vscode.commands.registerCommand("diagramist.togglePreviewLock", () => {
      if (PreviewPanel.active) PreviewPanel.active.toggleLock();
      else void vscode.window.showInformationMessage("Diagramist: open a preview first.");
    }),
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
