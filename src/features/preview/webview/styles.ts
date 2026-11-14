// The preview's own styles. The build adds the theme map's variables and writes dist/webview.css.
export const BASE_CSS = `
body { margin: 0; padding: 0; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
header { position: sticky; top: 0; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; padding: 6px 12px; background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-panel-border, transparent); }
header .switch { display: inline-flex; border: 1px solid var(--vscode-button-border, var(--vscode-contrastBorder, transparent)); border-radius: 4px; overflow: hidden; }
header button { font: inherit; color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); border: 0; padding: 2px 10px; cursor: pointer; }
header button[aria-pressed="true"] { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
header button:focus-visible, .block:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
#status { flex: 1 1 auto; color: var(--vscode-descriptionForeground); }
#status .unsaved { color: var(--vscode-editorWarning-foreground); }
main { padding: 8px 12px 24px; }
.block { margin: 0 0 18px; padding: 8px; border-radius: 4px; }
.block.current { box-shadow: inset 2px 0 0 var(--vscode-focusBorder); }
.block .label { color: var(--vscode-descriptionForeground); font-size: 0.9em; margin-bottom: 4px; }
.block .error { color: var(--vscode-errorForeground); margin-bottom: 6px; }
.block .error pre { margin: 4px 0 0; padding: 6px 8px; overflow-x: auto; white-space: pre; font-family: var(--vscode-editor-font-family, monospace); font-size: 0.92em; color: var(--vscode-editor-foreground); background: var(--vscode-textCodeBlock-background, rgba(127, 127, 127, 0.1)); border-radius: 4px; }
.block .error:empty { display: none; }
.block.stale .drawing { opacity: 0.35; }
.drawing { overflow: auto; }
.drawing svg { max-width: 100%; height: auto; }
.empty { color: var(--vscode-descriptionForeground); padding: 12px; }
`;
