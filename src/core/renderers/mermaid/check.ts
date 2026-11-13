// The only core code that imports `mermaid`. Checks a diagram's syntax with mermaid.parse().
// It needs a browser-like global environment, which its host provides (jsdom in Node).
import mermaid from "mermaid";
import { LIMITS, MERMAID_CHECK_CONFIG } from "../../policy/policy.js";
import { cleanLangiumParserMessage, cleanLexerMessage, cleanParserMessage, oneLine } from "../shared/messages.js";
import type { RawPosition, RawVerdict } from "../types.js";

let initialized = false;

export async function checkWithMermaid(text: string): Promise<RawVerdict> {
  if (text.length > LIMITS.diagramChars) {
    return {
      outcome: "fail",
      code: "limit",
      message: `Diagram source is longer than the limit of ${LIMITS.diagramChars} characters.`,
      position: null,
    };
  }
  if (!initialized) {
    mermaid.initialize({ ...MERMAID_CHECK_CONFIG });
    initialized = true;
  }
  try {
    const result = await mermaid.parse(text);
    return { outcome: "pass", type: result ? result.diagramType : null };
  } catch (error) {
    return mapMermaidError(error, text);
  }
}

interface JisonError {
  hash?: { loc?: { last_line?: number; last_column?: number } };
}
interface LangiumError {
  result?: {
    lexerErrors?: Array<{ line?: number; column?: number; message?: string }>;
    parserErrors?: Array<{ message?: string; token?: { startLine?: number; startColumn?: number } }>;
  };
}

/** Maps the error shapes Mermaid.js throws; see Technical Plan section 4. */
export function mapMermaidError(error: unknown, text: string): RawVerdict {
  const lines = text.split("\n");
  const message = String((error as { message?: unknown } | undefined)?.message ?? error);
  const loc = (error as JisonError | undefined)?.hash?.loc;
  if (loc && Number.isFinite(loc.last_line) && Number.isFinite(loc.last_column)) {
    // Jison columns count from 0 (checked 2026-11-11: Mermaid.js 3:3 where Pele reports 3:4).
    return { outcome: "fail", code: "parse", message: cleanParserMessage(message), position: clamp({ line: loc.last_line!, column: loc.last_column! + 1 }, lines) };
  }
  const result = (error as LangiumError | undefined)?.result;
  if (result && (result.lexerErrors || result.parserErrors)) {
    const candidates = [
      ...(result.lexerErrors ?? []).map((e) => ({ line: e.line, column: e.column, message: cleanLexerMessage(e.message ?? "") })),
      ...(result.parserErrors ?? []).map((e) => ({ line: e.token?.startLine, column: e.token?.startColumn, message: cleanLangiumParserMessage(e.message ?? "") })),
    ];
    const positioned = candidates
      .filter((c) => Number.isFinite(c.line) && Number.isFinite(c.column))
      .sort((a, b) => a.line! - b.line! || a.column! - b.column!);
    const chosen = positioned[0] ?? candidates[0];
    return {
      outcome: "fail",
      code: "parse",
      message: oneLine(chosen?.message || "Parsing failed"),
      position: chosen && Number.isFinite(chosen.line) && Number.isFinite(chosen.column) ? clamp({ line: chosen.line!, column: chosen.column! }, lines) : null,
    };
  }
  if ((error as { name?: string } | undefined)?.name === "UnknownDiagramError" || /No diagram type detected/i.test(message)) {
    // Mermaid.js echoes the whole diagram in this message, so Diagramist writes its own.
    return { outcome: "fail", code: "unknown-type", message: "No diagram type detected.", position: null };
  }
  return { outcome: "fail", code: "other", message: oneLine(message.split("\n")[0] ?? message), position: null };
}

/** End-of-diagram errors point past the last line; move them to just after the last character. */
function clamp(position: RawPosition, lines: string[]): RawPosition {
  if (position.line > lines.length) {
    const lastLine = Math.max(1, lines.length);
    return { line: lastLine, column: (lines[lastLine - 1]?.length ?? 0) + 1 };
  }
  return { line: Math.max(1, position.line), column: Math.max(1, position.column) };
}
