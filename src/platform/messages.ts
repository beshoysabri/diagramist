// Messages between the extension host and the preview webview (design item 96). Types only. Both
// sides come from one build, so the messages carry no version field.
export type Renderer = "mermaid" | "pele";
export type ThemeKind = "light" | "dark" | "high-contrast" | "high-contrast-light";
export type ExportFormat = "svg" | "png";
export type ExportTheme = "light" | "dark" | "current";

export interface PreviewBlock {
  index: number;
  firstLine: number;
  text: string;
}

export type HostToWebview =
  | {
      type: "render";
      documentUri: string;
      fileName: string;
      blocks: PreviewBlock[];
      renderer: Renderer;
      themeKind: ThemeKind;
      unsaved: boolean;
      locked: boolean;
    }
  | { type: "scroll-to-block"; index: number }
  | { type: "export-request"; requestId: string; blockIndex: number; renderer: Renderer; format: ExportFormat; theme: ExportTheme; scale: number };

export type WebviewToHost =
  | { type: "ready" }
  | { type: "status"; documentUri: string; blockIndex: number; state: "ok" | "error"; errorText?: string }
  | { type: "link-click"; href: string }
  | { type: "renderer-switch"; renderer: Renderer }
  | { type: "lock"; locked: boolean }
  | { type: "export-bytes"; requestId: string; format: ExportFormat; base64: string }
  | { type: "export-error"; requestId: string; message: string };

/** What the preview remembers across a window reload (the serializer's state). */
export interface PreviewState {
  uri: string;
  block: number;
  v: 1;
}
