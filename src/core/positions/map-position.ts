// Turns a renderer position, which counts from the diagram's first line, into a file position.
// Lines and columns are 1-based; columns are UTF-16 code units, as in JavaScript strings and VS Code.
import type { Block } from "../blocks/find-blocks.js";
import type { RawPosition } from "../renderers/types.js";
import type { FilePosition } from "../result/schema.js";

export function toFilePosition(block: Block, position: RawPosition): FilePosition {
  const diagramLine = Math.min(Math.max(1, position.line), Math.max(1, block.lines.length));
  const diagramColumn = Math.max(1, position.column);
  return {
    line: block.firstLine + diagramLine - 1,
    column: diagramColumn + (block.prefixWidths[diagramLine - 1] ?? 0),
    diagramLine,
    diagramColumn,
  };
}
