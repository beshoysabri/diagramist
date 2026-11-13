// Turns renderer error messages into one readable line without diagram context.
import { LIMITS } from "../../policy/policy.js";
import { tokenName } from "./token-names.js";

export function oneLine(text: string, max: number = LIMITS.messageChars): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * Jison-style messages read "Parse error on line N:\n<context>\n----^\nExpecting 'A', 'B', got 'C'".
 * The useful part is the "Expecting" line; token names are translated and the list is cut to five.
 */
export function cleanParserMessage(message: string): string {
  const lines = message.split("\n");
  const expecting = lines.find((line) => line.startsWith("Expecting "));
  if (!expecting) return oneLine(lines[0] ?? message);
  const match = /^Expecting (.+?), got '([^']*)'\s*$/.exec(expecting);
  if (!match) return oneLine(expecting);
  const expected = [...new Set([...(match[1] ?? "").matchAll(/'([^']*)'/g)].map((m) => tokenName(m[1] ?? "")))];
  const shown = expected.slice(0, 5).join(", ") + (expected.length > 5 ? ", …" : "");
  return oneLine(`Expecting ${shown}, got ${tokenName(match[2] ?? "")}`);
}

/** Langium lexer messages read "unexpected character: ->x<- at offset: 11, skipped 1 characters.". */
export function cleanLexerMessage(message: string): string {
  const match = /unexpected character: ->([\s\S]*?)<-/.exec(message);
  return match ? oneLine(`Unexpected character "${match[1]}"`) : oneLine(message);
}

/** Langium parser messages read "Expecting token of type 'X' but found `y`.". */
export function cleanLangiumParserMessage(message: string): string {
  const match = /Expecting token of type '([^']+)' but found `([\s\S]*?)`/.exec(message);
  if (!match) return oneLine(message);
  const found = match[2] === "\n" ? "end of line" : match[2] === "" ? "end of diagram" : `"${match[2]}"`;
  return oneLine(`Expecting ${tokenName(match[1] ?? "")}, got ${found}`);
}
