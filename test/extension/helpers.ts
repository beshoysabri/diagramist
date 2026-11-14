// Shared helpers for the extension tests.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import * as vscode from "vscode";

export const EXTENSION_ID = "beshoysabri.diagramist";
export const workspace = process.env.DIAGRAMIST_TEST_WORKSPACE!;
export const fileUri = (name: string) => vscode.Uri.file(join(workspace, name));

export interface TestApi {
  counts: { snapshot(): { checks: number; versionChecks: number } };
  replaceTrustForTests(replacement?: { isTrusted(): boolean; onDidGrant(listener: () => void): vscode.Disposable }): void;
  registerAgentSetupForTests(context: Pick<vscode.ExtensionContext, "subscriptions" | "globalState">): void;
  restorePreviewForTests(state: { uri: string; block: number; v: 1 }): Promise<void>;
}

export async function activate(): Promise<TestApi> {
  const extension = vscode.extensions.getExtension<TestApi>(EXTENSION_ID);
  if (!extension) throw new Error(`${EXTENSION_ID} is not loaded`);
  return extension.activate();
}

/** Diagramist's diagnostics for a file. */
export const diagnosticsFor = (uri: vscode.Uri) => vscode.languages.getDiagnostics(uri).filter((d) => d.source?.startsWith("Diagramist"));

export async function waitFor<T>(probe: () => T | undefined | null | false, what: string, timeoutMs = 20_000): Promise<T> {
  const started = Date.now();
  for (;;) {
    const value = probe();
    if (value) return value;
    if (Date.now() - started > timeoutMs) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((done) => setTimeout(done, 100));
  }
}

export const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** The CLI's JSON result for a file, from the same build (Goal 5). */
export function cliResult(name: string): { blocks: Array<{ results: Record<string, { errors: Array<{ code: string; position: { line: number; column: number } | null; anchorLine: number }> }> }> } {
  const run = spawnSync(process.env.DIAGRAMIST_TEST_NODE!, [process.env.DIAGRAMIST_TEST_CLI!, "check", "--json", name], { cwd: workspace, encoding: "utf8" });
  return JSON.parse(run.stdout);
}
