// Typed access to the extension's two settings (design item 79).
import * as vscode from "vscode";

export type Renderer = "mermaid" | "pele";

export const settings = {
  defaultRenderer(): Renderer {
    return vscode.workspace.getConfiguration("diagramist").get<string>("preview.defaultRenderer") === "pele" ? "pele" : "mermaid";
  },
  diagnosticsEnabled(): boolean {
    return vscode.workspace.getConfiguration("diagramist").get<boolean>("diagnostics.enabled", true);
  },
  /** Calls `listener` when one of the two settings changes. */
  onDidChange(listener: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("diagramist")) listener();
    });
  },
};
