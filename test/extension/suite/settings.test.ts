// Design item 92: the two settings and their defaults.
import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { activate, diagnosticsFor, fileUri, waitFor } from "../helpers.js";

suite("Settings", () => {
  test("have the documented defaults", () => {
    const config = vscode.workspace.getConfiguration("diagramist");
    assert.equal(config.get("preview.defaultRenderer"), "mermaid");
    assert.equal(config.get("diagnostics.enabled"), true);
  });

  test("diagnostics.enabled clears and restores the Problems panel", async () => {
    await activate();
    const uri = fileUri("outside.mmd");
    const config = () => vscode.workspace.getConfiguration("diagramist");
    await waitFor(() => diagnosticsFor(uri).length > 0, "diagnostics before the switch");
    try {
      await config().update("diagnostics.enabled", false, vscode.ConfigurationTarget.Global);
      await waitFor(() => diagnosticsFor(uri).length === 0, "diagnostics to clear");
    } finally {
      await config().update("diagnostics.enabled", undefined, vscode.ConfigurationTarget.Global);
    }
    // Only open documents are checked again; outside.mmd isn't open, so open it.
    await vscode.workspace.openTextDocument(uri);
    await waitFor(() => diagnosticsFor(uri).length > 0, "diagnostics to return");
  });
});
