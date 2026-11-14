// "Diagramist: Copy Diagnostic Report" (design item 122, Technical Plan section 7). Five parts:
// versions, environment, the two settings, agent setup and this window's counts. It leaves out file
// paths, workspace names and diagram text, unless the user chooses to include paths.
import { arch, platform, release } from "node:os";
import * as vscode from "vscode";
import { RENDERER_VERSIONS } from "../../platform/node/versions.js";
import { settings } from "../../platform/vscode/settings.js";
import { trust } from "../../platform/vscode/trust.js";
import { collectSetup, describeSetup } from "./check-setup.js";
import type { SetupDeps } from "./setup-deps.js";

export interface ReportArgs {
  /** Skip the question; tests pass it. */
  includePaths?: boolean;
}

export async function copyDiagnosticReport(deps: SetupDeps, args: ReportArgs = {}): Promise<string | undefined> {
  let includePaths = args.includePaths;
  if (includePaths === undefined) {
    const picked = await vscode.window.showQuickPick(
      [
        { label: "Without file paths", description: "recommended for sharing", value: false },
        { label: "With file paths", description: "shows where each agent's skill is", value: true },
      ],
      { placeHolder: "The report never includes workspace names or diagram text.", ignoreFocusOut: true },
    );
    if (!picked) return undefined;
    includePaths = picked.value;
  }

  // Running commands is agent setup, which Restricted Mode turns off.
  const setup = trust.isTrusted() ? describeSetup(await collectSetup(), deps.extensionVersion, includePaths) : ["not checked: the workspace is in Restricted Mode"];
  const counts = deps.counts.snapshot();
  const report = [
    "# Diagramist diagnostic report",
    "",
    "## Versions",
    `- Diagramist extension: ${deps.extensionVersion}`,
    `- Mermaid.js: ${RENDERER_VERSIONS.mermaid}`,
    `- Pele: ${RENDERER_VERSIONS.pele}`,
    `- VS Code: ${vscode.version}`,
    "",
    "## Environment",
    `- OS: ${platform()} ${release()} (${arch()})`,
    `- Remote: ${vscode.env.remoteName ?? "none"}`,
    `- UI: ${vscode.env.uiKind === vscode.UIKind.Web ? "web" : "desktop"}`,
    "",
    "## Settings",
    `- diagramist.preview.defaultRenderer: ${settings.defaultRenderer()}`,
    `- diagramist.diagnostics.enabled: ${settings.diagnosticsEnabled()}`,
    "",
    "## Agent setup",
    ...setup.map((line) => `- ${line}`),
    "",
    "## This window",
    ...Object.entries(counts).map(([name, value]) => `- ${name}: ${value}`),
    "",
  ].join("\n");
  await vscode.env.clipboard.writeText(report);
  if (args.includePaths === undefined) void vscode.window.showInformationMessage("Diagramist: the diagnostic report is on the clipboard.");
  return report;
}
