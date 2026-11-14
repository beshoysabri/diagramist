// The theme map (design item 97): how Pele's CSS variables follow VS Code's theme in the preview, and
// the fixed palettes exports use. The build turns it into dist/webview.css.

export const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
export const MONO_STACK = "Consolas, Menlo, monospace";

export interface ThemeEntry {
  variable: string;
  /** The value in the preview, usually one of VS Code's theme variables; null keeps Pele's default. */
  preview: string | null;
  /** In high-contrast themes, if different. */
  highContrast?: string;
  /** Fixed values for exports; null keeps Pele's default. */
  light: string | null;
  dark: string | null;
}

export const THEME_MAP: readonly ThemeEntry[] = [
  { variable: "--pele-bg", preview: "var(--vscode-editor-background)", light: "#ffffff", dark: "#1e1e1e" },
  { variable: "--pele-fg", preview: "var(--vscode-editor-foreground)", light: "#1f1f1f", dark: "#e6e6e6" },
  { variable: "--pele-fg-on-light", preview: "#1f1f1f", light: "#1f1f1f", dark: "#1f1f1f" },
  { variable: "--pele-fg-on-dark", preview: "#ffffff", light: "#ffffff", dark: "#ffffff" },
  { variable: "--pele-muted", preview: "var(--vscode-descriptionForeground)", light: "#6e6e6e", dark: "#a0a0a0" },
  { variable: "--pele-line", preview: "var(--vscode-editor-foreground)", highContrast: "var(--vscode-contrastBorder)", light: "#1f1f1f", dark: "#d4d4d4" },
  { variable: "--pele-surface", preview: "var(--vscode-editorWidget-background)", light: "#f3f3f3", dark: "#252526" },
  { variable: "--pele-surface-alt", preview: "var(--vscode-sideBar-background)", light: "#e6e6e6", dark: "#2d2d30" },
  { variable: "--pele-border", preview: "var(--vscode-editorWidget-border)", highContrast: "var(--vscode-contrastBorder)", light: "#8a8a8a", dark: "#6b6b6b" },
  { variable: "--pele-accent", preview: "var(--vscode-focusBorder)", light: "#5b7bd5", dark: "#6b9eff" },
  { variable: "--pele-critical", preview: "var(--vscode-errorForeground)", light: "#e45756", dark: "#f48771" },
  { variable: "--pele-error", preview: "var(--vscode-errorForeground)", light: "#e45756", dark: "#f48771" },
  { variable: "--pele-font", preview: FONT_STACK, light: FONT_STACK, dark: FONT_STACK },
  { variable: "--pele-font-mono", preview: "var(--vscode-editor-font-family)", light: MONO_STACK, dark: MONO_STACK },
  { variable: "--pele-title-weight", preview: "bold", light: "bold", dark: "bold" },
  { variable: "--pele-heading-weight", preview: "bold", light: "bold", dark: "bold" },
  { variable: "--pele-bold-weight", preview: "bold", light: "bold", dark: "bold" },
  { variable: "--pele-radius", preview: "4px", light: "4px", dark: "4px" },
  { variable: "--pele-series-1", preview: "var(--vscode-charts-blue)", light: null, dark: null },
  { variable: "--pele-series-2", preview: "var(--vscode-charts-orange)", light: null, dark: null },
  { variable: "--pele-series-3", preview: "var(--vscode-charts-green)", light: null, dark: null },
  { variable: "--pele-series-4", preview: "var(--vscode-charts-red)", light: null, dark: null },
  { variable: "--pele-series-5", preview: null, light: null, dark: null },
  { variable: "--pele-series-6", preview: "var(--vscode-charts-yellow)", light: null, dark: null },
  { variable: "--pele-series-7", preview: "var(--vscode-charts-purple)", light: null, dark: null },
  { variable: "--pele-series-8", preview: null, light: null, dark: null },
  // Pele's zoom controls: positions and cursor, left at Pele's defaults everywhere.
  { variable: "--pele-zoom-top", preview: null, light: null, dark: null },
  { variable: "--pele-zoom-right", preview: null, light: null, dark: null },
  { variable: "--pele-zoom-bottom", preview: null, light: null, dark: null },
  { variable: "--pele-zoom-left", preview: null, light: null, dark: null },
  { variable: "--pele-zoom-cursor", preview: null, light: null, dark: null },
];

/** The preview's variables, for dist/webview.css: VS Code's theme, with high-contrast overrides. */
export function previewCss(selector = ".diagram"): string {
  const declarations = (pick: (entry: ThemeEntry) => string | null | undefined) =>
    THEME_MAP.flatMap((entry) => {
      const value = pick(entry);
      return value ? [`  ${entry.variable}: ${value};`] : [];
    }).join("\n");
  return [
    `${selector} {\n${declarations((entry) => entry.preview)}\n}`,
    `body.vscode-high-contrast ${selector}, body.vscode-high-contrast-light ${selector} {\n${declarations((entry) => entry.highContrast)}\n}`,
  ].join("\n\n");
}

/** Fixed values for an export, as an inline style string. */
export function exportStyle(theme: "light" | "dark"): string {
  return THEME_MAP.flatMap((entry) => (entry[theme] ? [`${entry.variable}: ${entry[theme]}`] : [])).join("; ");
}
