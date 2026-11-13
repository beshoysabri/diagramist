// The only core code that imports `pele`. Checks a diagram by drawing it with Pele's render().
import { PeleError, render } from "pele";
import { PELE_CHECK_OPTIONS } from "../../policy/policy.js";
import { cleanParserMessage, oneLine } from "../shared/messages.js";
import type { RawVerdict } from "../types.js";

export async function checkWithPele(text: string): Promise<RawVerdict> {
  try {
    const result = render(text, PELE_CHECK_OPTIONS);
    return { outcome: "pass", type: result.mermaidType ?? result.type ?? null };
  } catch (error) {
    if (error instanceof PeleError) {
      return {
        outcome: "fail",
        code: error.code,
        message: error.code === "syntax" ? cleanParserMessage(error.message) : oneLine(error.message.split("\n")[0] ?? error.message),
        position: error.line > 0 ? { line: error.line, column: Math.max(1, error.column) } : null,
        type: error.mermaidType ?? error.type ?? null,
      };
    }
    return { outcome: "tool-error", code: "internal", message: oneLine(String((error as Error | undefined)?.message ?? error)) };
  }
}
