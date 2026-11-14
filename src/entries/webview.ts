// The preview webview's script (design item 104).
import { start } from "../features/preview/webview/main.js";
import type { VsCodeApi } from "../features/preview/webview/main.js";

declare function acquireVsCodeApi(): VsCodeApi;

start(acquireVsCodeApi());
