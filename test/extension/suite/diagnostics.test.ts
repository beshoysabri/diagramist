// Design item 91: Problems-panel diagnostics for saved files, and Goal 5's measure: the same codes at
// the same positions as `diagramist check --json`.
import * as assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import { activate, cliResult, diagnosticsFor, fileUri, pause, waitFor, workspace } from "../helpers.js";

const errorsOf = (uri: vscode.Uri) => diagnosticsFor(uri).filter((d) => d.severity === vscode.DiagnosticSeverity.Error);

/** The CLI's problems as "source code line:column" strings, like the diagnostics below. */
function cliProblems(name: string): string[] {
  const names: Record<string, string> = { mermaid: "Mermaid.js", pele: "Pele" };
  return cliResult(name).blocks.flatMap((block) =>
    Object.entries(block.results).flatMap(([renderer, result]) =>
      result.errors.map((e) => `Diagramist (${names[renderer]}) ${e.code} ${e.position ? `${e.position.line}:${e.position.column}` : `${e.anchorLine}:1`}`),
    ),
  );
}
const editorProblems = (uri: vscode.Uri) =>
  diagnosticsFor(uri)
    .filter((d) => d.severity !== vscode.DiagnosticSeverity.Information)
    .map((d) => `${d.source} ${d.code} ${d.range.start.line + 1}:${d.range.start.character + 1}`);

suite("Diagnostics", () => {
  suiteSetup(async () => {
    await activate();
  });

  test("a saved broken diagram gets an error at the checker's position", async () => {
    const uri = fileUri("README.md");
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
    const [error] = await waitFor(() => (errorsOf(uri).length ? errorsOf(uri) : null), "an error in README.md");
    assert.equal(error!.source, "Diagramist (Mermaid.js)");
    assert.equal(error!.code, "parse");
    assert.equal(error!.range.start.line + 1, 14);
  });

  test("shows the same codes and positions as the CLI (Goal 5)", async () => {
    const uri = fileUri("README.md");
    await waitFor(() => diagnosticsFor(uri).length > 0, "diagnostics for README.md");
    assert.deepEqual(editorProblems(uri).sort(), cliProblems("README.md").sort());
  });

  test("unsaved edits change nothing", async () => {
    const uri = fileUri("flow.mmd");
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    await pause(1_500);
    assert.deepEqual(errorsOf(uri), []);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(uri, new vscode.Position(1, 0), "  Broken[oops --> X\n");
    await vscode.workspace.applyEdit(edit);
    await pause(1_500);
    assert.deepEqual(errorsOf(uri), [], "the checker only sees the saved file");
    await vscode.commands.executeCommand("workbench.action.files.revert");
  });

  test("fixing and saving clears the error", async () => {
    const uri = fileUri("README.md");
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    await waitFor(() => errorsOf(uri).length > 0, "the error before the fix");
    const line = document.lineAt(13);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, line.range, "  C[Start] --> D");
    await vscode.workspace.applyEdit(edit);
    await document.save();
    await waitFor(() => errorsOf(uri).length === 0, "the error to clear");
  });

  test("a file written outside the editor gets diagnostics", async () => {
    const uri = fileUri("outside.mmd");
    writeFileSync(join(workspace, "outside.mmd"), "sequenceDiagram\n  Alice->>Bob Hello\n");
    const [error] = await waitFor(() => (errorsOf(uri).length ? errorsOf(uri) : null), "an error in outside.mmd");
    assert.equal(error!.source, "Diagramist (Mermaid.js)");
    assert.deepEqual(editorProblems(uri).sort(), cliProblems("outside.mmd").sort());
  });
});
