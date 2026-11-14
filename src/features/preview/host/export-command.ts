// "Diagramist: Export Diagram…" (design item 114). It asks for the diagram, renderer, format, theme and
// scale, has the preview draw the file off-screen, suggests <file>-<diagram>.<renderer>.<svg|png>
// next to the source, and writes it. Tests pass every choice as arguments to skip the dialogs.
import { basename, extname } from "node:path";
import * as vscode from "vscode";
import { fileKind, findBlocks } from "../../../core/blocks/find-blocks.js";
import type { ExportFormat, ExportTheme, Renderer } from "../../../platform/messages.js";
import type { ExtensionLog } from "../../../platform/vscode/log.js";
import { settings } from "../../../platform/vscode/settings.js";
import { PreviewPanel } from "./panel.js";

export interface ExportArgs {
  uri?: string;
  blockIndex?: number;
  renderer?: Renderer;
  format?: ExportFormat;
  theme?: ExportTheme;
  scale?: number;
  /** A file path; skips the save dialog. */
  target?: string;
}

const pick = async <T>(items: Array<vscode.QuickPickItem & { value: T }>, placeHolder: string): Promise<T | undefined> =>
  (await vscode.window.showQuickPick(items, { placeHolder, ignoreFocusOut: true }))?.value;

export async function exportDiagram(extensionUri: vscode.Uri, log: ExtensionLog, args: ExportArgs = {}): Promise<vscode.Uri | undefined> {
  const document = args.uri ? await vscode.workspace.openTextDocument(vscode.Uri.parse(args.uri)) : vscode.window.activeTextEditor?.document;
  const kind = document ? fileKind(document.uri.path) : null;
  if (!document || !kind) {
    void vscode.window.showInformationMessage("Diagramist: open a .md, .markdown, .mmd or .mermaid file to export one of its diagrams.");
    return undefined;
  }
  const blocks = findBlocks(document.getText(), kind);
  if (blocks.length === 0) {
    void vscode.window.showInformationMessage(`Diagramist: ${basename(document.uri.path)} has no Mermaid diagrams.`);
    return undefined;
  }

  const blockIndex =
    args.blockIndex ??
    (blocks.length === 1
      ? 1
      : await pick(
          blocks.map((block) => ({ label: `Diagram ${block.index}`, description: `line ${block.firstLine}`, detail: block.text.split("\n")[0], value: block.index })),
          "Which diagram?",
        ));
  if (blockIndex === undefined) return undefined;
  const preferred = PreviewPanel.active?.currentRenderer ?? settings.defaultRenderer();
  const renderer =
    args.renderer ??
    (await pick<Renderer>(
      (
        [
          { label: "Mermaid.js", description: "as GitHub, Notion and documentation sites draw it", value: "mermaid" },
          { label: "Pele", description: "as Obsidian draws it", value: "pele" },
        ] as Array<vscode.QuickPickItem & { value: Renderer }>
      ).sort((a, b) => Number(b.value === preferred) - Number(a.value === preferred)),
      "Draw it with",
    ));
  if (!renderer) return undefined;
  const format = args.format ?? (await pick<ExportFormat>([{ label: "PNG", description: "an image for slides and documents", value: "png" }, { label: "SVG", description: "a vector drawing that scales", value: "svg" }], "Format"));
  if (!format) return undefined;
  const theme = args.theme ?? (await pick<ExportTheme>([{ label: "Light", value: "light" }, { label: "Dark", value: "dark" }, { label: "VS Code's current theme", value: "current" }], "Colours"));
  if (!theme) return undefined;
  const scale =
    format === "svg"
      ? 1
      : (args.scale ?? (await pick<number>([2, 1, 3, 4].map((value) => ({ label: `${value}×`, description: value === 2 ? "default, sharp on most screens" : undefined, value })), "PNG scale")));
  if (scale === undefined) return undefined;

  const panel = PreviewPanel.show(extensionUri, log, document);
  await panel.whenReady();
  const outcome = await panel.requestExport({ blockIndex, renderer, format, theme, scale });
  if ("error" in outcome) {
    log.log("info", `export refused: ${outcome.error}`);
    // D3: a diagram Pele can't draw isn't exported with Pele; offer Mermaid.js instead. A notice
    // without a button is not awaited: it may stay open until the user dismisses it.
    if (renderer === "pele" && !args.target) {
      const retry = "Export with Mermaid.js";
      const choice = await vscode.window.showErrorMessage(`Diagramist: ${outcome.error}`, retry);
      return choice === retry ? exportDiagram(extensionUri, log, { ...args, uri: document.uri.toString(), blockIndex, renderer: "mermaid", format, theme, scale }) : undefined;
    }
    void vscode.window.showErrorMessage(`Diagramist: ${outcome.error}`);
    return undefined;
  }

  const base = basename(document.uri.path, extname(document.uri.path));
  const suggested = vscode.Uri.joinPath(document.uri, "..", `${base}-${blockIndex}.${renderer}.${format}`);
  const target = args.target
    ? vscode.Uri.file(args.target)
    : await vscode.window.showSaveDialog({ defaultUri: suggested, saveLabel: "Export", filters: format === "svg" ? { "SVG image": ["svg"] } : { "PNG image": ["png"] } });
  if (!target) return undefined;
  await vscode.workspace.fs.writeFile(target, Buffer.from(outcome.base64, "base64"));
  if (!args.target) void vscode.window.showInformationMessage(`Diagramist: exported ${basename(target.path)}.`);
  return target;
}
