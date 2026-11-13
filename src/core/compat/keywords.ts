// Known diagram keywords: every type on Pele's compatibility page (Mermaid 12.1.0 syntax) plus
// known external types. Used for "did you mean" hints and for classifying "no diagram type" errors.

export interface DiagramKeyword {
  keyword: string;
  /** External Mermaid plugins, which neither Mermaid.js's core nor Pele supports. */
  external: boolean;
}

const BUILT_IN = [
  "graph", "flowchart", "swimlane-beta", "sequenceDiagram", "classDiagram", "stateDiagram", "stateDiagram-v2",
  "erDiagram", "gantt", "gitGraph", "pie", "mindmap", "kanban", "timeline", "journey", "quadrantChart",
  "xychart", "xychart-beta", "requirementDiagram", "sankey", "sankey-beta", "architecture-beta",
  "C4Context", "C4Container", "C4Component", "C4Dynamic", "C4Deployment", "block", "block-beta",
  "agentflow-beta", "railroad-beta", "railroad-ebnf-beta", "railroad-abnf-beta", "railroad-peg-beta",
  "treeView-beta", "cynefin-beta", "wardley-beta", "eventmodeling", "usecase-beta", "venn-beta",
  "ishikawa", "ishikawa-beta", "packet", "packet-beta", "radar-beta", "treemap", "treemap-beta", "info",
] as const;

const EXTERNAL = ["zenuml"] as const;

export const KEYWORDS: readonly DiagramKeyword[] = [
  ...BUILT_IN.map((keyword) => ({ keyword, external: false })),
  ...EXTERNAL.map((keyword) => ({ keyword, external: true })),
];

export function findKeyword(word: string): DiagramKeyword | undefined {
  return KEYWORDS.find((k) => k.keyword === word) ?? KEYWORDS.find((k) => k.keyword.toLowerCase() === word.toLowerCase());
}

export function isBetaKeyword(word: string): boolean {
  return word.endsWith("-beta");
}

/**
 * The first word of the diagram's type line, skipping blank lines, `%%` comments and directives,
 * and a leading `---` frontmatter block.
 */
export function firstKeyword(text: string): string | null {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length && (lines[i] ?? "").trim() === "") i++;
  if ((lines[i] ?? "").trim() === "---") {
    i++;
    while (i < lines.length && (lines[i] ?? "").trim() !== "---") i++;
    i++;
  }
  for (; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (line === "" || line.startsWith("%%")) continue;
    return line.split(/\s+/)[0] ?? null;
  }
  return null;
}

/** The closest known built-in keyword within an edit distance of 2, or null. */
export function suggestKeyword(word: string): string | null {
  const target = word.toLowerCase();
  let best: { keyword: string; distance: number } | null = null;
  for (const { keyword, external } of KEYWORDS) {
    if (external) continue;
    const distance = editDistance(target, keyword.toLowerCase());
    if (distance <= 2 && (best === null || distance < best.distance)) best = { keyword, distance };
  }
  return best?.keyword ?? null;
}

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0]!;
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j]!;
      previous[j] = Math.min(above + 1, previous[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length]!;
}
