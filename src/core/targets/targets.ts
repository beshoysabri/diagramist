// Decision D3: which renderers must pass. Mermaid.js by default; a comment line can change it.
// The comment goes on the diagram's first line, or directly after the type line.
import type { Block } from "../blocks/find-blocks.js";
import { DEFAULT_TARGETS } from "../policy/policy.js";
import type { Notice, RendererId, TargetsFrom } from "../result/schema.js";

export interface TargetsResolution {
  targets: RendererId[];
  from: TargetsFrom;
  notices: Notice[];
}

const COMMENT = /^\s*%%\s*diagramist\s*:\s*targets\s*=\s*(.*?)\s*$/i;

export function resolveTargets(block: Block): TargetsResolution {
  const index = commentLineIndex(block.lines);
  if (index === null) return { targets: [...DEFAULT_TARGETS], from: { source: "default" }, notices: [] };
  const raw = COMMENT.exec(block.lines[index] ?? "")?.[1] ?? "";
  const line = block.firstLine + index;
  const targets = parseTargets(raw);
  if (targets === null) {
    return {
      targets: [...DEFAULT_TARGETS],
      from: { source: "default" },
      notices: [{
        code: "bad-targets-comment",
        message: `Unknown targets "${raw}" on line ${line}; use mermaid, pele, "mermaid,pele" or none. The default (mermaid) applies.`,
      }],
    };
  }
  return { targets, from: { source: "comment", line }, notices: [] };
}

/** "mermaid", "pele", "mermaid,pele" (either order) or "none"; null for anything else. */
export function parseTargets(raw: string): RendererId[] | null {
  const words = raw.split(",").map((word) => word.trim().toLowerCase()).filter((word) => word !== "");
  if (words.length === 1 && words[0] === "none") return [];
  if (words.length === 0) return null;
  const targets: RendererId[] = [];
  for (const word of words) {
    if (word !== "mermaid" && word !== "pele") return null;
    if (!targets.includes(word)) targets.push(word);
  }
  return targets;
}

function commentLineIndex(lines: string[]): number | null {
  let i = lines.findIndex((line) => line.trim() !== "");
  if (i < 0) return null;
  if (COMMENT.test(lines[i] ?? "")) return i;
  if ((lines[i] ?? "").trim() === "---") {
    i++;
    while (i < lines.length && (lines[i] ?? "").trim() !== "---") i++;
    i++;
  }
  for (; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (line === "" || line.startsWith("%%")) continue;
    return COMMENT.test(lines[i + 1] ?? "") ? i + 1 : null;
  }
  return null;
}
