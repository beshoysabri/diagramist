// Finds Mermaid diagrams in files and in text input. Markdown fences are found with markdown-it,
// following CommonMark's rules for nesting, indentation and unclosed fences.
import MarkdownIt from "markdown-it";
import type { Notice } from "../result/schema.js";

export type FileKind = "markdown" | "mermaid";

export interface Block {
  /** 1-based position of the diagram in its file. */
  index: number;
  /** File line of the diagram's first line (the line after an opening fence). */
  firstLine: number;
  /** File line of the diagram's last line; `firstLine - 1` for an empty diagram. */
  lastLine: number;
  /** The diagram text, as the renderers receive it. */
  text: string;
  /** The diagram's lines, without container prefixes. */
  lines: string[];
  /** For each diagram line, how many UTF-16 code units of prefix were stripped from the file line. */
  prefixWidths: number[];
}

const markdown = new MarkdownIt();

/** Removes a byte-order mark and turns CRLF and CR line endings into LF. */
export function normalizeText(text: string): string {
  return text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

export function fileKind(path: string): FileKind | null {
  const match = /\.([A-Za-z]+)$/.exec(path);
  const extension = match?.[1]?.toLowerCase();
  if (extension === "md" || extension === "markdown") return "markdown";
  if (extension === "mmd" || extension === "mermaid") return "mermaid";
  return null;
}

export function findBlocks(text: string, kind: FileKind): Block[] {
  const source = normalizeText(text);
  if (kind === "mermaid") {
    const lines = withoutFinalEmptyLine(source.split("\n"));
    if (lines.every((line) => line.trim() === "")) return [];
    return [makeBlock(1, 1, lines, lines.map(() => 0))];
  }
  const original = source.split("\n");
  const blocks: Block[] = [];
  for (const token of markdown.parse(source, {})) {
    if (token.type !== "fence" || !token.map) continue;
    const language = token.info.trim().split(/\s+/)[0]?.toLowerCase();
    if (language !== "mermaid") continue;
    const openingLine = token.map[0];
    const content = token.content.endsWith("\n") ? token.content.slice(0, -1) : token.content;
    const lines = content === "" ? [] : content.split("\n");
    const prefixWidths = lines.map((line, i) => prefixWidth(original[openingLine + 1 + i] ?? "", line));
    blocks.push(makeBlock(blocks.length + 1, openingLine + 2, lines, prefixWidths));
  }
  return blocks;
}

/**
 * Text input holds exactly one diagram. Fence lines pasted around it are removed, and a
 * `fences-stripped` notice says so. Positions then count from the diagram's first line.
 */
export function blockFromText(text: string): { block: Block; notices: Notice[] } {
  let lines = withoutFinalEmptyLine(normalizeText(text).split("\n"));
  const notices: Notice[] = [];
  const first = lines.findIndex((line) => line.trim() !== "");
  const last = findLastIndex(lines, (line) => line.trim() !== "");
  const opening = first >= 0 ? /^\s*(`{3,}|~{3,})\s*mermaid\b/i.exec(lines[first] ?? "") : null;
  if (opening && last > first) {
    const fence = opening[1] ?? "```";
    const closing = (lines[last] ?? "").trim();
    if (closing.startsWith(fence[0]!.repeat(3)) && /^(`{3,}|~{3,})$/.test(closing)) {
      lines = lines.slice(first + 1, last);
      notices.push({
        code: "fences-stripped",
        message: "The text started and ended with fence lines; they were removed, and positions count from the diagram's first line.",
      });
    }
  }
  return { block: makeBlock(1, 1, lines, lines.map(() => 0)), notices };
}

function makeBlock(index: number, firstLine: number, lines: string[], prefixWidths: number[]): Block {
  return { index, firstLine, lastLine: firstLine + lines.length - 1, text: lines.join("\n"), lines, prefixWidths };
}

/**
 * Width of the container prefix (list indentation, `>` markers, fence indentation) that markdown-it
 * removed from a file line. When tabs inside a container were expanded, the content is not a suffix of
 * the file line; the count of leading whitespace is used instead.
 */
function prefixWidth(fileLine: string, contentLine: string): number {
  if (fileLine.endsWith(contentLine)) return fileLine.length - contentLine.length;
  return /^[ \t]*/.exec(fileLine)?.[0].length ?? 0;
}

function withoutFinalEmptyLine(lines: string[]): string[] {
  return lines.length > 0 && lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines;
}

function findLastIndex<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) if (predicate(items[i]!)) return i;
  return -1;
}
