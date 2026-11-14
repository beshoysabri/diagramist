// Design item 112: the preview opens beside the editor without taking focus, follows the active
// editor, stays put when locked, and comes back from its saved state after a reload.
import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { activate, fileUri, pause, waitFor } from "../helpers.js";

const previewTab = () =>
  vscode.window.tabGroups.all.flatMap((group) => group.tabs).find((tab) => tab.input instanceof vscode.TabInputWebview && tab.input.viewType.includes("diagramist.preview"));

const show = async (name: string) => vscode.window.showTextDocument(await vscode.workspace.openTextDocument(fileUri(name)), vscode.ViewColumn.One);

suite("Preview", () => {
  test("opens beside the editor, for the active file, without taking focus", async () => {
    await activate();
    await show("README.md");
    await vscode.commands.executeCommand("diagramist.openPreviewToSide");
    await waitFor(() => previewTab()?.label === "Preview README.md", "the preview tab");
    assert.equal(vscode.window.activeTextEditor?.document.uri.fsPath, fileUri("README.md").fsPath);
  });

  test("follows the active editor", async () => {
    await show("flow.mmd");
    await waitFor(() => previewTab()?.label === "Preview flow.mmd", "the preview to follow flow.mmd");
  });

  test("stays on its file while locked", async () => {
    await vscode.commands.executeCommand("diagramist.togglePreviewLock");
    try {
      await show("README.md");
      await pause(500);
      assert.equal(previewTab()?.label, "Preview flow.mmd");
    } finally {
      await vscode.commands.executeCommand("diagramist.togglePreviewLock");
    }
  });

  test("comes back from its saved state after a reload", async () => {
    const api = await activate();
    const tab = previewTab();
    if (tab) await vscode.window.tabGroups.close(tab);
    await waitFor(() => !previewTab(), "the preview to close");
    await api.restorePreviewForTests({ uri: fileUri("README.md").toString(), block: 2, v: 1 });
    await waitFor(() => previewTab()?.label === "Preview README.md", "the restored preview");
  });
});
