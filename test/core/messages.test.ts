import { describe, expect, it } from "vitest";
import { cleanParserMessage } from "../../src/core/renderers/shared/messages.js";
import { tokenName } from "../../src/core/renderers/shared/token-names.js";

describe("tokenName", () => {
  it("names the end of the diagram however jison spells it", () => {
    for (const raw of ["EOF", "$end", "1"]) expect(tokenName(raw), raw).toBe("end of diagram");
  });
});

describe("cleanParserMessage", () => {
  it("keeps the expectation line and translates its tokens", () => {
    const raw = "Parse error on line 2:\n...A[Start --> B\n---------------^\nExpecting 'SQE', 'PE', got '1'";
    expect(cleanParserMessage(raw)).toBe('Expecting "]", ")", got end of diagram');
  });
});
