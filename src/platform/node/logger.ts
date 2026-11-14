// The checker's log, on stderr: stdout belongs to results, and to MCP if it ships. The level comes
// from DIAGRAMIST_LOG (error, warn, info, debug or trace); the default is warn. Diagram text is
// untrusted, so callers log it only at trace level.
export type LogLevel = "error" | "warn" | "info" | "debug" | "trace";

const ORDER: readonly LogLevel[] = ["error", "warn", "info", "debug", "trace"];

export interface Logger {
  enabled(level: LogLevel): boolean;
  log(level: LogLevel, message: string): void;
}

export function parseLogLevel(value: string | undefined): LogLevel {
  const level = value?.trim().toLowerCase();
  return ORDER.includes(level as LogLevel) ? (level as LogLevel) : "warn";
}

export function createLogger(level: LogLevel = parseLogLevel(process.env.DIAGRAMIST_LOG), write: (line: string) => void = (line) => process.stderr.write(line)): Logger {
  const limit = ORDER.indexOf(level);
  const enabled = (at: LogLevel) => ORDER.indexOf(at) <= limit;
  return {
    enabled,
    log(at, message) {
      if (enabled(at)) write(`diagramist: ${at}: ${message}\n`);
    },
  };
}
