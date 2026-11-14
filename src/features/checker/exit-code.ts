// Exit codes (Technical Plan section 3): 2 if a file had a tool or input problem, otherwise 1 if a
// diagram had an error, otherwise 0. Warnings and notices never change it.
import { RENDERERS } from "../../core/policy/policy.js";
import type { CheckResult } from "../../core/result/schema.js";

export type ExitCode = 0 | 1 | 2;

/** The exit code one file's result calls for. */
export function exitCodeFor(result: CheckResult): ExitCode {
  if (result.status !== "checked" && result.status !== "no-diagrams") return 2;
  let code: ExitCode = 0;
  for (const block of result.blocks) {
    for (const renderer of RENDERERS) {
      for (const problem of block.results[renderer].errors) {
        if (problem.class === "tool") return 2;
        if (problem.severity === "error") code = 1;
      }
    }
  }
  return code;
}
