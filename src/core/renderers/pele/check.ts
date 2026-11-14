// The only core code that imports `pele`. Checks a diagram by drawing it with Pele's render().
import { PeleError, render } from "pele";
import type { TextMeasurer } from "pele";
import { PELE_CHECK_OPTIONS } from "../../policy/policy.js";
import { cleanParserMessage, oneLine } from "../shared/messages.js";
import type { RawVerdict } from "../types.js";

/**
 * The measurer the check worker passes (P2): width = characters × font size × 0.6. It keeps Pele away
 * from the browser stand-in's canvas, so verdicts never depend on the stand-in.
 */
export const CHECK_MEASURER: TextMeasurer = { width: (text, size) => text.length * size * 0.6 };

/**
 * `measurer` replaces Pele's own text measuring. A worker that also hosts a browser stand-in passes one,
 * so that Pele doesn't try the stand-in's canvas.
 */
export async function checkWithPele(text: string, measurer?: TextMeasurer): Promise<RawVerdict> {
  try {
    const result = render(text, measurer ? { ...PELE_CHECK_OPTIONS, measurer } : PELE_CHECK_OPTIONS);
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
