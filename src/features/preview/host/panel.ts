// The preview panel (design item 100). One panel follows the active editor unless locked, redraws
// 150 ms after typing stops, scrolls to the diagram at the cursor, opens links only after the user
// confirms, and comes back after a window reload. It never takes focus.
import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import * as vscode from "vscode";
import { fileKind, findBlocks } from "../../../core/blocks/find-blocks.js";
import type { Block } from "../../../core/blocks/find-blocks.js";
import type { ExportFormat, ExportTheme, HostToWebview, PreviewState, Renderer, ThemeKind, WebviewToHost } from "../../../platform/messages.js";
import type { ExtensionLog } from "../../../platform/vscode/log.js";
import { settings } from "../../../platform/vscode/settings.js";
import { previewHtml } from "./html.js";

export const VIEW_TYPE = "diagramist.preview";
const TYPING_PAUSE_MS = 150;
const EXPORT_TIMEOUT_MS = 30_000;

export type ExportOutcome = { base64: string } | { error: string };
const LINK_SCHEMES = new Set(["http", "https", "mailto"]);

const isDiagramDocument = (document: vscode.TextDocument) => fileKind(document.uri.path) !== null;

function themeKind(): ThemeKind {
  switch (vscode.window.activeColorTheme.kind) {
    case vscode.ColorThemeKind.Dark:
      return "dark";
    case vscode.ColorThemeKind.HighContrast:
      return "high-contrast";
    case vscode.ColorThemeKind.HighContrastLight:
      return "high-contrast-light";
    default:
      return "light";
  }
}

export class PreviewPanel implements vscode.Disposable {
  private static current: PreviewPanel | undefined;

  /** The open preview, if any. */
  static get active(): PreviewPanel | undefined {
    return PreviewPanel.current;
  }

  /** Shows the preview beside the editor for `document`, creating it if needed. */
  static show(extensionUri: vscode.Uri, log: ExtensionLog, document: vscode.TextDocument): PreviewPanel {
    if (PreviewPanel.current) {
      PreviewPanel.current.setDocument(document);
      PreviewPanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
      return PreviewPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(VIEW_TYPE, "Diagram preview", { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, PreviewPanel.options(extensionUri));
    return (PreviewPanel.current = new PreviewPanel(panel, extensionUri, log, document, 1));
  }

  /** Brings back a preview after a window reload, from the state the webview saved. */
  static async restore(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, log: ExtensionLog, state: PreviewState | undefined): Promise<void> {
    let document: vscode.TextDocument | undefined;
    if (state?.v === 1 && state.uri) {
      try {
        document = await vscode.workspace.openTextDocument(vscode.Uri.parse(state.uri));
      } catch {
        document = undefined;
      }
    }
    if (!document) {
      panel.dispose();
      return;
    }
    panel.webview.options = PreviewPanel.options(extensionUri);
    PreviewPanel.current?.dispose();
    PreviewPanel.current = new PreviewPanel(panel, extensionUri, log, document, state?.block ?? 1);
  }

  private static options(extensionUri: vscode.Uri): vscode.WebviewPanelOptions & vscode.WebviewOptions {
    return { enableScripts: true, enableCommandUris: false, localResourceRoots: [vscode.Uri.joinPath(extensionUri, "dist")] };
  }

  private renderer: Renderer = settings.defaultRenderer();
  private locked = false;
  private ready = false;
  private timer: NodeJS.Timeout | undefined;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly readyWaiters: Array<() => void> = [];
  private readonly exports = new Map<string, (outcome: ExportOutcome) => void>();

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private readonly log: ExtensionLog,
    private document: vscode.TextDocument,
    private block: number,
  ) {
    const dist = vscode.Uri.joinPath(extensionUri, "dist");
    panel.webview.html = previewHtml({
      cspSource: panel.webview.cspSource,
      scriptUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(dist, "webview.js")).toString(),
      styleUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(dist, "webview.css")).toString(),
    });
    this.title();
    this.disposables.push(
      panel.onDidDispose(() => this.dispose()),
      panel.webview.onDidReceiveMessage((message: WebviewToHost) => this.receive(message)),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && !this.locked && isDiagramDocument(editor.document)) this.setDocument(editor.document);
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document !== this.document) return;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.render(), TYPING_PAUSE_MS);
      }),
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document === this.document) this.render();
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        if (event.textEditor.document === this.document) this.scrollTo(event.selections[0]?.active.line ?? 0);
      }),
      vscode.window.onDidChangeActiveColorTheme(() => this.render()),
    );
  }

  get documentUri(): string {
    return this.document.uri.toString();
  }

  get isLocked(): boolean {
    return this.locked;
  }

  get currentRenderer(): Renderer {
    return this.renderer;
  }

  /** Resolves once the webview has loaded and can take messages. */
  whenReady(): Promise<void> {
    return this.ready ? Promise.resolve() : new Promise((resolve) => this.readyWaiters.push(resolve));
  }

  /** Asks the webview to export one diagram of the shown document (design item 115). */
  requestExport(options: { blockIndex: number; renderer: Renderer; format: ExportFormat; theme: ExportTheme; scale: number }): Promise<ExportOutcome> {
    const requestId = randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.exports.delete(requestId);
        resolve({ error: "The preview didn't answer within 30 seconds." });
      }, EXPORT_TIMEOUT_MS);
      this.exports.set(requestId, (outcome) => {
        clearTimeout(timer);
        resolve(outcome);
      });
      this.post({ type: "export-request", requestId, ...options });
    });
  }

  toggleLock(): void {
    this.locked = !this.locked;
    this.render();
  }

  dispose(): void {
    clearTimeout(this.timer);
    if (PreviewPanel.current === this) PreviewPanel.current = undefined;
    for (const disposable of this.disposables.splice(0)) disposable.dispose();
    this.panel.dispose();
  }

  setDocument(document: vscode.TextDocument): void {
    if (document === this.document) return;
    this.document = document;
    this.block = 1;
    this.title();
    this.render();
  }

  private title(): void {
    this.panel.title = `Preview ${basename(this.document.uri.path)}`;
  }

  private blocks(): Block[] {
    const kind = fileKind(this.document.uri.path);
    return kind ? findBlocks(this.document.getText(), kind) : [];
  }

  private post(message: HostToWebview): void {
    if (this.ready) void this.panel.webview.postMessage(message);
  }

  private render(): void {
    clearTimeout(this.timer);
    this.post({
      type: "render",
      documentUri: this.documentUri,
      fileName: basename(this.document.uri.path),
      blocks: this.blocks().map((block) => ({ index: block.index, firstLine: block.firstLine, text: block.text })),
      renderer: this.renderer,
      themeKind: themeKind(),
      unsaved: this.document.isDirty,
      locked: this.locked,
    });
  }

  /** Marks the diagram at a 0-based editor line, or the nearest one above it. */
  private scrollTo(line: number): void {
    const fileLine = line + 1;
    const blocks = this.blocks();
    const block = [...blocks].reverse().find((b) => b.firstLine - 1 <= fileLine) ?? blocks[0];
    if (!block) return;
    this.block = block.index;
    this.post({ type: "scroll-to-block", index: block.index });
  }

  private async receive(message: WebviewToHost): Promise<void> {
    switch (message.type) {
      case "ready":
        this.ready = true;
        this.render();
        this.post({ type: "scroll-to-block", index: this.block });
        for (const resolve of this.readyWaiters.splice(0)) resolve();
        return;
      case "export-bytes":
        this.exports.get(message.requestId)?.({ base64: message.base64 });
        this.exports.delete(message.requestId);
        return;
      case "export-error":
        this.exports.get(message.requestId)?.({ error: message.message });
        this.exports.delete(message.requestId);
        return;
      case "renderer-switch":
        this.renderer = message.renderer;
        this.render();
        return;
      case "lock":
        this.locked = message.locked;
        this.render();
        return;
      case "link-click":
        await this.openLink(message.href);
        return;
      case "status":
        if (message.state === "error") this.log.log("debug", `preview: diagram ${message.blockIndex} of ${message.documentUri}: ${message.errorText ?? "error"}`);
        return;
      default:
        return;
    }
  }

  private async openLink(href: string): Promise<void> {
    let uri: vscode.Uri;
    try {
      uri = vscode.Uri.parse(href, true);
    } catch {
      return;
    }
    // Obsidian-style internal links and anything else that isn't web or mail do nothing.
    if (!LINK_SCHEMES.has(uri.scheme)) return;
    const choice = await vscode.window.showWarningMessage(`Open this link from the diagram?\n${href}`, { modal: true }, "Open");
    if (choice === "Open") await vscode.env.openExternal(uri);
  }
}
