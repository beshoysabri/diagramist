// Combines each block's targets and the two renderers' verdicts into result format v1.
import type { Block } from "../blocks/find-blocks.js";
import { findKeyword, firstKeyword, isBetaKeyword, KEYWORDS, suggestKeyword } from "../compat/keywords.js";
import { betaNotice, newerTypeNotice } from "../compat/notices.js";
import { hintFor } from "../hints/hints.js";
import { CHECK_DEPTH, LIMITS, RENDERERS } from "../policy/policy.js";
import { toFilePosition } from "../positions/map-position.js";
import type { RawVerdict } from "../renderers/types.js";
import type { TargetsResolution } from "../targets/targets.js";
import type { BlockResult, CheckResult, CheckSummary, FileStatus, Notice, ProblemClass, RendererId, RendererResult } from "./schema.js";

export interface CheckMeta {
  /** "diagramist <version>" */
  checker: string;
  renderers: Record<RendererId, string>;
}

export function buildBlockResult(
  block: Block,
  targets: TargetsResolution,
  verdicts: Record<RendererId, RawVerdict>,
  extraNotices: Notice[] = [],
): BlockResult {
  const keyword = firstKeyword(block.text);
  const notices: Notice[] = [...extraNotices, ...targets.notices];
  if (keyword && isBetaKeyword(keyword)) notices.push(betaNotice(keyword));
  const results = {} as Record<RendererId, RendererResult>;
  for (const renderer of RENDERERS) {
    const verdict = verdicts[renderer];
    if (verdict.outcome === "pass") {
      results[renderer] = { outcome: "pass", depth: CHECK_DEPTH[renderer], errors: [] };
      continue;
    }
    const other = verdicts[renderer === "mermaid" ? "pele" : "mermaid"];
    const { cls, suggestion, newerType } = classify(renderer, verdict, other, keyword);
    if (newerType) notices.push(newerTypeNotice(keyword));
    const severity = cls === "tool" || targets.targets.includes(renderer) ? "error" : "warning";
    const code = verdict.code ?? (verdict.outcome === "tool-error" ? "internal" : "other");
    const position = verdict.position ? toFilePosition(block, verdict.position) : null;
    results[renderer] = {
      outcome: verdict.outcome === "tool-error" ? "tool-error" : "fail",
      depth: CHECK_DEPTH[renderer],
      errors: [{
        severity,
        class: cls,
        code,
        message: verdict.message ?? "",
        position,
        anchorLine: block.firstLine,
        snippet: position ? snippetFor(block, position.diagramLine) : null,
        hint: hintFor({ renderer, cls, code, severity, keyword, suggestion, newerType, block, diagramLine: position?.diagramLine ?? null }),
        retry: cls === "invalid",
      }],
    };
  }
  return {
    index: block.index,
    firstLine: block.firstLine,
    lastLine: block.lastLine,
    type: verdicts.mermaid.type ?? verdicts.pele.type ?? null,
    targets: [...targets.targets],
    targetsFrom: targets.from,
    results,
    notices,
  };
}

export function buildCheckResult(meta: CheckMeta, file: string | null, blocks: BlockResult[]): CheckResult {
  return {
    schemaVersion: 1,
    checker: meta.checker,
    renderers: { ...meta.renderers },
    file,
    status: blocks.length === 0 ? "no-diagrams" : "checked",
    message: null,
    blocks,
    summary: summarize(blocks),
  };
}

/** A file that couldn't be checked: missing, too large, not text, the wrong type, or bad input. */
export function fileProblemResult(
  meta: CheckMeta,
  file: string | null,
  status: Exclude<FileStatus, "checked" | "no-diagrams">,
  message: string,
): CheckResult {
  return {
    schemaVersion: 1,
    checker: meta.checker,
    renderers: { ...meta.renderers },
    file,
    status,
    message,
    blocks: [],
    summary: { blocks: 0, errors: 0, warnings: 0, notices: 0 },
  };
}

function classify(
  renderer: RendererId,
  verdict: RawVerdict,
  other: RawVerdict,
  keyword: string | null,
): { cls: ProblemClass; suggestion: string | null; newerType: boolean } {
  if (verdict.outcome === "tool-error") return { cls: "tool", suggestion: null, newerType: false };
  if (verdict.code === "limit") return { cls: "too-large", suggestion: null, newerType: false };
  if (verdict.code === "unknown-type" || verdict.code === "unsupported-diagram") {
    if (keyword && findKeyword(keyword)?.external) return { cls: "unsupported", suggestion: null, newerType: false };
    if (renderer === "pele" && other.outcome === "pass") return { cls: "unsupported", suggestion: null, newerType: true };
    const exactlyKnown = keyword !== null && KEYWORDS.some((k) => k.keyword === keyword);
    return { cls: "invalid", suggestion: keyword && !exactlyKnown ? suggestKeyword(keyword) : null, newerType: false };
  }
  return { cls: "invalid", suggestion: null, newerType: false };
}

/** The line before the reported line and the reported line, labelled with file line numbers. */
function snippetFor(block: Block, diagramLine: number): string {
  const lines: string[] = [];
  for (const d of [diagramLine - 1, diagramLine]) {
    const text = block.lines[d - 1];
    if (text !== undefined) lines.push(`${block.firstLine + d - 1} | ${text}`);
  }
  const joined = lines.join("\n");
  if (joined.length <= LIMITS.snippetChars) return joined;
  const perLine = Math.floor((LIMITS.snippetChars - (lines.length - 1)) / lines.length);
  return lines.map((line) => (line.length > perLine ? `${line.slice(0, perLine - 1)}…` : line)).join("\n");
}

function summarize(blocks: BlockResult[]): CheckSummary {
  let errors = 0;
  let warnings = 0;
  let notices = 0;
  for (const block of blocks) {
    notices += block.notices.length;
    for (const renderer of RENDERERS) {
      for (const problem of block.results[renderer].errors) {
        if (problem.severity === "error") errors++;
        else warnings++;
      }
    }
  }
  return { blocks: blocks.length, errors, warnings, notices };
}
