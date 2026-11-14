// Problems-panel errors for saved diagram files (design item 82). A check runs when a document opens,
// when it is saved, and when it reloads from disk with no unsaved changes; a file watcher covers
// files that aren't open. The results come from the coordinator the CLI uses, in latest-wins mode,
// so the editor and the agents see the same codes at the same positions (Goal 5).
import * as vscode from "vscode";
import { fileKind } from "../../core/blocks/find-blocks.js";
import { RENDERER_NAMES, RENDERERS } from "../../core/policy/policy.js";
import type { CheckResult } from "../../core/result/schema.js";
import type { Coordinator } from "../../platform/node/coordinator.js";
import type { Counts } from "../../platform/vscode/counts.js";
import type { ExtensionLog } from "../../platform/vscode/log.js";
import { settings } from "../../platform/vscode/settings.js";

const isInNodeModules = (uri: vscode.Uri) => uri.path.split("/").includes("node_modules");
const isDiagramFile = (uri: vscode.Uri) => uri.scheme === "file" && fileKind(uri.fsPath) !== null && !isInNodeModules(uri);

export class Diagnostics implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection("diagramist");
  private readonly disposables: vscode.Disposable[] = [this.collection];

  constructor(
    private readonly coordinator: Coordinator,
    private readonly log: ExtensionLog,
    private readonly counts: Counts,
  ) {
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.{md,markdown,mmd,mermaid}");
    this.disposables.push(
      watcher,
      vscode.workspace.onDidOpenTextDocument((document) => this.checkDocument(document)),
      vscode.workspace.onDidSaveTextDocument((document) => this.checkDocument(document)),
      // A reload from disk changes the text but leaves the document clean.
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.contentChanges.length > 0 && !event.document.isDirty) this.checkDocument(event.document);
      }),
      watcher.onDidCreate((uri) => this.checkFromDisk(uri)),
      watcher.onDidChange((uri) => this.checkFromDisk(uri)),
      watcher.onDidDelete((uri) => this.collection.delete(uri)),
      settings.onDidChange(() => this.refresh()),
    );
    this.refresh();
  }

  dispose(): void {
    for (const disposable of this.disposables.splice(0)) disposable.dispose();
  }

  /** Checks every open diagram file again, or clears everything when diagnostics are off. */
  private refresh(): void {
    if (!settings.diagnosticsEnabled()) {
      this.collection.clear();
      return;
    }
    for (const document of vscode.workspace.textDocuments) this.checkDocument(document);
  }

  /** The checker reads the saved file, so a document with unsaved changes keeps its last results. */
  private checkDocument(document: vscode.TextDocument): void {
    if (!document.isDirty) void this.check(document.uri);
  }

  private checkFromDisk(uri: vscode.Uri): void {
    const open = vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString());
    if (!open?.isDirty) void this.check(uri);
  }

  private async check(uri: vscode.Uri): Promise<void> {
    if (!settings.diagnosticsEnabled() || !isDiagramFile(uri)) return;
    this.counts.add("checks");
    let result: CheckResult | null;
    try {
      result = await this.coordinator.checkFile(uri.fsPath, { key: uri.toString() });
    } catch (error) {
      this.log.log("error", `Checking ${uri.fsPath} failed: ${(error as Error).message}`);
      return;
    }
    // null: a newer check of the same file replaced this one.
    if (result && settings.diagnosticsEnabled()) this.collection.set(uri, toDiagnostics(result, this.counts));
  }
}

/** One diagnostic per problem, and an Information diagnostic per notice. */
export function toDiagnostics(result: CheckResult, counts?: Counts): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  if (result.status === "too-large" || result.status === "not-text") {
    const diagnostic = new vscode.Diagnostic(wholeLine(1), `Diagramist can't check this file: ${result.message ?? result.status}`, vscode.DiagnosticSeverity.Warning);
    diagnostic.source = "Diagramist";
    diagnostic.code = result.status;
    return [diagnostic];
  }
  for (const block of result.blocks) {
    counts?.add("diagramsChecked");
    for (const renderer of RENDERERS) {
      for (const problem of block.results[renderer].errors) {
        const range = problem.position
          ? new vscode.Range(problem.position.line - 1, problem.position.column - 1, problem.position.line - 1, problem.position.column)
          : wholeLine(problem.anchorLine);
        const severity = problem.severity === "error" ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
        const diagnostic = new vscode.Diagnostic(range, problem.hint ? `${problem.message}\n${problem.hint}` : problem.message, severity);
        diagnostic.source = `Diagramist (${RENDERER_NAMES[renderer]})`;
        diagnostic.code = problem.code;
        diagnostics.push(diagnostic);
        counts?.add(problem.class === "tool" ? "toolErrors" : problem.severity === "error" ? "errorsShown" : "warningsShown");
      }
    }
    for (const notice of block.notices) {
      const diagnostic = new vscode.Diagnostic(wholeLine(block.firstLine), notice.message, vscode.DiagnosticSeverity.Information);
      diagnostic.source = "Diagramist";
      diagnostic.code = notice.code;
      diagnostics.push(diagnostic);
    }
  }
  return diagnostics;
}

/** A whole line, 1-based; the editor trims the end to the line's length. */
function wholeLine(line: number): vscode.Range {
  return new vscode.Range(line - 1, 0, line - 1, Number.MAX_SAFE_INTEGER);
}
