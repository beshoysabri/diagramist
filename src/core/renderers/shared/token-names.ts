// Readable names for grammar tokens that appear in Mermaid.js and Pele parse errors.
const NAMES: Readonly<Record<string, string>> = {
  SQS: '"["', SQE: '"]"', PS: '"("', PE: '")"',
  DIAMOND_START: '"{"', DIAMOND_STOP: '"}"',
  DOUBLECIRCLESTART: '"((("', DOUBLECIRCLEEND: '")))"',
  STADIUMSTART: '"(["', STADIUMEND: '"])"',
  SUBROUTINESTART: '"[["', SUBROUTINEEND: '"]]"',
  CYLINDERSTART: '"[("', CYLINDEREND: '")]"',
  TRAPSTART: '"[/"', TRAPEND: '"/]"', INVTRAPSTART: '"[\\"', INVTRAPEND: '"\\]"',
  TAGSTART: '"<"', TAGEND: '">"', PIPE: '"|"', COLON: '":"', SEMI: '";"', COMMA: '","',
  NEWLINE: "end of line", NL: "end of line", EOF: "end of diagram", $end: "end of diagram",
  // Jison prints a token's number when it has no name; 1 is always $end.
  "1": "end of diagram",
  SPACE: "a space", NUM: "a number", NUMBER: "a number", ALPHA: "a letter",
  TEXT: "text", UNICODE_TEXT: "text", STR: "a quoted string", MD_STR: "a Markdown string",
  LINK: "a link", START_LINK: "a link", ARROW_POINT: "an arrow", ARROW_CROSS: "an arrow", ARROW_CIRCLE: "an arrow",
};

export function tokenName(raw: string): string {
  const known = NAMES[raw];
  if (known) return known;
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(raw)) return `'${raw}'`;
  return `"${raw}"`;
}
