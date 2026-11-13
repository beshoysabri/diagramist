// The text form of a result, shared by the CLI and the MCP tool. Grammar: Technical Plan section 4.
import { LIMITS, RENDERER_NAMES, RENDERERS } from "../policy/policy.js";
import type { CheckResult, Problem, RendererId } from "./schema.js";

export interface FormatOptions {
  /** How to name the file in output; defaults to `result.file`, or "<text>" for text input. */
  displayPath?: string;
  /** Also print a line for each passing diagram. */
  verbose?: boolean;
}

export function formatText(result: CheckResult, options: FormatOptions = {}): string {
  const name = options.displayPath ?? result.file ?? "<text>";
  if (result.status === "no-diagrams") return `${name}: no Mermaid diagrams found`;
  if (result.status !== "checked") return `${name}: cannot check (${result.status}): ${result.message ?? ""}`.trimEnd();

  const { summary, renderers } = result;
  const header =
    `${name}: ${plural(summary.blocks, "diagram")}, ${plural(summary.errors, "error")}, ${plural(summary.warnings, "warning")}` +
    ` [Mermaid.js ${renderers.mermaid} parse, Pele ${renderers.pele} render]`;

  const errors: string[] = [];
  const warnings: string[] = [];
  const notices: string[] = [];
  const passes: string[] = [];
  for (const block of result.blocks) {
    let hasProblem = false;
    for (const renderer of RENDERERS) {
      for (const problem of block.results[renderer].errors) {
        hasProblem = true;
        (problem.severity === "error" ? errors : warnings).push(formatProblem(name, renderer, problem));
      }
    }
    for (const notice of block.notices) notices.push(`${name}:${block.firstLine}: notice [${notice.code}] ${notice.message}`);
    if (!hasProblem && options.verbose) {
      passes.push(`${name}:${block.firstLine}: ok (${block.type ?? "unknown type"}): Mermaid.js parses, Pele renders`);
    }
  }

  // Errors first, so a capped result still shows what must be fixed.
  const entries = [...errors, ...warnings, ...notices, ...passes];
  const capLineRoom = 90;
  const out = [header];
  let length = header.length;
  let shown = 0;
  for (const entry of entries) {
    if (length + 1 + entry.length > LIMITS.textChars - capLineRoom) break;
    out.push(entry);
    length += 1 + entry.length;
    shown++;
  }
  const hidden = entries.length - shown;
  if (hidden > 0) out.push(`… ${hidden} more problem(s) or notice(s) not shown (output capped at 4,000 characters)`);
  return out.join("\n");
}

function formatProblem(name: string, renderer: RendererId, problem: Problem): string {
  const where = problem.position ? `${name}:${problem.position.line}:${problem.position.column}` : `${name}:${problem.anchorLine}`;
  const lines = [
    `${where}: ${problem.severity} [${RENDERER_NAMES[renderer]} ${problem.code}] ${problem.message}` +
      (problem.position ? "" : " (no position; the diagram starts here)"),
  ];
  if (problem.snippet) {
    lines.push("  diagram text (untrusted):");
    for (const line of problem.snippet.split("\n")) lines.push(`  ${line}`);
  }
  if (problem.hint) lines.push(`  hint: ${problem.hint}`);
  return lines.join("\n");
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
