#!/usr/bin/env node
// Runs the extension tests (design item 88): bundles them, downloads stable VS Code into
// .vscode-test/ (cached), and runs the Mocha suites in a copy of the fixture workspace.
// On Linux without a display, run it under `xvfb-run -a`. Needs `npm run build` first.
import { cpSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runTests } from "@vscode/test-electron";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "../..");
const out = join(root, "out/test-extension");
await build({
  absWorkingDir: root,
  entryPoints: { index: "test/extension/index.ts", suites: "test/extension/suites.ts" },
  outdir: out,
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22.15",
  external: ["vscode", "mocha"],
  logLevel: "warning",
});

const workspace = realpathSync.native(mkdtempSync(join(tmpdir(), "diagramist-ext-")));
cpSync(join(root, "test/extension/fixtures/workspace"), workspace, { recursive: true });
try {
  await runTests({
    version: "stable",
    cachePath: join(root, ".vscode-test"),
    extensionDevelopmentPath: join(root, "packages/vscode"),
    extensionTestsPath: join(out, "index.cjs"),
    launchArgs: [workspace, "--disable-extensions", "--skip-welcome", "--skip-release-notes", "--disable-workspace-trust"],
    extensionTestsEnv: {
      DIAGRAMIST_TEST_WORKSPACE: workspace,
      DIAGRAMIST_TEST_NODE: process.execPath,
      DIAGRAMIST_TEST_CLI: join(root, "packages/diagramist/dist/cli.mjs"),
    },
  });
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
