// Design item 90: activation, the registered commands, and agent setup waiting for Workspace Trust.
import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { activate, fileUri, pause, waitFor } from "../helpers.js";

const COMMANDS = [
  "diagramist.openPreviewToSide",
  "diagramist.togglePreviewLock",
  "diagramist.exportDiagram",
  "diagramist.connectAgent",
  "diagramist.checkAgentSetup",
  "diagramist.disconnectAgent",
  "diagramist.copyDiagnosticReport",
];

suite("Activation", () => {
  test("activates for a Markdown file and registers every command", async () => {
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(fileUri("README.md")));
    await activate();
    const registered = await vscode.commands.getCommands(true);
    for (const command of COMMANDS) assert.ok(registered.includes(command), command);
  });

  test("runs the version check at once in a trusted workspace", async () => {
    const api = await activate();
    await waitFor(() => api.counts.snapshot().versionChecks >= 1, "the version check");
  });

  test("waits for trust before agent setup runs", async () => {
    const api = await activate();
    let grant: (() => void) | undefined;
    api.replaceTrustForTests({ isTrusted: () => false, onDidGrant: (listener) => ((grant = listener), { dispose() {} }) });
    try {
      const before = api.counts.snapshot().versionChecks;
      const state = new Map<string, unknown>();
      api.registerAgentSetupForTests({
        subscriptions: [],
        globalState: { get: (key: string) => state.get(key), update: async (key: string, value: unknown) => void state.set(key, value), keys: () => [...state.keys()], setKeysForSync() {} } as unknown as vscode.Memento & { setKeysForSync(keys: readonly string[]): void },
      });
      await pause(500);
      assert.equal(api.counts.snapshot().versionChecks, before, "no check before trust");
      assert.ok(grant, "it waits for the trust grant");
      grant!();
      await waitFor(() => api.counts.snapshot().versionChecks === before + 1, "the check after trust");
    } finally {
      api.replaceTrustForTests();
    }
  });
});
