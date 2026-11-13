// Notices from decision D4: beta and newer diagram types.
import type { Notice } from "../result/schema.js";

export function betaNotice(keyword: string): Notice {
  return {
    code: "beta-type",
    message: `"${keyword}" is a beta diagram type; sites that run older Mermaid versions may not draw it.`,
  };
}

export function newerTypeNotice(keyword: string | null): Notice {
  const name = keyword ? `"${keyword}"` : "This diagram type";
  return {
    code: "newer-type",
    message: `${name} parses in Mermaid.js but Pele doesn't support it, so it is probably newer than Mermaid 12.1; sites that run older Mermaid versions may not draw it.`,
  };
}
