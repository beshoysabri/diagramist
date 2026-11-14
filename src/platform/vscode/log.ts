// The "Diagramist" log channel (design item 78). It follows VS Code's log level; its first line names
// the versions. It also serves as the checker's logger, so worker messages land in the same place.
import * as vscode from "vscode";
import type { Logger, LogLevel } from "../node/logger.js";

export interface ExtensionLog extends Logger {
  readonly channel: vscode.LogOutputChannel;
}

export function createLog(versions: { extension: string; mermaid: string; pele: string }): ExtensionLog {
  const channel = vscode.window.createOutputChannel("Diagramist", { log: true });
  channel.info(`Diagramist ${versions.extension} (Mermaid.js ${versions.mermaid}, Pele ${versions.pele}), VS Code ${vscode.version}`);
  const levels: Record<LogLevel, vscode.LogLevel> = {
    error: vscode.LogLevel.Error,
    warn: vscode.LogLevel.Warning,
    info: vscode.LogLevel.Info,
    debug: vscode.LogLevel.Debug,
    trace: vscode.LogLevel.Trace,
  };
  return {
    channel,
    enabled: (level) => channel.logLevel !== vscode.LogLevel.Off && channel.logLevel <= levels[level],
    log: (level, message) => channel[level](message),
  };
}
